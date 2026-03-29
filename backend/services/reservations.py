import os
import razorpay
from datetime import datetime, timedelta, timezone

from db import get_cursor, get_db
from services.notifications import insert_notification

PURCHASE_DEPOSIT_PERCENT = 0.02
OPEN_STATUSES = ("pending_initial_payment", "awaiting_seller_confirmation", "awaiting_final_payment")

def get_razorpay_client():
    key_id = os.environ.get('RAZORPAY_KEY_ID')
    key_secret = os.environ.get('RAZORPAY_KEY_SECRET')
    if not key_id or not key_secret:
        return None
    return razorpay.Client(auth=(key_id, key_secret))


def expire_reservations_if_needed(now=None):
    """
    Prevent items from being stuck in `reserved` when sellers/buyers don't finish the flow.
    """
    now = now or datetime.now(timezone.utc)
    conn = get_db()

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                r.id AS reservation_id,
                r.item_id,
                r.buyer_id,
                i.seller_id,
                i.title AS item_title,
                r.transaction_type,
                r.lease_amount,
                r.initial_amount,
                r.final_amount_due,
                i.sell_price,
                r.status
            FROM reservations r
            JOIN items i ON i.id = r.item_id
            WHERE r.status IN ('pending_initial_payment', 'awaiting_seller_confirmation', 'awaiting_final_payment')
              AND r.expires_at <= %s
            FOR UPDATE
            """,
            (now,),
        )
        expired_rows = cur.fetchall()

        if not expired_rows:
            return 0

        reservation_ids = [row["reservation_id"] for row in expired_rows]
        item_ids = list({row["item_id"] for row in expired_rows})

        cur.execute(
            """
            UPDATE reservations
            SET status = 'expired'
            WHERE id = ANY(%s)
            """,
            (reservation_ids,),
        )

        # Release item back to available only if no other pending/active reservation exists.
        cur.execute(
            """
            UPDATE items
            SET status = 'available', updated_at = NOW()
            WHERE id = ANY(%s)
              AND NOT EXISTS (
                SELECT 1
                FROM reservations r2
                WHERE r2.item_id = items.id
                  AND r2.status IN ('pending_initial_payment', 'awaiting_seller_confirmation', 'awaiting_final_payment')
              )
            """,
            (item_ids,),
        )

        # Notifications (buyer + seller)
        for row in expired_rows:
            forfeited_amount = float(row["initial_amount"] or 0)
            buyer_msg = f"Your reservation for '{row['item_title']}' expired."
            if row["status"] == "awaiting_final_payment" and forfeited_amount > 0:
                buyer_msg += f" Your initial payment of ₹{forfeited_amount:.2f} was forfeited."
            seller_msg = f"Reservation for '{row['item_title']}' expired and item is available again."

            insert_notification(
                cur,
                recipient_user_id=row["buyer_id"],
                sender_user_id=row["seller_id"],
                type="reservation_expired",
                message=buyer_msg,
                reservation_id=row["reservation_id"],
                item_id=row["item_id"],
            )
            insert_notification(
                cur,
                recipient_user_id=row["seller_id"],
                sender_user_id=row["buyer_id"],
                type="reservation_expired",
                message=seller_msg,
                reservation_id=row["reservation_id"],
                item_id=row["item_id"],
            )

    conn.commit()
    return len(expired_rows)



def list_reservations(buyer_id=None, status=None, participant_id=None):
    """List reservations with full item details."""
    expire_reservations_if_needed()
    query = """
        SELECT
            r.id,
            r.item_id,
            r.buyer_id,
            r.transaction_type,
            r.lease_days,
            r.lease_amount,
            r.initial_amount,
            r.final_amount_due,
            r.forfeited_amount,
            r.status,
            r.initial_order_id,
            r.final_order_id,
            r.expires_at,
            r.created_at,
            r.seller_release_percentage,
            r.seller_release_amount,
            r.seller_released_at,
            i.title as item_title,
            i.sell_price as item_price,
            i.allow_purchase,
            i.allow_lease,
            i.lease_price_per_day,
            i.max_lease_days,
            i.status as item_status,
            i.image_url as item_image_url,
            i.seller_id,
            c.name as category_name,
            seller.name as seller_name,
            seller.email as seller_email,
            seller.mobile_number as seller_mobile,
            seller.hostel_name as seller_hostel,
            seller.room_number as seller_room,
            buyer.name as buyer_name,
            buyer.email as buyer_email,
            buyer.mobile_number as buyer_mobile,
            buyer.hostel_name as buyer_hostel,
            buyer.room_number as buyer_room
        FROM reservations r
        JOIN items i ON r.item_id = i.id
        JOIN categories c ON i.category_id = c.id
        JOIN users seller ON i.seller_id = seller.id
        JOIN users buyer ON r.buyer_id = buyer.id
        WHERE 1=1
    """
    params = []
    if buyer_id:
        query += " AND r.buyer_id = %s"
        params.append(buyer_id)
    if participant_id:
        query += " AND (r.buyer_id = %s OR i.seller_id = %s)"
        params.extend([participant_id, participant_id])
    if status:
        query += " AND r.status = %s"
        params.append(status)
    query += " ORDER BY r.created_at DESC"

    with get_cursor() as cur:
        cur.execute(query, params)
        return cur.fetchall()

def reserve_item(item_id, buyer_id, transaction_type='purchase', lease_days=None, duration_hours=0.5):
    """
    Reserve an item for a buyer.
    Transactional: Check item -> Update item -> Create reservation.
    Default reservation time is 30 minutes.
    """
    expire_reservations_if_needed()

    if transaction_type not in ('purchase', 'lease'):
        return {'error': 'Invalid transaction type'}

    expires_at = datetime.now(timezone.utc) + timedelta(hours=duration_hours)

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT seller_id, status, sell_price, allow_purchase, allow_lease, lease_price_per_day, max_lease_days
                FROM items
                WHERE id = %s
                FOR UPDATE
                """,
                (item_id,),
            )
            item = cur.fetchone()

            if not item:
                conn.rollback()
                return {'error': 'Item not found'}
            if str(item['seller_id']) == str(buyer_id):
                conn.rollback()
                return {'error': 'You cannot reserve your own item'}
            if item['status'] != 'available':
                conn.rollback()
                return {'error': 'Item not available'}
            if transaction_type == 'purchase' and not item['allow_purchase']:
                conn.rollback()
                return {'error': 'This listing is available for lease only'}
            if transaction_type == 'lease' and not item['allow_lease']:
                conn.rollback()
                return {'error': 'This listing is available for purchase only'}

            lease_amount = None
            lease_days_value = None
            initial_amount = 0.0
            final_amount_due = 0.0
            if transaction_type == 'lease':
                if lease_days is None:
                    conn.rollback()
                    return {'error': 'lease_days is required for lease reservations'}
                try:
                    lease_days_value = int(lease_days)
                except (TypeError, ValueError):
                    conn.rollback()
                    return {'error': 'lease_days must be a valid integer'}
                if lease_days_value < 1 or lease_days_value > int(item['max_lease_days'] or 0):
                    conn.rollback()
                    return {'error': f'lease_days must be between 1 and {int(item["max_lease_days"] or 0)}'}

                per_day = round(float(item['lease_price_per_day']), 2)
                lease_amount = round(per_day * lease_days_value, 2)
                initial_amount = per_day
                if lease_amount < 30.00:
                    initial_amount = lease_amount
                elif initial_amount < 1.00:
                    initial_amount = 1.00
                final_amount_due = round(max(lease_amount - initial_amount, 0), 2)
            else:
                sell_price = round(float(item['sell_price']), 2)
                if sell_price < 30.00:
                    initial_amount = sell_price
                    final_amount_due = 0.00
                else:
                    initial_amount = round(sell_price * PURCHASE_DEPOSIT_PERCENT, 2)
                    if initial_amount < 1.00:
                        initial_amount = 1.00
                    final_amount_due = round(sell_price - initial_amount, 2)

            # Calculate initial payment amount for Razorpay (in paise)
            amount_in_inr = initial_amount
            amount_in_paise = int(amount_in_inr * 100)

            # Create Razorpay Order
            razorpay_client = get_razorpay_client()
            if not razorpay_client:
                conn.rollback()
                return {'error': 'Razorpay not configured'}
            
            try:
                order_data = {
                    'amount': amount_in_paise,
                    'currency': 'INR',
                    'receipt': f"rcpt_{str(item_id)[:8]}_{str(buyer_id)[:8]}"
                }
                razorpay_order = razorpay_client.order.create(data=order_data)
                initial_order_id = razorpay_order['id']
            except Exception as e:
                conn.rollback()
                return {'error': f'Failed to create payment order: {str(e)}'}

            cur.execute(
                """
                UPDATE items
                SET status = 'reserved', updated_at = NOW()
                WHERE id = %s
                """,
                (item_id,),
            )

            try:
                cur.execute(
                    """
                    INSERT INTO reservations (
                        item_id, buyer_id, transaction_type, lease_days, lease_amount,
                        initial_amount, final_amount_due, expires_at, status, initial_order_id, razorpay_order_id
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'pending_initial_payment', %s, %s)
                    RETURNING id
                    """,
                    (
                        item_id,
                        buyer_id,
                        transaction_type,
                        lease_days_value,
                        lease_amount,
                        initial_amount,
                        final_amount_due,
                        expires_at,
                        initial_order_id,
                        initial_order_id,
                    ),
                )
            except Exception as exc:
                conn.rollback()
                return {'error': str(exc)}

            reservation_id = cur.fetchone()['id']
            conn.commit()
            return {
                'reservation_id': reservation_id,
                'razorpay_order_id': initial_order_id,
                'amount': amount_in_paise,
                'currency': 'INR',
                'expires_at': expires_at,
                'transaction_type': transaction_type,
                'lease_days': lease_days_value,
                'lease_amount': lease_amount,
                'initial_amount': initial_amount,
                'final_amount_due': final_amount_due,
            }

    except Exception as exc:
        conn.rollback()
        raise exc

