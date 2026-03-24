from datetime import timedelta
import os
from urllib.parse import urlencode

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request
from flask_cors import CORS

from db import init_db_pool
from services.auth import (
    GoogleOAuthConfigError,
    GoogleOAuthError,
    ProfileValidationError,
    complete_google_login,
    complete_profile,
    get_authenticated_user,
    get_google_login_url,
    login_required,
    logout_user,
)
from services.categories import get_category, list_categories
from services.items import create_item, get_item, get_recently_listed, list_items
from services.reservations import cancel_reservation, confirm_reservation, list_reservations, reserve_item
from services.users import get_user, list_users

load_dotenv()

app = Flask(__name__)
app.url_map.strict_slashes = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-me')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

CORS(app, supports_credentials=True)

init_db_pool(app)


def build_frontend_error_redirect(message):
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    query = urlencode({'error': message})
    return f'{frontend_url}/login?{query}'


@app.route('/auth/me', methods=['GET'])
def auth_me_endpoint():
    user = get_authenticated_user()
    if not user:
        return jsonify({'user': None}), 200
    return jsonify({'user': user}), 200


@app.route('/auth/register', methods=['POST'])
def auth_register_endpoint():
    return jsonify({'error': 'Email/password sign-up has been removed. Please continue with Google.'}), 410


@app.route('/auth/login', methods=['POST'])
def auth_login_endpoint():
    return jsonify({'error': 'Email/password login has been removed. Please continue with Google.'}), 410


@app.route('/auth/profile', methods=['PATCH'])
@login_required
def auth_complete_profile_endpoint(current_user):
    try:
        user = complete_profile(current_user['id'], request.json or {})
        return jsonify({'user': user}), 200
    except ProfileValidationError as exc:
        return jsonify({'error': str(exc)}), 400


@app.route('/auth/google/login', methods=['GET'])
def auth_google_login_endpoint():
    next_path = request.args.get('next', '/')
    try:
        return redirect(get_google_login_url(next_path))
    except GoogleOAuthConfigError as exc:
        return redirect(build_frontend_error_redirect(str(exc)))


@app.route('/auth/google/callback', methods=['GET'])
def auth_google_callback_endpoint():
    error = request.args.get('error')
    if error:
        return redirect(build_frontend_error_redirect(f'Google sign-in failed: {error}'))

    try:
        result = complete_google_login(
            code=request.args.get('code'),
            state=request.args.get('state'),
        )
        return redirect(result['frontend_redirect'])
    except (GoogleOAuthConfigError, GoogleOAuthError) as exc:
        return redirect(build_frontend_error_redirect(str(exc)))


@app.route('/auth/logout', methods=['POST'])
def auth_logout_endpoint():
    logout_user()
    return jsonify({'status': 'logged_out'}), 200


@app.route('/items', methods=['GET', 'POST'])
def items_endpoint():
    if request.method == 'GET':
        category_id = request.args.get('category_id')
        seller_id = request.args.get('seller_id')
        exclude_seller_id = request.args.get('exclude_seller_id')
        status = request.args.get('status')
        items = list_items(category_id, seller_id, status, exclude_seller_id)
        return jsonify(items)

    current_user = get_authenticated_user()
    if not current_user:
        return jsonify({'error': 'Authentication required'}), 401

    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    required = ['category_id', 'title', 'price']
    missing = [field for field in required if field not in data]
    if missing:
        return jsonify({'error': f"Missing fields: {', '.join(missing)}"}), 400

    allow_purchase = bool(data.get('allow_purchase', True))
    allow_lease = bool(data.get('allow_lease', False))
    lease_percentage = data.get('lease_percentage', 10)

    if not allow_purchase and not allow_lease:
        return jsonify({'error': 'Enable at least one option: buy or lease'}), 400

    try:
        lease_percentage = float(lease_percentage)
    except (TypeError, ValueError):
        return jsonify({'error': 'lease_percentage must be a number'}), 400

    if lease_percentage < 4 or lease_percentage > 10:
        return jsonify({'error': 'lease_percentage must be between 4 and 10'}), 400

    try:
        item = create_item(
            seller_id=current_user['id'],
            category_id=data['category_id'],
            title=data['title'],
            price=data['price'],
            description=data.get('description'),
            image_url=data.get('image_url'),
            allow_purchase=allow_purchase,
            allow_lease=allow_lease,
            lease_percentage=lease_percentage,
        )
        return jsonify(item), 201
    except Exception as exc:
        return jsonify({'error': str(exc)}), 400

