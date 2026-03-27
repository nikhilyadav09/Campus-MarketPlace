import os
from contextlib import contextmanager

import psycopg
from dotenv import load_dotenv
from flask import g
from psycopg_pool import ConnectionPool

load_dotenv()

pool = None


def get_db_url():
    """Get database URL from environment."""
    return os.environ.get("DATABASE_URL", "postgresql://postgres:Ajay%40123@localhost:5432/campus_marketplace")


def ensure_auth_columns():
    """Backfill auth-related columns for existing databases."""
    global pool
    if pool is None:
        return

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                ALTER TABLE IF EXISTS users
                ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
                ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20),
                ADD COLUMN IF NOT EXISTS year VARCHAR(20),
                ADD COLUMN IF NOT EXISTS hostel_name VARCHAR(100),
                ADD COLUMN IF NOT EXISTS room_number VARCHAR(20)
                """
            )
            cur.execute("ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS uq_users_google_id")
            cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_google_id ON users(google_id) WHERE google_id IS NOT NULL")
        conn.commit()


def ensure_runtime_schema():
    """
    Backfill non-breaking schema updates for existing local databases.
    Keeps app usable without forcing full re-seed.
    """
    global pool
    if pool is None:
        return

    with pool.connection() as conn:
        with conn.cursor() as cur:
            # Notifications table (added after initial schema).
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS notifications (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
                    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
                    type VARCHAR(50) NOT NULL,
                    message TEXT NOT NULL,
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    read_at TIMESTAMPTZ
                )
                """
            )
            cur.execute("CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id)")
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_user_id) WHERE is_read = FALSE"
            )
            cur.execute("CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)")

            # Reservation payout bookkeeping (seller gets 30% only after confirmation).
            cur.execute(
                """
                ALTER TABLE IF EXISTS reservations
                ADD COLUMN IF NOT EXISTS seller_release_percentage NUMERIC(5, 2),
                ADD COLUMN IF NOT EXISTS seller_release_amount NUMERIC(10, 2),
                ADD COLUMN IF NOT EXISTS seller_released_at TIMESTAMPTZ
                """
            )
        conn.commit()


def init_db_pool(app):
    """Initialize connection pool."""
    global pool
    db_url = get_db_url()
    pool = ConnectionPool(conninfo=db_url, min_size=1, max_size=10, kwargs={"row_factory": psycopg.rows.dict_row})
    ensure_auth_columns()
    ensure_runtime_schema()

    @app.teardown_appcontext
    def close_db(error):
        """Close connection at end of request."""
        conn = g.pop('db_conn', None)
        if conn and pool:
            pool.putconn(conn)


def close_pool():
    """Close the connection pool."""
    global pool
    if pool:
        pool.close()
        pool = None


def get_db():
    """Get a database connection from the pool."""
    global pool
    if 'db_conn' not in g:
        if pool is None:
            db_url = get_db_url()
            pool = ConnectionPool(conninfo=db_url, min_size=1, max_size=10, kwargs={"row_factory": psycopg.rows.dict_row})
            ensure_auth_columns()
            ensure_runtime_schema()
        g.db_conn = pool.getconn()
    return g.db_conn


@contextmanager
def get_cursor():
    """Yield a cursor and commit on success."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise