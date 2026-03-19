from db import get_cursor

def list_users():
    """List all users."""
    with get_cursor() as cur:
        cur.execute("SELECT id, email, name FROM users ORDER BY name")
        return cur.fetchall()

def get_user(user_id):
    """Get a single user by ID."""
    with get_cursor() as cur:
        cur.execute("SELECT id, email, name FROM users WHERE id = %s", (user_id,))
        return cur.fetchone()
