from flask import Blueprint, request, jsonify
from app.services.llm_service import generate_text

generate_bp = Blueprint('generate', __name__)

@generate_bp.route('/generate', methods=['POST'])
def generate():
    data = request.get_json()
    if 'query' not in data or 'prompt' not in data:
        return jsonify({'error': 'Missing query or prompt'}), 400

    response = generate_text(data['query'], data['prompt'])
    return jsonify({'response': response}), 200
