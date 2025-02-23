from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import datetime
from app.config import Config
from app.database import get_db_connection
from app.services.auth_service import hash_password, verify_password

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    required_fields = ['email', 'password', 'name', 'phone', 'language', 'address']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    email, password, name, phone, language, address = data.values()
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        hashed_password = hash_password(password)
        cursor.execute('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)', (email, hashed_password, name, phone, language, address))
        conn.commit()

        token = jwt.encode(
            {'email': email, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
            Config.JWT_SECRET, algorithm='HS256'
        )
        return jsonify({'token': token}), 201
    except:
        return jsonify({'error': 'User already exists'}), 400
    finally:
        conn.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'error': 'Missing credentials'}), 400

    email, password = data['email'], data['password']
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email=?', (email,))
    user = cursor.fetchone()

    if user and verify_password(password, user['password']):
        token = jwt.encode({'email': email, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)}, Config.JWT_SECRET, algorithm='HS256')
        return jsonify({'token': token}), 200
    return jsonify({'error': 'Invalid credentials'}), 401
