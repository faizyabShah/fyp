from flask import Flask, request, jsonify
import bcrypt
import sqlite3
import jwt
import datetime
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins for testing

# Load secret key from an environment variable or use hardcoded value (for testing only)
app.config['JWT_SECRET'] = os.environ.get('JWT_SECRET', 'thisisahugesecret')

# Create SQLite database if it doesn't exist with the required schema
conn = sqlite3.connect('users.db')
cursor = conn.cursor()
cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY, 
        password BLOB,  -- Store password as binary data (BLOB)
        name TEXT, 
        coordinates TEXT, 
        plots INTEGER
    )
''')
conn.commit()
conn.close()

# Route for user signup
@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()

    # Validate input
    if not data or 'email' not in data or 'password' not in data or 'name' not in data or 'coordinates' not in data or 'numPlots' not in data:
        return jsonify({'error': 'Missing email, password, name, coordinates, or plots'}), 400

    email = data['email']
    password = data['password']
    name = data['name']
    coordinates = str(data['coordinates'])  # Convert to string for storage
    plots = data['numPlots']

    # Connect to SQLite database
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()

    try:
        # Hash the password (store as byte string)
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        # Insert the user into the database
        cursor.execute('INSERT INTO users VALUES (?, ?, ?, ?, ?)', (email, hashed_password, name, coordinates, plots))
        conn.commit()
        token = jwt.encode(
                {'email': email, 'name': name , 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
                app.config['JWT_SECRET'],
                algorithm='HS256'
            )

        return jsonify({'token': token}), 201

    except sqlite3.IntegrityError:
        return jsonify({'error': 'User with this email already exists'}), 400

    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

    finally:
        conn.close()

# Route for user login
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    # Validate input
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'error': 'Missing email or password'}), 400

    email = data['email']
    password = data['password']

    # Connect to SQLite database
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()

    try:
        # Query the user by email
        cursor.execute('SELECT * FROM users WHERE email=?', (email,))
        user = cursor.fetchone()
        print(user)

        if user and bcrypt.checkpw(password.encode('utf-8'), user[1]):
            # Create a JWT token
            token = jwt.encode(
                {'email': user[0], 'name': user[2] , 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
                app.config['JWT_SECRET'],
                algorithm='HS256'
            )
            return jsonify({'token': token}), 200
        else:
            return jsonify({'error': 'Invalid email or password'}), 401

    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

    finally:
        conn.close()

if __name__ == '__main__':
    app.run(port=5000)
