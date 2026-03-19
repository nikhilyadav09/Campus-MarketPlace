from functools import wraps
from flask import jsonify, session
from services.users import create_user, get_user_record_by_email, get_user_record_by_id, serialize_user, verify_user_credentials


SESSION_USER_KEY = 'user_id'


def get_authenticated_user():
    user_id = session.get(SESSION_USER_KEY)
    if not user_id:
        return None
    user = get_user_record_by_id(user_id)
    return serialize_user(user)


def login_user(email, password):
    user = verify_user_credentials(email, password)
    if not user:
        return None

    session[SESSION_USER_KEY] = user['id']
    session.permanent = True
    return user


def register_user(email, name, password, mobile_number=None, year=None, hostel_name=None, room_number=None):
    existing_user = get_user_record_by_email(email)
    if existing_user:
        raise ValueError('An account with this email already exists.')

    user = create_user(
        email=email,
        name=name,
        password=password,
        mobile_number=mobile_number,
        year=year,
        hostel_name=hostel_name,
        room_number=room_number,
    )
    session[SESSION_USER_KEY] = user['id']
    session.permanent = True
    return user


def logout_user():
    session.pop(SESSION_USER_KEY, None)


def login_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        user = get_authenticated_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        return view_func(user, *args, **kwargs)

    return wrapper