def confirm_reservation(reservation_id, seller_id):
    """
    Complete a purchase.
    Transactional: Update item -> Update reservation.
    """
    expire_reservations_if_needed()

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    r.item_id,
                    r.status,
                    i.seller_id,
                    r.transaction_type,
                    r.buyer_id,
                    i.title,
                    r.lease_amount,
                    i.sell_price,
                    r.final_amount_due
                FROM reservations r
                JOIN items i ON r.item_id = i.id
                WHERE r.id = %s FOR UPDATE
                """,
                (reservation_id,),
            )
            reservation = cur.fetchone()

            if not reservation:
                conn.rollback()
                return {'error': 'Reservation not found'}
            if str(reservation['seller_id']) != str(seller_id):
                conn.rollback()
                return {'error': 'Not authorized to confirm this reservation'}
            if reservation['status'] != 'awaiting_seller_confirmation':
                conn.rollback()
                return {'error': 'Reservation is not awaiting seller confirmation'}

            item_id = reservation['item_id']
            transaction_type = reservation["transaction_type"]
            final_amount_due = float(reservation['final_amount_due'] or 0)

            if final_amount_due <= 0:
                if transaction_type == "lease":
                    gross_amount = float(reservation['lease_amount'] or 0)
                    next_item_status = 'available'
                    notif_type = "reservation_completed_lease"
                    success_msg = f"Seller confirmed your lease request for '{reservation['title']}'. Full payment was upfront, item is yours!"
                else:
                    gross_amount = float(reservation['sell_price'] or 0)
                    next_item_status = 'sold'
                    notif_type = "reservation_completed_purchase"
                    success_msg = f"Seller confirmed your purchase request for '{reservation['title']}'. Full payment was upfront, item is yours!"

                release_percentage = 30.0
                release_amount = round(gross_amount * (release_percentage / 100.0), 2)

                cur.execute(
                    """
                    UPDATE reservations
                    SET status = 'completed',
                        final_paid_at = NOW(),
                        seller_release_percentage = %s,
                        seller_release_amount = %s,
                        seller_released_at = NOW()
                    WHERE id = %s
                    """,
                    (release_percentage, release_amount, reservation_id)
                )
                cur.execute("UPDATE items SET status = %s, updated_at = NOW() WHERE id = %s", (next_item_status, item_id))

                insert_notification(
                    cur,
                    recipient_user_id=reservation["buyer_id"],
                    sender_user_id=seller_id,
                    type=notif_type,
                    message=success_msg,
                    reservation_id=reservation_id,
                    item_id=item_id,
                )

                conn.commit()
                return {
                    'status': 'completed',
                    'item_id': item_id,
                    'transaction_type': transaction_type,
                }
            else:
                cur.execute(
                    """
                    UPDATE reservations
                    SET status = 'awaiting_final_payment'
                    WHERE id = %s
                    """,
                    (reservation_id,),
                )

                if transaction_type == "lease":
                    buyer_msg = f"Seller confirmed your lease request for '{reservation['title']}'. Please pay the remaining lease amount."
                else:
                    buyer_msg = f"Seller confirmed your purchase request for '{reservation['title']}'. Please pay the remaining amount."

                insert_notification(
                    cur,
                    recipient_user_id=reservation["buyer_id"],
                    sender_user_id=seller_id,
                    type="reservation_seller_confirmed",
                    message=buyer_msg,
                    reservation_id=reservation_id,
                    item_id=item_id,
                )
                insert_notification(
                    cur,
                    recipient_user_id=reservation["buyer_id"],
                    sender_user_id=seller_id,
                    type="reservation_final_payment_due",
                    message=f"Final payment is now due for '{reservation['title']}'.",
                    reservation_id=reservation_id,
                    item_id=item_id,
                )

                conn.commit()
                return {
                    'status': 'awaiting_final_payment',
                    'item_id': item_id,
                    'transaction_type': transaction_type,
                }

    except Exception as exc:
        conn.rollback()
        raise exc

def cancel_reservation(reservation_id, user_id):
    """
    Cancel an active reservation.
    Transactional: Update reservation -> Update item back to available.
    """
    expire_reservations_if_needed()

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    r.item_id,
                    r.buyer_id,
                    r.status,
                    r.initial_amount,
                    r.initial_payment_id,
                    i.seller_id,
                    i.title AS item_title,
                    r.transaction_type
                FROM reservations r
                JOIN items i ON r.item_id = i.id
                WHERE r.id = %s FOR UPDATE
                """,
                (reservation_id,),
            )
            reservation = cur.fetchone()

            if not reservation:
                conn.rollback()
                return {'error': 'Reservation not found'}
            if str(reservation['buyer_id']) != str(user_id) and str(reservation['seller_id']) != str(user_id):
                conn.rollback()
                return {'error': 'Not authorized to cancel this reservation'}
            if reservation['status'] not in OPEN_STATUSES:
                conn.rollback()
                return {'error': 'Reservation cannot be cancelled at this stage'}

            item_id = reservation['item_id']
            cancelling_buyer = str(reservation["buyer_id"]) == str(user_id)

            # Buyers can only cancel before initial payment is completed.
            if cancelling_buyer and reservation["status"] != "pending_initial_payment":
                conn.rollback()
                return {'error': 'You cannot cancel after initial payment. Contact seller support.'}

            forfeited_amount = 0
            refund_amount = 0
            refunded = False

            # Seller cancellation after initial payment should refund buyer.
            if not cancelling_buyer and reservation["initial_payment_id"] and float(reservation["initial_amount"] or 0) > 0:
                refund_amount = round(float(reservation["initial_amount"] or 0), 2)
                razorpay_client = get_razorpay_client()
                if not razorpay_client:
                    conn.rollback()
                    return {'error': 'Razorpay not configured for refund'}
                try:
                    razorpay_client.payment.refund(
                        reservation["initial_payment_id"],
                        {
                            "amount": int(refund_amount * 100),
                            "notes": {
                                "reservation_id": str(reservation_id),
                                "reason": "seller_cancelled",
                            },
                        },
                    )
                    refunded = True
                except Exception as exc:
                    conn.rollback()
                    return {'error': f'Failed to refund initial payment: {str(exc)}'}

            # Buyer cancelling after seller confirmation forfeits initial amount.
            if cancelling_buyer and reservation["status"] == "awaiting_final_payment":
                forfeited_amount = float(reservation["initial_amount"] or 0)
            cur.execute(
                "UPDATE reservations SET status = 'cancelled', forfeited_amount = %s WHERE id = %s",
                (forfeited_amount, reservation_id),
            )
            cur.execute("UPDATE items SET status = 'available', updated_at = NOW() WHERE id = %s", (item_id,))

            recipient_user_id = reservation["seller_id"] if cancelling_buyer else reservation["buyer_id"]
            sender_user_id = user_id

            insert_notification(
                cur,
                recipient_user_id=recipient_user_id,
                sender_user_id=sender_user_id,
                type="reservation_cancelled",
                message=(
                    f"Order for '{reservation['item_title']}' was cancelled. "
                    "Tap to view order details."
                ),
                reservation_id=reservation_id,
                item_id=item_id,
            )
            if forfeited_amount > 0:
                insert_notification(
                    cur,
                    recipient_user_id=reservation["buyer_id"],
                    sender_user_id=reservation["seller_id"],
                    type="reservation_deposit_forfeited",
                    message=f"Your initial payment of ₹{forfeited_amount:.2f} was forfeited for '{reservation['item_title']}'.",
                    reservation_id=reservation_id,
                    item_id=item_id,
                )
            if refunded:
                insert_notification(
                    cur,
                    recipient_user_id=reservation["buyer_id"],
                    sender_user_id=reservation["seller_id"],
                    type="reservation_refunded",
                    message=f"Seller cancelled '{reservation['item_title']}'. Your initial payment of ₹{refund_amount:.2f} was refunded.",
                    reservation_id=reservation_id,
                    item_id=item_id,
                )
                insert_notification(
                    cur,
                    recipient_user_id=reservation["seller_id"],
                    sender_user_id=reservation["buyer_id"],
                    type="reservation_refund_processed",
                    message=f"Initial payment refund of ₹{refund_amount:.2f} processed for '{reservation['item_title']}'.",
                    reservation_id=reservation_id,
                    item_id=item_id,
                )

            conn.commit()
            return {'status': 'cancelled', 'item_id': item_id}

    except Exception as exc:
        conn.rollback()
        raise exc

