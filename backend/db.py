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

            # Lease pricing migrated from monthly to daily model.
            cur.execute(
                """
                ALTER TABLE IF EXISTS items
                ADD COLUMN IF NOT EXISTS lease_price_per_day NUMERIC(10, 2),
                ADD COLUMN IF NOT EXISTS max_lease_days INTEGER
                """
            )
            cur.execute(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name = 'items' AND column_name = 'lease_price_per_month'
                    ) THEN
                        EXECUTE 'UPDATE items
                                 SET lease_price_per_day = COALESCE(lease_price_per_day, lease_price_per_month)
                                 WHERE allow_lease = TRUE';
                    END IF;
                END $$;
                """
            )
            cur.execute(
                """
                UPDATE items
                SET max_lease_days = COALESCE(max_lease_days, 30)
                WHERE allow_lease = TRUE
                """
            )
            cur.execute("ALTER TABLE IF EXISTS items DROP CONSTRAINT IF EXISTS chk_items_lease_price_valid")
            cur.execute(
                """
                ALTER TABLE IF EXISTS items
                ADD CONSTRAINT chk_items_lease_price_valid
                CHECK (
                    (allow_lease = FALSE AND lease_price_per_day IS NULL AND max_lease_days IS NULL)
                    OR (
                        allow_lease = TRUE
                        AND lease_price_per_day IS NOT NULL
                        AND max_lease_days IS NOT NULL
                        AND lease_price_per_day >= original_price * 0.03
                        AND lease_price_per_day <= original_price * 0.08
                        AND max_lease_days >= 1
                        AND max_lease_days <= 365
                    )
                )
                """
            )

            # Staged payment support.
            cur.execute(
                """
                ALTER TABLE IF EXISTS reservations
                ADD COLUMN IF NOT EXISTS lease_days INTEGER,
                ADD COLUMN IF NOT EXISTS initial_amount NUMERIC(10, 2),
                ADD COLUMN IF NOT EXISTS final_amount_due NUMERIC(10, 2),
                ADD COLUMN IF NOT EXISTS initial_order_id VARCHAR(255),
                ADD COLUMN IF NOT EXISTS initial_payment_id VARCHAR(255),
                ADD COLUMN IF NOT EXISTS initial_signature VARCHAR(255),
                ADD COLUMN IF NOT EXISTS final_order_id VARCHAR(255),
                ADD COLUMN IF NOT EXISTS final_payment_id VARCHAR(255),
                ADD COLUMN IF NOT EXISTS final_signature VARCHAR(255),
                ADD COLUMN IF NOT EXISTS initial_paid_at TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS final_paid_at TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS forfeited_amount NUMERIC(10, 2)
                """
            )
            cur.execute(
                """
                UPDATE reservations
                SET initial_amount = COALESCE(initial_amount, 0),
                    final_amount_due = COALESCE(final_amount_due, 0)
                WHERE initial_amount IS NULL OR final_amount_due IS NULL
                """
            )
            cur.execute("ALTER TABLE IF EXISTS reservations ALTER COLUMN status SET DEFAULT 'pending_initial_payment'")
            cur.execute("ALTER TABLE IF EXISTS reservations ALTER COLUMN initial_amount SET DEFAULT 0")
            cur.execute("ALTER TABLE IF EXISTS reservations ALTER COLUMN final_amount_due SET DEFAULT 0")
            cur.execute("ALTER TABLE IF EXISTS reservations ALTER COLUMN initial_amount SET NOT NULL")
            cur.execute("ALTER TABLE IF EXISTS reservations ALTER COLUMN final_amount_due SET NOT NULL")
            cur.execute("ALTER TABLE IF EXISTS reservations DROP CONSTRAINT IF EXISTS chk_reservations_status_valid")
            cur.execute(
                """
                ALTER TABLE IF EXISTS reservations
                ADD CONSTRAINT chk_reservations_status_valid
                CHECK (status IN (
                    'pending_initial_payment',
                    'awaiting_seller_confirmation',
                    'awaiting_final_payment',
                    'completed',
                    'cancelled',
                    'expired'
                ))
                """
            )
            cur.execute("DROP INDEX IF EXISTS uq_active_reservations_item")
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_active_reservations_item
                ON reservations(item_id)
                WHERE status IN ('pending_initial_payment', 'awaiting_seller_confirmation', 'awaiting_final_payment')
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