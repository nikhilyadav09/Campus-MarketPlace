from datetime import datetime, timedelta, timezone

from db import get_cursor, get_db


def list_reservations(buyer_id=None, status=None):
    """List reservations with full item details."""
    query = """
        SELECT
            r.id,
            r.item_id,
            r.buyer_id,
            r.status,
            r.expires_at,
            r.created_at,
            i.title as item_title,
            i.price as item_price,
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


def reserve_item(item_id, buyer_id, duration_hours=0.5):
    """
    Reserve an item for a buyer.
    Transactional: Check item -> Update item -> Create reservation.
    Default reservation time is 30 minutes.
    """
    expires_at = datetime.now(timezone.utc) + timedelta(hours=duration_hours)

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT seller_id, status FROM items WHERE id = %s FOR UPDATE", (item_id,))
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
                    INSERT INTO reservations (item_id, buyer_id, expires_at, status)
                    VALUES (%s, %s, %s, 'active')
                    RETURNING id
                    """,
                    (item_id, buyer_id, expires_at),
                )
            except Exception as exc:
                conn.rollback()
                return {'error': str(exc)}

            reservation_id = cur.fetchone()['id']
            conn.commit()
            return {'reservation_id': reservation_id, 'expires_at': expires_at}

    except Exception as exc:
        conn.rollback()
        raise exc


def confirm_reservation(reservation_id, seller_id):
    """
    Complete a purchase.
    Transactional: Update item -> Update reservation.
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT r.item_id, r.status, i.seller_id
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
            cur.execute("UPDATE items SET status = 'sold', updated_at = NOW() WHERE id = %s", (item_id,))
            cur.execute("UPDATE reservations SET status = 'completed' WHERE id = %s", (reservation_id,))

            conn.commit()
            return {'status': 'confirmed', 'item_id': item_id}

    except Exception as exc:
        conn.rollback()
        raise exc


def cancel_reservation(reservation_id, user_id):
    """
    Cancel an active reservation.
    Transactional: Update reservation -> Update item back to available.
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT r.item_id, r.buyer_id, r.status, i.seller_id
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
            if reservation['status'] != 'active':
                conn.rollback()
                return {'error': 'Reservation not active'}

            item_id = reservation['item_id']
            cur.execute("UPDATE reservations SET status = 'cancelled' WHERE id = %s", (reservation_id,))
            cur.execute("UPDATE items SET status = 'available', updated_at = NOW() WHERE id = %s", (item_id,))

            conn.commit()
            return {'status': 'cancelled', 'item_id': item_id}

    except Exception as exc:
        conn.rollback()
        raise exc