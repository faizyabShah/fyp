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
    user_data = dict(user_data)
    data = {
        'email': user_data['email'],
        'name': user_data['name'],
        'phone': user_data['phone'],
        'language': user_data['language'],
        'address': user_data['address']
    }
    if not user_data:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    conn.close()

    # Prepare the response payload
    response = {
        'user': data
    }

    return jsonify(response), 200
