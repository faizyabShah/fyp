import sqlite3
import os
from app.config import Config

def get_db_connection():
    """Establish a connection to the SQLite database."""
    os.makedirs(os.path.dirname(Config.DATABASE_PATH), exist_ok=True)  # Ensure directory exists
    conn = sqlite3.connect(Config.DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database if it doesn't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY, 
            password BLOB, 
            name TEXT, 
            phone TEXT,
            language TEXT,
            address TEXT
        )
    ''')

    # Fields table (Associated with a User)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS fields (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            name TEXT,
            coordinates TEXT NOT NULL,  -- Store as JSON string
            crop TEXT NOT NULL,
            plantation_date TEXT NOT NULL,  -- Store as ISO date string
            FOREIGN KEY(user_email) REFERENCES users(email) ON DELETE CASCADE
        )
    ''')

    # Requests table (Associated with a User and a Field)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            field_id INTEGER NOT NULL,
            requested_date TEXT NOT NULL, -- Store as ISO date string
            status TEXT CHECK( status IN ('pending', 'approved', 'rejected') ) DEFAULT 'pending',
            date_for_flight TEXT NOT NULL, -- Date for flight as ISO date string
            FOREIGN KEY(user_email) REFERENCES users(email) ON DELETE CASCADE,
            FOREIGN KEY(field_id) REFERENCES fields(id) ON DELETE CASCADE
        )
    ''')

    conn.commit()
    conn.close()
    print("✅ Database initialized successfully!")