def verify_payment(reservation_id, razorpay_payment_id, razorpay_order_id, razorpay_signature, buyer_id):
    """
    Verify Razorpay payment signature and mark reservation as active.
    """
    expire_reservations_if_needed()

    razorpay_client = get_razorpay_client()
    if not razorpay_client:
        return {'error': 'Razorpay not configured'}
        
    try:
        # Verify signature
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
    except razorpay.errors.SignatureVerificationError:
        return {'error': 'Invalid payment signature'}

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, status, buyer_id, item_id
                FROM reservations 
                WHERE id = %s AND initial_order_id = %s
                FOR UPDATE
                """,
                (reservation_id, razorpay_order_id)
            )
            reservation = cur.fetchone()
            
            if not reservation:
                conn.rollback()
                return {'error': 'Reservation not found or order ID mismatch'}
            
            if str(reservation['buyer_id']) != str(buyer_id):
                conn.rollback()
                return {'error': 'Not authorized'}
                
            if reservation['status'] != 'pending_initial_payment':
                conn.rollback()
                return {'error': 'Reservation is not pending initial payment'}
                
            # Mark awaiting seller confirmation after initial payment.
            cur.execute(
                """
                UPDATE reservations 
                SET status = 'awaiting_seller_confirmation',
                    initial_payment_id = %s,
                    initial_signature = %s,
                    initial_paid_at = NOW(),
                    razorpay_payment_id = %s,
                    razorpay_signature = %s
                WHERE id = %s
                """,
                (razorpay_payment_id, razorpay_signature, razorpay_payment_id, razorpay_signature, reservation_id)
            )
            cur.execute(
                """
                SELECT i.seller_id, i.title
                FROM items i
                WHERE i.id = %s
                """,
                (reservation["item_id"],),
            )
            item = cur.fetchone()
            if item:
                insert_notification(
                    cur,
                    recipient_user_id=item["seller_id"],
                    sender_user_id=buyer_id,
                    type="reservation_initial_payment_paid",
                    message=f"Buyer paid initial amount for '{item['title']}'. Please confirm the reservation.",
                    reservation_id=reservation_id,
                    item_id=reservation["item_id"],
                )
            conn.commit()
            return {'status': 'awaiting_seller_confirmation'}
    except Exception as exc:
        conn.rollback()
        raise exc


def create_final_payment_order(reservation_id, buyer_id):
    expire_reservations_if_needed()
    razorpay_client = get_razorpay_client()
    if not razorpay_client:
        return {'error': 'Razorpay not configured'}

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, buyer_id, status, final_amount_due
                FROM reservations
                WHERE id = %s
                FOR UPDATE
                """,
                (reservation_id,),
            )
            reservation = cur.fetchone()
            if not reservation:
                conn.rollback()
                return {'error': 'Reservation not found'}
            if str(reservation["buyer_id"]) != str(buyer_id):
                conn.rollback()
                return {'error': 'Not authorized'}
            if reservation["status"] != "awaiting_final_payment":
                conn.rollback()
                return {'error': 'Reservation is not awaiting final payment'}

            amount_in_inr = round(float(reservation["final_amount_due"] or 0), 2)
            if amount_in_inr <= 0:
                conn.rollback()
                return {'error': 'No final payment due'}
            amount_in_paise = int(amount_in_inr * 100)
            order_data = {
                'amount': amount_in_paise,
                'currency': 'INR',
                'receipt': f"final_{str(reservation_id)[:8]}_{str(buyer_id)[:8]}",
            }
            razorpay_order = razorpay_client.order.create(data=order_data)
            final_order_id = razorpay_order['id']

            cur.execute(
                """
                UPDATE reservations
                SET final_order_id = %s
                WHERE id = %s
                """,
                (final_order_id, reservation_id),
            )
            conn.commit()
            return {
                'reservation_id': reservation_id,
                'razorpay_order_id': final_order_id,
                'amount': amount_in_paise,
                'currency': 'INR',
            }
    except Exception as exc:
        conn.rollback()
        raise exc


