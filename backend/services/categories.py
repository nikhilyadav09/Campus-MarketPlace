from db import get_cursor

def list_categories():
    """List all categories."""
    with get_cursor() as cur:
        cur.execute("""
            SELECT id, name, parent_id 
            FROM categories 
            ORDER BY 
                (CASE WHEN name = 'Other' THEN 1 ELSE 0 END),
                name
        """)
        return cur.fetchall()
def get_category(category_id):
    """Get a single category by ID."""
    with get_cursor() as cur:
        cur.execute("SELECT id, name, parent_id FROM categories WHERE id = %s", (category_id,))
        return cur.fetchone()
