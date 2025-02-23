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
        decoded = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])

        print(decoded)
        return decoded  # Contains 'email'
    except jwt.ExpiredSignatureError:
        print("EXPIRED")
        return jsonify({'error': 'Token expired'}), 401
    except jwt.InvalidTokenError:
        print("INVALIDE")
        return jsonify({'error': 'Invalid token'}), 401
    except Exception as e:
        print(e)
        return jsonify({'error': 'Error decoding token'}), 401
