from flask import Flask, request, jsonify
from flask_cors import CORS
from db import init_db_pool
from services.items import list_items, create_item, get_item, get_recently_listed
from services.categories import list_categories, get_category
from services.users import list_users, get_user
from services.reservations import list_reservations, reserve_item, confirm_reservation, cancel_reservation
import os
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# APP INITIALIZATION - CORS APPLIED GLOBALLY BEFORE ANY ROUTES
# =============================================================================
app = Flask(__name__)
app.url_map.strict_slashes = False  # Accept both /path and /path/

# CORS Configuration - Applied at APP LEVEL
CORS(app, 
     origins=["http://localhost:5173"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True)

# Initialize DB Pool
init_db_pool(app)

# =============================================================================
# ITEMS ROUTES
# =============================================================================
@app.route('/items', methods=['GET', 'POST'])
def items_endpoint():
    if request.method == 'GET':
        category_id = request.args.get('category_id')
        seller_id = request.args.get('seller_id')
        exclude_seller_id = request.args.get('exclude_seller_id')
        status = request.args.get('status')
        items = list_items(category_id, seller_id, status, exclude_seller_id)
        return jsonify(items)
    
    elif request.method == 'POST':
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Validate required fields
        required = ['seller_id', 'category_id', 'title', 'price']
        missing = [f for f in required if f not in data]
        if missing:
            return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
        
        try:
            item = create_item(
                seller_id=data['seller_id'],
                category_id=data['category_id'],
                title=data['title'],
                price=data['price'],
                description=data.get('description'),
                image_url=data.get('image_url')
            )
            return jsonify(item), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 400

@app.route('/items/recently-listed', methods=['GET'])
def recently_listed_endpoint():
    """Get 4 most recently listed available items."""
    items = get_recently_listed(limit=4)
    return jsonify(items)

@app.route('/items/<item_id>', methods=['GET'])
def get_item_endpoint(item_id):
    item = get_item(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    return jsonify(item)

@app.route('/items/<item_id>/sold', methods=['POST'])
def mark_item_sold_endpoint(item_id):
    """Mark an item as sold (direct sale without reservation)."""
    from db import get_db
    
    data = request.json or {}
    seller_id = data.get('seller_id')
    
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Verify item exists and belongs to seller
            cur.execute("SELECT seller_id, status FROM items WHERE id = %s FOR UPDATE", (item_id,))
            item = cur.fetchone()
            
            if not item:
                return jsonify({"error": "Item not found"}), 404
            
            if seller_id and str(item['seller_id']) != str(seller_id):
                return jsonify({"error": "Not authorized"}), 403
            
            if item['status'] == 'sold':
                return jsonify({"error": "Item already sold"}), 400
            
            # Update item to sold
            cur.execute("UPDATE items SET status = 'sold', updated_at = NOW() WHERE id = %s", (item_id,))
            
            # Also mark any active reservations as completed
            cur.execute("""
                UPDATE reservations 
                SET status = 'completed' 
                WHERE item_id = %s AND status = 'active'
            """, (item_id,))
            
            conn.commit()
            
            return jsonify({"status": "sold", "item_id": item_id}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

# =============================================================================
# CATEGORIES ROUTES
# =============================================================================
@app.route('/categories', methods=['GET'])
def categories_endpoint():
    categories = list_categories()
    return jsonify(categories)

@app.route('/categories/<category_id>', methods=['GET'])
def get_category_endpoint(category_id):
    category = get_category(category_id)
    if not category:
        return jsonify({"error": "Category not found"}), 404
    return jsonify(category)

# =============================================================================
# USERS ROUTES
# =============================================================================
@app.route('/users', methods=['GET'])
def users_endpoint():
    users = list_users()
    return jsonify(users)

@app.route('/users/<user_id>', methods=['GET'])
def get_user_endpoint(user_id):
    user = get_user(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user)

# =============================================================================
# RESERVATIONS ROUTES
# =============================================================================
@app.route('/reservations', methods=['GET', 'POST'])
def reservations_endpoint():
    if request.method == 'GET':
        buyer_id = request.args.get('buyer_id')
        status = request.args.get('status')
        reservations = list_reservations(buyer_id, status)
        return jsonify(reservations)
    
    elif request.method == 'POST':
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        item_id = data.get('item_id')
        buyer_id = data.get('buyer_id')
        
        if not item_id:
            return jsonify({"error": "item_id required"}), 400
        if not buyer_id:
            return jsonify({"error": "buyer_id required"}), 400
        
        result = reserve_item(item_id, buyer_id)
        if "error" in result:
            return jsonify(result), 409
        return jsonify(result), 201

@app.route('/reservations/<reservation_id>', methods=['GET'])
def get_reservation_endpoint(reservation_id):
    # Get single reservation - for now, filter from list
    reservations = list_reservations()
    for r in reservations:
        if str(r['id']) == reservation_id:
            return jsonify(r)
    return jsonify({"error": "Reservation not found"}), 404

@app.route('/reservations/<reservation_id>/confirm', methods=['POST'])
def confirm_reservation_endpoint(reservation_id):
    result = confirm_reservation(reservation_id)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result), 200

@app.route('/reservations/<reservation_id>/cancel', methods=['POST'])
def cancel_reservation_endpoint(reservation_id):
    data = request.json or {}
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    result = cancel_reservation(reservation_id, user_id)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result), 200

# =============================================================================
# ENTRY POINT
# =============================================================================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
