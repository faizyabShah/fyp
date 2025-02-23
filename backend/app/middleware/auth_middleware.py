from flask import request, jsonify
import jwt
from app.config import Config

def authenticate_request():
    """Authenticate user from JWT token"""
    auth_header = request.headers.get('Authorization')

    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({'error': 'Unauthorized'}), 401

    token = auth_header.split(" ")[1]

    try:
        decoded = jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
        return decoded  # Contains 'email'
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401
