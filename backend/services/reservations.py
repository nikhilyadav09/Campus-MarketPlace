import os
import razorpay
from datetime import datetime, timedelta, timezone

from db import get_cursor, get_db
from services.notifications import insert_notification

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
                i.sell_price
            FROM reservations r
            JOIN items i ON i.id = r.item_id
            WHERE r.status IN ('pending_payment', 'active')
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
                  AND r2.status IN ('pending_payment', 'active')
              )
            """,
            (item_ids,),
        )

        # Notifications (buyer + seller)
        for row in expired_rows:
            buyer_msg = (
                f"Your order for '{row['item_title']}' has expired. "
                "The seller did not confirm in time, and the item is available again."
            )
            seller_msg = (
                f"A reservation for '{row['item_title']}' has expired. "
                "The buyer did not complete the flow in time, and your item is available again."
            )

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



def list_reservations(buyer_id=None, status=None):
    """List reservations with full item details."""
    expire_reservations_if_needed()
    query = """
        SELECT
            r.id,
            r.item_id,
            r.buyer_id,
            r.transaction_type,
            r.lease_amount,
            r.status,
            r.expires_at,
            r.created_at,
            r.seller_release_percentage,
            r.seller_release_amount,
            r.seller_released_at,
            i.title as item_title,
            i.sell_price as item_price,
            i.allow_purchase,
            i.allow_lease,
            i.lease_price_per_month,
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
    if status:
        query += " AND r.status = %s"
        params.append(status)
    query += " ORDER BY r.created_at DESC"

    with get_cursor() as cur:
        cur.execute(query, params)
        return cur.fetchall()

def reserve_item(item_id, buyer_id, transaction_type='purchase', duration_hours=0.5):
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
                SELECT seller_id, status, sell_price, allow_purchase, allow_lease, lease_price_per_month
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
            if transaction_type == 'lease':
                lease_amount = round(float(item['lease_price_per_month']), 2)

            # Calculate amount for Razorpay (in paise)
            amount_in_inr = lease_amount if transaction_type == 'lease' else round(float(item['sell_price']), 2)
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
                razorpay_order_id = razorpay_order['id']
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
                    INSERT INTO reservations (item_id, buyer_id, transaction_type, lease_amount, expires_at, status, razorpay_order_id)
                    VALUES (%s, %s, %s, %s, %s, 'pending_payment', %s)
                    RETURNING id
                    """,
                    (item_id, buyer_id, transaction_type, lease_amount, expires_at, razorpay_order_id),
                )
            except Exception as exc:
                conn.rollback()
                return {'error': str(exc)}

            reservation_id = cur.fetchone()['id']
            conn.commit()
            return {
                'reservation_id': reservation_id,
                'razorpay_order_id': razorpay_order_id,
                'amount': amount_in_paise,
                'currency': 'INR',
                'expires_at': expires_at,
                'transaction_type': transaction_type,
                'lease_amount': lease_amount,
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
                    i.sell_price
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
            if reservation['status'] != 'active':
                conn.rollback()
                return {'error': 'Reservation not active'}

            item_id = reservation['item_id']
            next_item_status = 'sold' if reservation['transaction_type'] == 'purchase' else 'available'
            cur.execute("UPDATE items SET status = %s, updated_at = NOW() WHERE id = %s", (next_item_status, item_id))
            if reservation['transaction_type'] == 'lease':
                gross_amount = float(reservation['lease_amount']) if reservation['lease_amount'] is not None else 0.0
            else:
                gross_amount = float(reservation['sell_price']) if reservation['sell_price'] is not None else 0.0

            release_percentage = 30.0
            release_amount = round(gross_amount * (release_percentage / 100.0), 2)

            cur.execute(
                """
                UPDATE reservations
                SET status = 'completed',
                    seller_release_percentage = %s,
                    seller_release_amount = %s,
                    seller_released_at = NOW()
                WHERE id = %s
                """,
                (release_percentage, release_amount, reservation_id),
            )

            transaction_type = reservation["transaction_type"]
            if transaction_type == "lease":
                congrats = f"Congratulations! Your lease is confirmed. '{reservation['title']}' is yours."
                notif_type = "reservation_completed_lease"
            else:
                congrats = f"Congratulations! Your order is confirmed. '{reservation['title']}' is yours."
                notif_type = "reservation_completed_purchase"

            insert_notification(
                cur,
                recipient_user_id=reservation["buyer_id"],
                sender_user_id=seller_id,
                type=notif_type,
                message=congrats,
                reservation_id=reservation_id,
                item_id=item_id,
            )

            conn.commit()
            return {
                'status': 'confirmed',
                'item_id': item_id,
                'transaction_type': reservation['transaction_type'],
                'seller_release_percentage': release_percentage,
                'seller_release_amount': release_amount,
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
            if reservation['status'] not in ('active', 'pending_payment'):
                conn.rollback()
                return {'error': 'Reservation cannot be cancelled at this stage'}

            item_id = reservation['item_id']
            cur.execute("UPDATE reservations SET status = 'cancelled' WHERE id = %s", (reservation_id,))
            cur.execute("UPDATE items SET status = 'available', updated_at = NOW() WHERE id = %s", (item_id,))

            cancelling_buyer = str(reservation["buyer_id"]) == str(user_id)
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
                SELECT id, status, buyer_id 
                FROM reservations 
                WHERE id = %s AND razorpay_order_id = %s
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
                
            if reservation['status'] != 'pending_payment':
                conn.rollback()
                return {'error': 'Reservation is not pending payment'}
                
            # Mark active
            cur.execute(
                """
                UPDATE reservations 
                SET status = 'active', razorpay_payment_id = %s, razorpay_signature = %s
                WHERE id = %s
                """,
                (razorpay_payment_id, razorpay_signature, reservation_id)
            )
            conn.commit()
            return {'status': 'success'}
    except Exception as exc:
        conn.rollback()
        raise exc