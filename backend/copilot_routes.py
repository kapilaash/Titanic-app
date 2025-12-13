# copilot_routes.py
from flask import Blueprint, request, jsonify
from datetime import datetime
import json

# Create blueprint for copilot routes
copilot_bp = Blueprint('copilot', __name__, url_prefix='/api/copilot')

# Global copilot instance
copilot = None

def init_copilot(cleaned_df):
    """Initialize copilot with data"""
    global copilot
    from ai_copilot import TitanicAICopilot
    copilot = TitanicAICopilot(cleaned_df)
    print("🚀 AI Copilot initialized with Hugging Face integration!")

@copilot_bp.route('/chat', methods=['POST'])
def copilot_chat():
    """Main copilot chat endpoint - FIXED VERSION"""
    try:
        data = request.json
        print(f"📩 Received data: {data}")
        
        # Accept multiple field names for question
        question = ''
        if 'question' in data and data['question'].strip():
            question = data['question'].strip()
        elif 'query' in data and data['query'].strip():
            question = data['query'].strip()
        elif 'text' in data and data['text'].strip():
            question = data['text'].strip()
        
        context = data.get('context', 'dashboard')
        
        print(f"🤖 Question: {question}, Context: {context}")
        
        if not question:
            print("❌ No question provided")
            return jsonify({'error': 'No question provided'}), 400
        
        if not copilot:
            return jsonify({'error': 'Copilot not initialized'}), 500
        
        # Set context
        copilot.set_context(context)
        
        # Get answer from copilot
        answer = copilot.answer_question(question)
        print(f"✅ Answer type: {answer.get('type')}")
        
        # Get suggestions for follow-up
        suggestions = copilot.get_suggestions()
        
        # Format suggestions for frontend
        formatted_suggestions = []
        for suggestion in suggestions[:3]:  # Limit to 3 suggestions
            formatted_suggestions.append({
                'text': suggestion,
                'action': f'ask:{suggestion}',
                'type': 'suggestion'
            })
        
        # FIX: Extract the response from answer dict
        response_text = answer.get('response', 'I cannot answer that right now.')
        
        # If response is a dict (happens with fallback), extract the string
        if isinstance(response_text, dict):
            response_text = response_text.get('response', str(response_text))
        
        response_data = {
            'question': question,
            'response': response_text,  # Now it's a string, not a dict
            'type': answer.get('type', 'fallback'),
            'confidence': answer.get('confidence', 'medium'),
            'data': answer.get('data'),
            'suggestions': formatted_suggestions,
            'context': context,
            'timestamp': datetime.now().isoformat()
        }
        
        print(f"📤 Sending response: {response_data['type']}")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ Copilot error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Copilot error: {str(e)}'}), 500

@copilot_bp.route('/predict', methods=['POST'])
def predict_survival():
    """Predict survival for a passenger"""
    try:
        data = request.json
        print(f"🎯 Predicting survival for: {data}")
        
        if not copilot:
            return jsonify({'error': 'Copilot not initialized'}), 500
        
        # Get prediction
        prediction = copilot.predict_survival(data)
        
        return jsonify({
            'prediction': prediction,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

@copilot_bp.route('/suggestions', methods=['GET'])
def get_suggestions():
    """Get suggested questions for current context"""
    try:
        context = request.args.get('context', 'dashboard')
        
        if not copilot:
            return jsonify({'error': 'Copilot not initialized'}), 500
        
        copilot.set_context(context)
        suggestions = copilot.get_suggestions()
        
        return jsonify({
            'context': context,
            'suggestions': suggestions,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@copilot_bp.route('/quick-actions', methods=['GET'])
def get_quick_actions():
    """Get quick actions based on context"""
    try:
        context = request.args.get('context', 'dashboard')
        
        if not copilot:
            return jsonify({'error': 'Copilot not initialized'}), 500
        
        actions = copilot.get_quick_actions(context)
        
        return jsonify({
            'context': context,
            'actions': actions,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Quick actions error: {e}")
        return jsonify({'error': str(e)}), 500

@copilot_bp.route('/tour', methods=['GET'])
def get_tour():
    """Get tour steps for app onboarding"""
    try:
        tour_type = request.args.get('type', 'quick')
        
        tour_data = {
            'type': tour_type,
            'tour': {
                'steps': [
                    {
                        'step': 1, 
                        'section': "dashboard", 
                        'title': "Dashboard Overview", 
                        'description': "Start here to see key metrics, survival charts, and dataset insights at a glance."
                    },
                    {
                        'step': 2, 
                        'section': "analysis", 
                        'title': "Feature Analysis", 
                        'description': "Explore correlations between features and analyze survival patterns by demographics."
                    },
                    {
                        'step': 3, 
                        'section': "regression", 
                        'title': "ML Predictions", 
                        'description': "Try survival predictions with our AI model and see feature importance."
                    },
                    {
                        'step': 4, 
                        'section': "data", 
                        'title': "Data Explorer", 
                        'description': "Browse passenger records, filter data, and explore individual passenger details."
                    }
                ],
                'total_steps': 4,
                'estimated_time': '3 minutes'
            }
        }
        
        return jsonify(tour_data)
        
    except Exception as e:
        print(f"❌ Tour error: {e}")
        return jsonify({'error': str(e)}), 500

@copilot_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get dataset statistics"""
    try:
        if not copilot:
            return jsonify({'error': 'Copilot not initialized'}), 500
        
        return jsonify({
            'statistics': copilot.stats,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@copilot_bp.route('/set-context', methods=['POST'])
def set_context():
    """Update copilot context"""
    try:
        data = request.json
        context = data.get('context', 'dashboard')
        
        if not copilot:
            return jsonify({'error': 'Copilot not initialized'}), 500
        
        copilot.set_context(context)
        
        return jsonify({
            'context': context,
            'message': f'Context updated to {context}',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@copilot_bp.route('/health', methods=['GET'])
def copilot_health():
    """Check copilot status"""
    hf_status = 'available' if copilot and copilot.hf_token else 'unavailable'
    status = 'active' if copilot else 'inactive'
    
    return jsonify({
        'status': status,
        'huggingface': hf_status,
        'knowledge_base': 'loaded' if copilot else 'not loaded',
        'context': copilot.current_context if copilot else 'none',
        'dataset_size': len(copilot.df) if copilot else 0,
        'timestamp': datetime.now().isoformat()
    })