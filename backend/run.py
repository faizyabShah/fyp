from flask import Flask
from flask_cors import CORS
from app.routes.auth import auth_bp
from app.routes.generate import generate_bp
from app.database import init_db  # Import the database initialization function

app = Flask(__name__)
CORS(app)

# Initialize the database before starting the server
init_db()

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(generate_bp)

if __name__ == '__main__':
    app.run(port=5000)
