from flask import Blueprint, jsonify
from app.database import get_db_connection
from app.middleware.auth_middleware import authenticate_request

user_bp = Blueprint('user', __name__)

@user_bp.route('/user', methods=['GET'])
def get_user_info():
    """
    Get the authenticated user's complete profile including:
    - User record (email, name, phone, language, address)
    - All associated fields
    - All associated requests
    """
    # Verify the JWT token using the middleware
    user_token = authenticate_request()
    if isinstance(user_token, tuple):  # If authentication failed, returns an error tuple
        return user_token

    user_email = user_token['email']

    conn = get_db_connection()
    cursor = conn.cursor()

    # Fetch the user's data from the "users" table
    cursor.execute('SELECT * FROM users WHERE email = ?', (user_email,))
    user_data = cursor.fetchone()
    if not user_data:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    # Fetch the user's fields from the "fields" table
    cursor.execute('SELECT * FROM fields WHERE user_email = ?', (user_email,))
    fields_data = cursor.fetchall()

    # Fetch the user's requests from the "requests" table
    cursor.execute('SELECT * FROM requests WHERE user_email = ?', (user_email,))
    requests_data = cursor.fetchall()

    conn.close()

    # Prepare the response payload
    response = {
        'user': dict(user_data),
        'fields': [dict(field) for field in fields_data],
        'requests': [dict(req) for req in requests_data]
    }

    return jsonify(response), 200
