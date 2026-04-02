from db import get_cursor, get_db

def list_items(category_id=None, seller_id=None, status=None, exclude_seller_id=None):
    """List all items with optional filters. Includes buyer info for sold/reserved items."""
    # Keep item status consistent with reservation expirations.
    from services.reservations import expire_reservations_if_needed
    expire_reservations_if_needed()

    query = """
        SELECT i.id, i.title, i.original_price, i.sell_price, i.lease_price_per_day, i.max_lease_days,
               i.status, i.image_url,
               i.allow_purchase, i.allow_lease,
               c.name as category_name, i.description, i.seller_id,
               u.name as seller_name,
               r.transaction_type,
               r.lease_amount,
               CASE
                   WHEN r.transaction_type = 'lease' THEN r.lease_amount
                   WHEN r.transaction_type = 'purchase' THEN i.sell_price
                   ELSE NULL
               END AS deal_amount,
               buyer.id as buyer_id,
               buyer.name as buyer_name,
               buyer.mobile_number as buyer_mobile,
               buyer.hostel_name as buyer_hostel,
               buyer.room_number as buyer_room
        FROM items i
        JOIN categories c ON i.category_id = c.id
        JOIN users u ON i.seller_id = u.id
        LEFT JOIN reservations r ON i.id = r.item_id AND r.status IN ('awaiting_seller_confirmation', 'awaiting_final_payment', 'completed')
        LEFT JOIN users buyer ON r.buyer_id = buyer.id
        WHERE 1=1
    """
    params = []
    
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
        
def delete_item(item_id, user_id):
    """Delete an item if it belongs to the user."""
    from db import get_cursor
    with get_cursor() as cur:
        # Check ownership and existence
        cur.execute("SELECT seller_id FROM items WHERE id = %s", (item_id,))
        item = cur.fetchone()
        
        if not item:
            return {'error': 'Item not found'}
            
        if str(item['seller_id']) != str(user_id):
            return {'error': 'Not authorized'}
            
        cur.execute("DELETE FROM items WHERE id = %s", (item_id,))
        return {'status': 'deleted', 'item_id': item_id}

def create_item(
    seller_id,
    category_id,
    title,
    original_price,
    sell_price,
    description=None,
    image_url=None,
    allow_purchase=True,
    allow_lease=False,
    lease_price_per_day=None,
    max_lease_days=None,
):
    """Create a new item."""
    with get_cursor() as cur:
        cur.execute("""
            INSERT INTO items (
                seller_id, category_id, title, original_price, sell_price,
                description, image_url,
                allow_purchase, allow_lease, lease_price_per_day, max_lease_days, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'available')
            RETURNING id, title, original_price, sell_price, lease_price_per_day, max_lease_days,
                      status, image_url, allow_purchase, allow_lease
        """, (seller_id, category_id, title, original_price, sell_price,
              description, image_url, allow_purchase, allow_lease, lease_price_per_day, max_lease_days))
        return cur.fetchone()

def get_item(item_id):
    """Get item by ID."""
    # Keep item status consistent with reservation expirations.
    from services.reservations import expire_reservations_if_needed
    expire_reservations_if_needed()

    with get_cursor() as cur:
        cur.execute("""
            SELECT i.id, i.title, i.original_price, i.sell_price, i.lease_price_per_day, i.max_lease_days,
                   i.status, i.image_url,
                   i.allow_purchase, i.allow_lease,
                   i.description, i.seller_id, i.category_id,
                   i.created_at, i.updated_at,
                   r.transaction_type,
                   r.lease_amount,
                   CASE
                       WHEN r.transaction_type = 'lease' THEN r.lease_amount
                       WHEN r.transaction_type = 'purchase' THEN i.sell_price
                       ELSE NULL
                   END AS deal_amount,
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
            LEFT JOIN reservations r ON i.id = r.item_id AND r.status IN ('awaiting_seller_confirmation', 'awaiting_final_payment', 'completed')
            LEFT JOIN users buyer ON r.buyer_id = buyer.id
            WHERE i.id = %s
        """, (item_id,))
        return cur.fetchone()
        
def get_recently_listed(limit=4):
    """Get recently listed items ordered by created_at descending."""
    with get_cursor() as cur:
        cur.execute("""
            SELECT i.id, i.title, i.original_price, i.sell_price, i.lease_price_per_day, i.max_lease_days,
                i.status, i.image_url,
                i.allow_purchase, i.allow_lease,
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