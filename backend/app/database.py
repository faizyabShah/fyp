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
            name TEXT NOT NULL UNIQUE,
            coordinates TEXT NOT NULL,  -- Store as JSON string
            crop TEXT NOT NULL,
            plantation_date TEXT NOT NULL,  -- Store as ISO date string,
            latest_uav_observation_date TEXT,
            latest_satellite_obeservation_date TEXT,  -- Store as ISO date string
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

    # Add this new table creation right after the existing table creations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS uav (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            field_id INTEGER NOT NULL,
            observation_date TEXT NOT NULL,  -- ISO date string for the observation date
            phenological_stages TEXT NOT NULL,  -- JSON array string storing detailed phenological stages
            field_image TEXT,
            field_overlay TEXT,
            FOREIGN KEY(field_id) REFERENCES fields(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS satellite (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            field_id INTEGER NOT NULL,
            observation_date TEXT NOT NULL,  -- ISO date string for the observation date
            phenological_stages TEXT NOT NULL,  -- JSON array string storing detailed phenological stages
            uav_image TEXT,
            uav_overlay TEXT,
            FOREIGN KEY(field_id) REFERENCES fields(id) ON DELETE CASCADE
        )
    ''')


    conn.commit()
    conn.close()
    print("✅ Database initialized successfully!")
