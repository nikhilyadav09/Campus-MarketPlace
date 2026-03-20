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


def init_db_pool(app):
    """Initialize connection pool."""
    global pool
    db_url = get_db_url()
    pool = ConnectionPool(conninfo=db_url, min_size=1, max_size=10, kwargs={"row_factory": psycopg.rows.dict_row})
    ensure_auth_columns()

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