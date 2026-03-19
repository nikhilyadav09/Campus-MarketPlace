import json
import os
import secrets
from functools import wraps
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from flask import jsonify, session

from services.users import (
    create_user,
    find_or_create_google_user,
    get_user_record_by_email,
    get_user_record_by_id,
    serialize_user,
    verify_user_credentials,
)

SESSION_USER_KEY = 'user_id'
GOOGLE_STATE_SESSION_KEY = 'google_oauth_state'
GOOGLE_NEXT_SESSION_KEY = 'google_oauth_next'
GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'


class GoogleOAuthConfigError(RuntimeError):
    pass


class GoogleOAuthError(RuntimeError):
    pass


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


def get_google_oauth_config():
    client_id = os.environ.get('GOOGLE_CLIENT_ID')
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
    redirect_uri = os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:8000/auth/google/callback')
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

    if not client_id or not client_secret:
        raise GoogleOAuthConfigError('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.')

    return {
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
        'frontend_url': frontend_url.rstrip('/'),
    }


def normalize_next_path(next_path):
    if not next_path or not str(next_path).startswith('/'):
        return '/'
    return next_path


def get_google_login_url(next_path='/'):
    config = get_google_oauth_config()
    state = secrets.token_urlsafe(24)
    session[GOOGLE_STATE_SESSION_KEY] = state
    session[GOOGLE_NEXT_SESSION_KEY] = normalize_next_path(next_path)

    query = urlencode({
        'client_id': config['client_id'],
        'redirect_uri': config['redirect_uri'],
        'response_type': 'code',
        'scope': 'openid email profile',
        'access_type': 'offline',
        'prompt': 'select_account',
        'state': state,
    })
    return f'{GOOGLE_AUTH_URL}?{query}'


def _post_json(url, data):
    payload = urlencode(data).encode('utf-8')
    request = Request(url, data=payload, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    try:
        with urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='ignore')
        raise GoogleOAuthError(f'Google token exchange failed: {detail or exc.reason}') from exc
    except URLError as exc:
        raise GoogleOAuthError(f'Google token exchange failed: {exc.reason}') from exc


def _get_json(url, headers=None):
    request = Request(url, headers=headers or {})
    try:
        with urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='ignore')
        raise GoogleOAuthError(f'Google user info request failed: {detail or exc.reason}') from exc
    except URLError as exc:
        raise GoogleOAuthError(f'Google user info request failed: {exc.reason}') from exc


def complete_google_login(code, state):
    config = get_google_oauth_config()
    expected_state = session.pop(GOOGLE_STATE_SESSION_KEY, None)
    next_path = session.pop(GOOGLE_NEXT_SESSION_KEY, '/')

    if not state or state != expected_state:
        raise GoogleOAuthError('Google sign-in state is invalid or expired. Please try again.')
    if not code:
        raise GoogleOAuthError('Google did not return an authorization code.')

    token_data = _post_json(GOOGLE_TOKEN_URL, {
        'code': code,
        'client_id': config['client_id'],
        'client_secret': config['client_secret'],
        'redirect_uri': config['redirect_uri'],
        'grant_type': 'authorization_code',
    })

    access_token = token_data.get('access_token')
    if not access_token:
        raise GoogleOAuthError('Google did not return an access token.')

    profile = _get_json(
        GOOGLE_USERINFO_URL,
        headers={'Authorization': f'Bearer {access_token}'},
    )

    google_id = profile.get('sub')
    email = (profile.get('email') or '').strip().lower()
    name = (profile.get('name') or '').strip()
    email_verified = profile.get('email_verified')

    if not google_id or not email or not name:
        raise GoogleOAuthError('Google profile is missing required fields.')
    if not email_verified:
        raise GoogleOAuthError('Your Google email address must be verified to continue.')

    user = find_or_create_google_user(email=email, name=name, google_id=google_id)
    session[SESSION_USER_KEY] = user['id']
    session.permanent = True

    return {
        'user': user,
        'frontend_redirect': f"{config['frontend_url']}{normalize_next_path(next_path)}",
    }