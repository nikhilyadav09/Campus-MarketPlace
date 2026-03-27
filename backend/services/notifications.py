from db import get_db


def insert_notification(
    cur,
    *,
    recipient_user_id,
    type,
    message,
    reservation_id=None,
    item_id=None,
    sender_user_id=None,
):
    """
    Insert a notification using an existing cursor/transaction.
    """
    cur.execute(
        """
        INSERT INTO notifications (
            recipient_user_id,
            sender_user_id,
            reservation_id,
            item_id,
            type,
            message,
            is_read,
            created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, FALSE, NOW())
        """,
        (
            recipient_user_id,
            sender_user_id,
            reservation_id,
            item_id,
            type,
            message,
        ),
    )


def create_notification(
    *,
    recipient_user_id,
    type,
    message,
    reservation_id=None,
    item_id=None,
    sender_user_id=None,
):
    conn = get_db()
    with conn.cursor() as cur:
        insert_notification(
            cur,
            recipient_user_id=recipient_user_id,
            type=type,
            message=message,
            reservation_id=reservation_id,
            item_id=item_id,
            sender_user_id=sender_user_id,
        )
    conn.commit()


def list_notifications(user_id, limit=20):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                n.id,
                n.type,
                n.message,
                n.is_read,
                n.created_at,
                n.reservation_id,
                n.item_id
            FROM notifications n
            WHERE n.recipient_user_id = %s
            ORDER BY n.created_at DESC
            LIMIT %s
            """,
            (user_id, limit),
        )
        return cur.fetchall()


def list_unread_notification_count(user_id):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COALESCE(COUNT(*), 0) AS count
            FROM notifications n
            WHERE n.recipient_user_id = %s AND n.is_read = FALSE
            """,
            (user_id,),
        )
        return cur.fetchone()["count"]


def mark_notification_read(notification_id, user_id):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE notifications
            SET is_read = TRUE,
                read_at = NOW()
            WHERE id = %s AND recipient_user_id = %s
            RETURNING id
            """,
            (notification_id, user_id),
        )
        row = cur.fetchone()
    conn.commit()
    return row is not None

