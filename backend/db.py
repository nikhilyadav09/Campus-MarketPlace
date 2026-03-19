import os
from dotenv import load_dotenv
import psycopg

load_dotenv()
from psycopg_pool import ConnectionPool
from contextlib import contextmanager
from flask import g

# Global pool
pool = None

def get_db_url():
    """Get database URL from environment."""
    return os.environ.get("DATABASE_URL", "postgresql://postgres:Ajay%40123@localhost:5432/campus_marketplace")

def init_db_pool(app):
    """Initialize connection pool."""
    global pool
    db_url = get_db_url()
    pool = ConnectionPool(conninfo=db_url, min_size=1, max_size=10, kwargs={"row_factory": psycopg.rows.dict_row})

    @app.teardown_appcontext
    def close_db(error):
        """Close connection at end of request."""
        conn = g.pop('db_conn', None)
        if conn:
            # Return connection to pool
            # Note: psycopg pool handles putconn automatically if we just close the connection?
            # Actually with psycopg_pool, we just don't need to do specific close on connection if it was yielded by pool?
            # Let's verify standard pattern. 
            # pool.connection() context manager returns connection to pool.
            # But if we store in g, we need to manually put it back or close?
            # Psycopg 3 Pool: pool.getconn() -> conn -> pool.putconn(conn).
            if pool:
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
            # Lazy init if mostly for scripts
            db_url = get_db_url()
            pool = ConnectionPool(conninfo=db_url, min_size=1, max_size=10, kwargs={"row_factory": psycopg.rows.dict_row})
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
