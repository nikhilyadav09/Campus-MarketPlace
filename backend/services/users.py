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
        'google_connected': bool(user_row.get('google_id')),
        'created_at': created_at.isoformat() if hasattr(created_at, 'isoformat') else created_at,
    }


def list_users():
    """List all users."""
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT id, email, name, mobile_number, year, hostel_name, room_number, google_id, created_at
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
            SELECT id, email, name, mobile_number, year, hostel_name, room_number, google_id, created_at
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
            SELECT id, email, name, password_hash, google_id, mobile_number, year, hostel_name, room_number, created_at
            FROM users
            WHERE LOWER(email) = LOWER(%s)
            """,
            (email,)
        )
        return cur.fetchone()


def get_user_record_by_google_id(google_id):
    """Get the full user record by google_id."""
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT id, email, name, password_hash, google_id, mobile_number, year, hostel_name, room_number, created_at
            FROM users
            WHERE google_id = %s
            """,
            (google_id,)
        )
        return cur.fetchone()


def get_user_record_by_id(user_id):
    """Get the full user record by ID, including password hash."""
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT id, email, name, password_hash, google_id, mobile_number, year, hostel_name, room_number, created_at
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )
        return cur.fetchone()


def create_user(email, name, password=None, mobile_number=None, year=None, hostel_name=None, room_number=None, google_id=None):
    """Create a new user with either a password hash, a Google identity, or both."""
    password_hash = generate_password_hash(password) if password else None

    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (email, name, password_hash, google_id, mobile_number, year, hostel_name, room_number)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, email, name, mobile_number, year, hostel_name, room_number, google_id, created_at
            """,
            (
                email,
                name,
                password_hash,
                google_id,
                mobile_number,
                year,
                hostel_name,
                room_number,
            )
        )
        return serialize_user(cur.fetchone())


def attach_google_account(user_id, google_id, name=None):
    """Link a Google identity to an existing user."""
    with get_cursor() as cur:
        cur.execute(
            """
            UPDATE users
            SET google_id = %s,
                name = COALESCE(%s, name)
            WHERE id = %s
            RETURNING id, email, name, mobile_number, year, hostel_name, room_number, google_id, created_at
            """,
            (google_id, name, user_id),
        )
        return serialize_user(cur.fetchone())


def find_or_create_google_user(email, name, google_id):
    """Find an existing user by Google account/email or create a new Google-backed user."""
    google_user = get_user_record_by_google_id(google_id)
    if google_user:
        return serialize_user(google_user)

    email_user = get_user_record_by_email(email)
    if email_user:
        return attach_google_account(email_user['id'], google_id, name=name)

    return create_user(email=email, name=name, google_id=google_id)


def verify_user_credentials(email, password):
    """Validate email/password and return the safe user payload on success."""
    user = get_user_record_by_email(email)
    if not user or not user.get('password_hash'):
        return None
    if not check_password_hash(user['password_hash'], password):
        return None
    return serialize_user(user)