@app.route('/items/recently-listed', methods=['GET'])
def recently_listed_endpoint():
    """Get 4 most recently listed available items."""
    items = get_recently_listed(limit=4)
    return jsonify(items)


@app.route('/items/<item_id>', methods=['GET'])
def get_item_endpoint(item_id):
    item = get_item(item_id)
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    return jsonify(item)


@app.route('/items/<item_id>/sold', methods=['POST'])
@login_required
def mark_item_sold_endpoint(current_user, item_id):
    """Mark an item as sold (direct sale without reservation)."""
    from db import get_db

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT seller_id, status FROM items WHERE id = %s FOR UPDATE", (item_id,))
            item = cur.fetchone()

            if not item:
                return jsonify({'error': 'Item not found'}), 404

            if str(item['seller_id']) != str(current_user['id']):
                return jsonify({'error': 'Not authorized'}), 403

            if item['status'] == 'sold':
                return jsonify({'error': 'Item already sold'}), 400

            cur.execute("UPDATE items SET status = 'sold', updated_at = NOW() WHERE id = %s", (item_id,))
            cur.execute(
                """
                UPDATE reservations
                SET status = 'completed'
                WHERE item_id = %s AND status = 'active'
                """,
                (item_id,),
            )

            conn.commit()
            return jsonify({'status': 'sold', 'item_id': item_id}), 200
    except Exception as exc:
        conn.rollback()
        return jsonify({'error': str(exc)}), 500


@app.route('/categories', methods=['GET'])
def categories_endpoint():
    categories = list_categories()
    return jsonify(categories)


@app.route('/categories/<category_id>', methods=['GET'])
def get_category_endpoint(category_id):
    category = get_category(category_id)
    if not category:
        return jsonify({'error': 'Category not found'}), 404
    return jsonify(category)


@app.route('/users', methods=['GET'])
def users_endpoint():
    users = list_users()
    return jsonify(users)


@app.route('/users/<user_id>', methods=['GET'])
def get_user_endpoint(user_id):
    user = get_user(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user)


@app.route('/reservations', methods=['GET', 'POST'])
def reservations_endpoint():
    if request.method == 'GET':
        buyer_id = request.args.get('buyer_id')
        status = request.args.get('status')
        item_id = request.args.get('item_id')
        reservations = list_reservations(buyer_id=buyer_id, status=status)
        if item_id:
            reservations = [reservation for reservation in reservations if str(reservation['item_id']) == str(item_id)]
        return jsonify(reservations)

    current_user = get_authenticated_user()
    if not current_user:
        return jsonify({'error': 'Authentication required'}), 401

    data = request.json or {}
    item_id = data.get('item_id')
    transaction_type = data.get('transaction_type', 'purchase')
    if not item_id:
        return jsonify({'error': 'item_id required'}), 400

    result = reserve_item(item_id, current_user['id'], transaction_type=transaction_type)
    status_code = 201 if 'error' not in result else 409
    return jsonify(result), status_code

@app.route('/reservations/<reservation_id>', methods=['GET'])
def get_reservation_endpoint(reservation_id):
    reservations = list_reservations()
    for reservation in reservations:
        if str(reservation['id']) == str(reservation_id):
            return jsonify(reservation)
    return jsonify({'error': 'Reservation not found'}), 404


@app.route('/items/<item_id>/reserve', methods=['POST'])
@login_required
def reserve_item_endpoint(current_user, item_id):
    data = request.json or {}
    transaction_type = data.get('transaction_type', 'purchase')
    result = reserve_item(item_id, current_user['id'], transaction_type=transaction_type)
    status_code = 201 if 'error' not in result else 409
    return jsonify(result), status_code

@app.route('/reservations/<reservation_id>/confirm', methods=['POST'])
@login_required
def confirm_reservation_endpoint(current_user, reservation_id):
    result = confirm_reservation(reservation_id, current_user['id'])
    status_code = 200 if 'error' not in result else 400
    return jsonify(result), status_code


@app.route('/reservations/<reservation_id>/cancel', methods=['POST'])
@login_required
def cancel_reservation_endpoint(current_user, reservation_id):
    result = cancel_reservation(reservation_id, current_user['id'])
    status_code = 200 if 'error' not in result else 400
    return jsonify(result), status_code


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)