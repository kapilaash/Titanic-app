# copilot_routes.py
from datetime import datetime
import traceback
from flask import Blueprint, jsonify, request
from observability import get_observability, time_metric

copilot_bp = Blueprint("copilot", __name__, url_prefix="/api/copilot")
copilot = None


def init_copilot(cleaned_df):
    global copilot
    from ai_copilot import TitanicAICopilot
    copilot = TitanicAICopilot(cleaned_df)
    print("AI Copilot initialized")


def not_ready_response():
    if copilot is None:
        return jsonify({"error": "Copilot not initialized"}), 500
    return None


@copilot_bp.route("/chat", methods=["POST"])
def chat():
    try:
        nr = not_ready_response()
        if nr:
            return nr

        data = request.get_json(silent=True) or {}
        question = ""
        for key in ["question", "query", "text", "message"]:
            val = data.get(key)
            if isinstance(val, str) and val.strip():
                question = val.strip()
                break

        if not question:
            return jsonify({"error": "No question provided"}), 400

        context = data.get("context", "dashboard")
        observability = get_observability()

        if observability:
            observability.tate_requests.labels(context=context).inc()

        copilot.set_context(context)

        if observability:
            with time_metric(observability.tate_answer_latency, context):
                answer = copilot.answer_question(question)
        else:
            answer = copilot.answer_question(question)

        suggestions = [
            {"text": s, "action": f"ask:{s}", "type": "suggestion"}
            for s in copilot.get_suggestions()[:3]
        ]

        return jsonify({
            "question": question,
            "response": answer.get("response", "I cannot answer that right now."),
            "type": answer.get("type", "hybrid_ai_response"),
            "confidence": answer.get("confidence", "medium"),
            "source": answer.get("source", "unknown"),
            "data": answer.get("data"),
            "suggestions": suggestions,
            "context": context,
            "timestamp": datetime.now().isoformat(),
        })
    except Exception as e:
        observability = get_observability()
        if observability:
            observability.tate_errors.labels(context="unknown").inc()
        print(traceback.format_exc())
        return jsonify({"error": f"Copilot error: {str(e)}"}), 500


@copilot_bp.route("/search", methods=["POST"])
def search_debug():
    try:
        nr = not_ready_response()
        if nr:
            return nr
        data = request.get_json(silent=True) or {}
        question = data.get("question", "")
        intent = copilot.classify_intent(question)
        docs = copilot.retrieve_for_question(question, intent, top_k=8)
        return jsonify({
            "question": question,
            "intent": intent,
            "meilisearch_available": copilot.meili_available,
            "results": copilot.jsonable([d.to_dict() for d in docs]),
            "timestamp": datetime.now().isoformat(),
        })
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@copilot_bp.route("/meili/reindex", methods=["POST"])
def reindex_meili():
    try:
        nr = not_ready_response()
        if nr:
            return nr
        if hasattr(copilot, "ensure_meili_connection"):
            copilot.ensure_meili_connection(force_reindex=True)
        else:
            copilot.init_meilisearch()
        return jsonify({
            "message": "Meilisearch reconnect/reindex attempted",
            "meilisearch_available": copilot.meili_available,
            "index": copilot.meili_index_name,
            "timestamp": datetime.now().isoformat(),
        })
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@copilot_bp.route("/predict", methods=["POST"])
def predict():
    try:
        nr = not_ready_response()
        if nr:
            return nr
        data = request.get_json(silent=True) or {}
        return jsonify({"prediction": copilot.predict_survival(data), "timestamp": datetime.now().isoformat()})
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@copilot_bp.route("/suggestions", methods=["GET"])
def suggestions():
    try:
        nr = not_ready_response()
        if nr:
            return nr
        context = request.args.get("context", "dashboard")
        copilot.set_context(context)
        return jsonify({"context": context, "suggestions": copilot.get_suggestions(), "timestamp": datetime.now().isoformat()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@copilot_bp.route("/quick-actions", methods=["GET"])
def quick_actions():
    try:
        nr = not_ready_response()
        if nr:
            return nr
        context = request.args.get("context", "dashboard")
        return jsonify({"context": context, "actions": copilot.get_quick_actions(context), "timestamp": datetime.now().isoformat()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@copilot_bp.route("/set-context", methods=["POST"])
def set_context():
    try:
        nr = not_ready_response()
        if nr:
            return nr
        data = request.get_json(silent=True) or {}
        context = data.get("context", "dashboard")
        copilot.set_context(context)
        return jsonify({"context": copilot.current_context, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@copilot_bp.route("/clear-memory", methods=["POST"])
def clear_memory():
    """
    Clears Tate's backend conversation state.

    It resets only follow-up context and conversation memory.
    Dataset, Meilisearch, semantic index, and app context are preserved.
    Complexity: O(1), because small memory lists are replaced directly.
    """
    try:
        nr = not_ready_response()
        if nr:
            return nr

        copilot.conversation_history = []
        copilot.last_passengers = []

        return jsonify({
            "success": True,
            "message": "Tate backend memory cleared",
            "memory": {
                "conversation_messages": 0,
                "last_passengers": 0,
            },
            "timestamp": datetime.now().isoformat(),
        })
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@copilot_bp.route("/stats", methods=["GET"])
def stats():
    try:
        nr = not_ready_response()
        if nr:
            return nr
        return jsonify({"statistics": copilot.jsonable(copilot.stats), "timestamp": datetime.now().isoformat()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@copilot_bp.route("/health", methods=["GET"])
def health():
    if copilot and hasattr(copilot, "ensure_meili_connection"):
        copilot.ensure_meili_connection()
    return jsonify({
        "status": "active" if copilot else "inactive",
        "groq": "available" if copilot and copilot.groq_enabled else "unavailable",
        "gemini": "available" if copilot and copilot.gemini_enabled else "unavailable",
        "meilisearch": "available" if copilot and copilot.meili_available else "unavailable",
        "meili_url": copilot.meili_url if copilot else None,
        "meili_index": copilot.meili_index_name if copilot else None,
        "semantic_backend": copilot.embedding_backend if copilot else None,
        "dataset_size": int(len(copilot.df)) if copilot else 0,
        "document_count": int(len(copilot.documents)) if copilot else 0,
        "context": copilot.current_context if copilot else "none",
        "timestamp": datetime.now().isoformat(),
    })
