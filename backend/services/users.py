from werkzeug.security import check_password_hash, generate_password_hash
from db import get_cursor


def serialize_user(user_row):
    """Return a safe public representation of a user row."""
    if not user_row:
        return None

    created_at = user_row.get('created_at')

    return {
        'id': str(user_row['id']),
        'email': user_row['email'],
        'name': user_row['name'],
        'mobile_number': user_row.get('mobile_number'),
        'year': user_row.get('year'),
        'hostel_name': user_row.get('hostel_name'),
        'room_number': user_row.get('room_number'),
        'created_at': created_at.isoformat() if hasattr(created_at, 'isoformat') else created_at,
    }


def list_users():
    """List all users."""
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT id, email, name, mobile_number, year, hostel_name, room_number, created_at
            FROM users
            ORDER BY name
            """
        )
        return [serialize_user(user) for user in cur.fetchall()]


def get_user(user_id):
    """Get a single user by ID."""
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT id, email, name, mobile_number, year, hostel_name, room_number, created_at
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )
        return serialize_user(cur.fetchone())


def get_user_record_by_email(email):
    """Get the full user record by email, including password hash."""
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT id, email, name, password_hash, mobile_number, year, hostel_name, room_number, created_at
            FROM users
            WHERE LOWER(email) = LOWER(%s)
            """,
            (email,)
        )
        return cur.fetchone()


def get_user_record_by_id(user_id):
    """Get the full user record by ID, including password hash."""
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT id, email, name, password_hash, mobile_number, year, hostel_name, room_number, created_at
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )
        return cur.fetchone()


def create_user(email, name, password, mobile_number=None, year=None, hostel_name=None, room_number=None):
    """Create a new user with a hashed password."""
    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (email, name, password_hash, mobile_number, year, hostel_name, room_number)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, email, name, mobile_number, year, hostel_name, room_number, created_at
            """,
            (
                email,
                name,
                generate_password_hash(password),
                mobile_number,
                year,
                hostel_name,
                room_number,
            )
        )
        return serialize_user(cur.fetchone())


def verify_user_credentials(email, password):
    """Validate email/password and return the safe user payload on success."""
    user = get_user_record_by_email(email)
    if not user or not check_password_hash(user['password_hash'], password):
        return None
    return serialize_user(user)
