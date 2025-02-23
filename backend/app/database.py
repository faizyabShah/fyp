import sqlite3
import os
from app.config import Config

def get_db_connection():
    """Establish a connection to the SQLite database."""
    os.makedirs(os.path.dirname(Config.DATABASE_PATH), exist_ok=True)  # Ensure directory exists
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Allows column-based access
    return conn

def init_db():
    """Initialize the database if it doesn't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create table if it does not exist
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
    
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully!")