def verify_final_payment(reservation_id, razorpay_payment_id, razorpay_order_id, razorpay_signature, buyer_id):
    expire_reservations_if_needed()
    razorpay_client = get_razorpay_client()
    if not razorpay_client:
        return {'error': 'Razorpay not configured'}
    try:
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
    except razorpay.errors.SignatureVerificationError:
        return {'error': 'Invalid payment signature'}

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT r.id, r.status, r.buyer_id, r.item_id, r.transaction_type, r.lease_amount, r.final_amount_due,
                       i.sell_price, i.seller_id, i.title
                FROM reservations r
                JOIN items i ON i.id = r.item_id
                WHERE r.id = %s AND r.final_order_id = %s
                FOR UPDATE
                """,
                (reservation_id, razorpay_order_id),
            )
            reservation = cur.fetchone()
            if not reservation:
                conn.rollback()
                return {'error': 'Reservation not found or order ID mismatch'}
            if str(reservation["buyer_id"]) != str(buyer_id):
                conn.rollback()
                return {'error': 'Not authorized'}
            if reservation["status"] != "awaiting_final_payment":
                conn.rollback()
                return {'error': 'Reservation is not awaiting final payment'}

            if reservation['transaction_type'] == 'lease':
                gross_amount = float(reservation['lease_amount'] or 0)
                next_item_status = 'available'
                notif_type = "reservation_completed_lease"
            else:
                gross_amount = float(reservation['sell_price'] or 0)
                next_item_status = 'sold'
                notif_type = "reservation_completed_purchase"
            release_percentage = 30.0
            release_amount = round(gross_amount * (release_percentage / 100.0), 2)

            cur.execute(
                """
                UPDATE reservations
                SET status = 'completed',
                    final_payment_id = %s,
                    final_signature = %s,
                    final_paid_at = NOW(),
                    seller_release_percentage = %s,
                    seller_release_amount = %s,
                    seller_released_at = NOW()
                WHERE id = %s
                """,
                (razorpay_payment_id, razorpay_signature, release_percentage, release_amount, reservation_id),
            )
            cur.execute("UPDATE items SET status = %s, updated_at = NOW() WHERE id = %s", (next_item_status, reservation["item_id"]))

            insert_notification(
                cur,
                recipient_user_id=reservation["buyer_id"],
                sender_user_id=reservation["seller_id"],
                type=notif_type,
                message=f"Congratulations! Payment completed for '{reservation['title']}'.",
                reservation_id=reservation_id,
                item_id=reservation["item_id"],
            )
            insert_notification(
                cur,
                recipient_user_id=reservation["seller_id"],
                sender_user_id=reservation["buyer_id"],
                type="reservation_final_payment_paid",
                message=f"Buyer completed final payment for '{reservation['title']}'.",
                reservation_id=reservation_id,
                item_id=reservation["item_id"],
            )
            conn.commit()
            return {'status': 'completed'}
    except Exception as exc:
        conn.rollback()
        raise exc