from db import get_cursor, get_db

def list_items(category_id=None, seller_id=None, status=None, exclude_seller_id=None):
    """List all items with optional filters. Includes buyer info for sold/reserved items."""
    query = """
        SELECT i.id, i.title, i.price, i.status, i.image_url, 
               c.name as category_name, i.description, i.seller_id,
               u.name as seller_name,
               buyer.id as buyer_id,
               buyer.name as buyer_name,
               buyer.mobile_number as buyer_mobile,
               buyer.hostel_name as buyer_hostel,
               buyer.room_number as buyer_room
        FROM items i
        JOIN categories c ON i.category_id = c.id
        JOIN users u ON i.seller_id = u.id
        LEFT JOIN reservations r ON i.id = r.item_id AND r.status IN ('active', 'completed')
        LEFT JOIN users buyer ON r.buyer_id = buyer.id
        WHERE 1=1
    """
    params = []
    
    if category_id:
        query += " AND i.category_id = %s"
        params.append(category_id)
        
    if seller_id:
        query += " AND i.seller_id = %s"
        params.append(seller_id)
    
    if exclude_seller_id:
        query += " AND i.seller_id != %s"
        params.append(exclude_seller_id)
        
    if status:
        query += " AND i.status = %s"
        params.append(status)
        
    query += " ORDER BY i.created_at DESC"
    
    with get_cursor() as cur:
        cur.execute(query, params)
        return cur.fetchall()

def create_item(seller_id, category_id, title, price, description=None, image_url=None):
    """Create a new item."""
    with get_cursor() as cur:
        cur.execute("""
            INSERT INTO items (seller_id, category_id, title, price, description, image_url, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'available')
            RETURNING id, title, price, status, image_url
        """, (seller_id, category_id, title, price, description, image_url))
        return cur.fetchone()

def get_item(item_id):
    """Get item by ID."""
    with get_cursor() as cur:
        cur.execute("""
            SELECT i.id, i.title, i.price, i.status, i.image_url, 
                   i.description, i.seller_id, i.category_id,
                   i.created_at, i.updated_at,
                   c.name as category_name,
                   u.name as seller_name,
                   u.email as seller_email,
                   u.mobile_number as seller_mobile,
                   u.hostel_name as seller_hostel,
                   u.room_number as seller_room,
                   buyer.id as buyer_id,
                   buyer.name as buyer_name,
                   buyer.email as buyer_email,
                   buyer.mobile_number as buyer_mobile,
                   buyer.hostel_name as buyer_hostel,
                   buyer.room_number as buyer_room
            FROM items i
            JOIN categories c ON i.category_id = c.id
            JOIN users u ON i.seller_id = u.id
            LEFT JOIN reservations r ON i.id = r.item_id AND r.status IN ('active', 'completed')
            LEFT JOIN users buyer ON r.buyer_id = buyer.id
            WHERE i.id = %s
        """, (item_id,))
        return cur.fetchone()

def get_recently_listed(limit=4):
    """Get recently listed items ordered by created_at descending."""
    with get_cursor() as cur:
        cur.execute("""
            SELECT i.id, i.title, i.price, i.status, i.image_url,
                   c.name as category_name, i.description, i.seller_id,
                   u.name as seller_name
            FROM items i
            JOIN categories c ON i.category_id = c.id
            JOIN users u ON i.seller_id = u.id
            WHERE i.status = 'available'
            ORDER BY i.created_at DESC
            LIMIT %s
        """, (limit,))
        return cur.fetchall()
