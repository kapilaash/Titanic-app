# app.py
from dotenv import load_dotenv
load_dotenv()

import os
import traceback
from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split

from copilot_routes import copilot_bp, init_copilot
from observability import init_observability, time_metric
from supabase_client import get_supabase

app = Flask(__name__)
origins = os.getenv("CORS_ORIGINS", "*")
if origins != "*":
    origins = [x.strip() for x in origins.split(",") if x.strip()]
CORS(app, resources={r"/api/*": {"origins": origins}})

observability = init_observability(app)

TITANIC_TABLE = os.getenv("SUPABASE_TITANIC_TABLE", "Project_1")
_MODEL_CACHE: Optional[Dict[str, Any]] = None


# -----------------------------------------------------------------------------
# JSON / data helpers
# -----------------------------------------------------------------------------

def jsonable(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {str(k): jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [jsonable(v) for v in obj]
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32)):
        return None if np.isnan(obj) else float(obj)
    if isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    if isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    try:
        if pd.isna(obj):
            return None
    except Exception:
        pass
    return obj


def safe_mode(series: pd.Series, default: Any) -> Any:
    mode = series.dropna().mode()
    return default if mode.empty else mode.iloc[0]


def load_data() -> pd.DataFrame:
    try:
        supabase = get_supabase()
        response = supabase.table(TITANIC_TABLE).select("*").execute()
        if not response.data:
            raise RuntimeError("No rows returned from Supabase")
        print(f"Loaded {len(response.data)} rows from Supabase table {TITANIC_TABLE}")
        return pd.DataFrame(response.data)
    except Exception as e:
        print(f"Supabase loading failed: {e}")
        print("Falling back to local train.csv")
        if not os.path.exists("train.csv"):
            raise FileNotFoundError("Supabase failed and train.csv was not found")
        return pd.read_csv("train.csv")


def clean_titanic_data(df: pd.DataFrame) -> pd.DataFrame:
    clean = df.copy()
    required = [
        "PassengerId", "Survived", "Pclass", "Name", "Sex", "Age", "SibSp",
        "Parch", "Ticket", "Fare", "Cabin", "Embarked",
    ]
    for col in required:
        if col not in clean.columns:
            clean[col] = np.nan

    for col in ["PassengerId", "Survived", "Pclass", "Age", "SibSp", "Parch", "Fare"]:
        clean[col] = pd.to_numeric(clean[col], errors="coerce")

    clean["PassengerId"] = clean["PassengerId"].fillna(0).astype(int)
    clean["Survived"] = clean["Survived"].fillna(0).astype(int)
    clean["Pclass"] = clean["Pclass"].fillna(safe_mode(clean["Pclass"], 3)).astype(int)
    clean["Age"] = clean["Age"].fillna(clean["Age"].median())
    clean["Fare"] = clean["Fare"].fillna(clean["Fare"].median())
    clean["SibSp"] = clean["SibSp"].fillna(0).astype(int)
    clean["Parch"] = clean["Parch"].fillna(0).astype(int)
    clean["Name"] = clean["Name"].fillna("Unknown Passenger").astype(str)
    clean["Sex"] = clean["Sex"].fillna("unknown").astype(str).str.lower()
    clean["Ticket"] = clean["Ticket"].fillna("Unknown").astype(str)
    clean["Cabin"] = clean["Cabin"].fillna("Unknown").astype(str)
    clean["Embarked"] = clean["Embarked"].fillna(safe_mode(clean["Embarked"], "S")).astype(str)

    clean["Title"] = clean["Name"].str.extract(r" ([A-Za-z]+)\.", expand=False).fillna("Other")
    title_map = {
        "Mr": "Mr", "Miss": "Miss", "Mrs": "Mrs", "Master": "Master",
        "Dr": "Officer", "Rev": "Officer", "Col": "Officer", "Major": "Officer",
        "Mlle": "Miss", "Ms": "Miss", "Lady": "Royalty", "Countess": "Royalty",
        "Don": "Royalty", "Dona": "Royalty", "Mme": "Mrs", "Sir": "Royalty",
        "Jonkheer": "Royalty", "Capt": "Officer",
    }
    clean["Title"] = clean["Title"].map(title_map).fillna("Other")
    clean["FamilySize"] = clean["SibSp"] + clean["Parch"] + 1
    clean["IsAlone"] = (clean["FamilySize"] == 1).astype(int)

    clean = clean.drop(columns=[c for c in ["id", "created_at"] if c in clean.columns])
    print(f"Cleaned data shape: {clean.shape}")
    return clean


raw_df = load_data()
cleaned_df = clean_titanic_data(raw_df)
init_copilot(cleaned_df)
app.register_blueprint(copilot_bp)


# -----------------------------------------------------------------------------
# Base API endpoints
# -----------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "shape": list(cleaned_df.shape),
        "columns": list(cleaned_df.columns),
        "source_table": TITANIC_TABLE,
    })


@app.route("/api/info", methods=["GET"])
def info():
    return jsonify({
        "columns": list(cleaned_df.columns),
        "shape": list(cleaned_df.shape),
        "missing_values": jsonable(cleaned_df.isna().sum().to_dict()),
        "data_types": cleaned_df.dtypes.astype(str).to_dict(),
    })


@app.route("/api/data/schema", methods=["GET"])
def data_schema():
    return jsonify({
        "columns": list(cleaned_df.columns),
        "sortable_columns": [
            "PassengerId", "Name", "Title", "Sex", "Age", "Pclass", "Ticket",
            "Cabin", "Embarked", "Fare", "SibSp", "Parch", "FamilySize", "IsAlone", "Survived",
        ],
        "searchable_columns": [
            "PassengerId", "Name", "Title", "Sex", "Age", "Pclass", "Ticket",
            "Cabin", "Embarked", "Fare", "SibSp", "Parch", "FamilySize", "IsAlone", "Survived",
        ],
        "total_records": int(len(cleaned_df)),
    })


# -----------------------------------------------------------------------------
# Search / sort / pagination for Data Explorer
# -----------------------------------------------------------------------------

def pandas_search(search: str) -> pd.DataFrame:
    query = str(search).strip().lower()
    if not query:
        return cleaned_df.copy()

    searchable_cols = [
        "PassengerId", "Name", "Title", "Sex", "Age", "Pclass", "Ticket",
        "Cabin", "Embarked", "Fare", "SibSp", "Parch", "FamilySize",
        "IsAlone", "Survived",
    ]
    existing_cols = [col for col in searchable_cols if col in cleaned_df.columns]

    # O(n*c) fallback. For 891 Titanic rows this is trivial. Meilisearch is used first.
    mask = cleaned_df[existing_cols].astype(str).apply(
        lambda row: row.str.lower().str.contains(query, na=False, regex=False).any(),
        axis=1,
    )
    return cleaned_df[mask].copy()


def search_with_meilisearch(search: str, limit: int = 1000) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    query = str(search).strip()
    meta: Dict[str, Any] = {
        "engine": "none" if not query else "pandas_fallback",
        "meilisearch_available": False,
        "query": query,
        "ranking_preserved": False,
    }

    if not query:
        return cleaned_df.copy(), meta

    try:
        from copilot_routes import copilot

        if copilot and hasattr(copilot, "ensure_meili_connection"):
            copilot.ensure_meili_connection()

        if copilot and copilot.meili_available:
            docs = copilot.meili_passenger_search(query, limit=limit)
            meta["engine"] = "meilisearch"
            meta["meilisearch_available"] = True
            meta["hits"] = len(docs)

            passenger_ids = [
                int(doc.metadata.get("PassengerId"))
                for doc in docs
                if doc.metadata and doc.metadata.get("PassengerId") is not None
            ]

            if not passenger_ids:
                return cleaned_df.iloc[0:0].copy(), meta

            result = cleaned_df[cleaned_df["PassengerId"].isin(passenger_ids)].copy()
            order_map = {pid: idx for idx, pid in enumerate(passenger_ids)}
            result["_search_order"] = result["PassengerId"].map(order_map)
            meta["ranking_preserved"] = True
            return result.sort_values("_search_order").drop(columns=["_search_order"]), meta
    except Exception as e:
        print(f"Meilisearch table search failed, falling back to pandas search: {e}")
        meta["meilisearch_error"] = str(e)

    result = pandas_search(query)
    meta["hits"] = int(len(result))
    return result, meta


def sort_dataframe(df: pd.DataFrame, sort_by: str, sort_dir: str) -> pd.DataFrame:
    if not sort_by or sort_by not in df.columns:
        return df

    ascending = str(sort_dir).lower() != "desc"
    try:
        return df.sort_values(by=sort_by, ascending=ascending, na_position="last", kind="mergesort")
    except Exception:
        return df.sort_values(
            by=sort_by,
            key=lambda col: col.astype(str).str.lower(),
            ascending=ascending,
            na_position="last",
            kind="mergesort",
        )


@app.route("/api/data", methods=["GET"])
def data():
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 10, type=int), 1), 100)
    search = request.args.get("search", "", type=str).strip()
    sort_by = request.args.get("sort_by", "", type=str).strip()
    sort_dir = request.args.get("sort_dir", "asc", type=str).strip().lower()
    if sort_dir not in {"asc", "desc"}:
        sort_dir = "asc"

    if search:
        result_df, search_meta = search_with_meilisearch(search, limit=1000)
    else:
        result_df = cleaned_df.copy()
        search_meta = {"engine": "none", "meilisearch_available": False, "query": "", "hits": int(len(result_df))}

    # Sorting is deliberately applied after searching. This gives deterministic full-dataset sorting
    # for the current search result set rather than only sorting the visible page.
    result_df = sort_dataframe(result_df, sort_by, sort_dir)

    total_records = int(len(result_df))
    total_pages = int((total_records + per_page - 1) // per_page) if total_records else 1
    page = min(page, total_pages)
    start = (page - 1) * per_page
    end = start + per_page

    return jsonify({
        "data": jsonable(result_df.iloc[start:end].to_dict("records")),
        "total_records": total_records,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "search": search,
        "sort_by": sort_by,
        "sort_dir": sort_dir,
        "search_meta": search_meta,
    })


@app.route("/api/data/count", methods=["GET"])
def data_count():
    return jsonify({"total_records": int(len(cleaned_df))})


@app.route("/api/head", methods=["GET"])
def head():
    return jsonify(jsonable(cleaned_df.head(20).to_dict("records")))


@app.route("/api/summary", methods=["GET"])
def summary():
    return jsonify(jsonable(cleaned_df.describe(include="all").to_dict()))


@app.route("/api/survival_rates", methods=["GET"])
def survival_rates():
    rates = {
        "by_class": cleaned_df.groupby("Pclass")["Survived"].mean().to_dict(),
        "by_sex": cleaned_df.groupby("Sex")["Survived"].mean().to_dict(),
        "by_embarked": cleaned_df.groupby("Embarked")["Survived"].mean().to_dict(),
        "by_title": cleaned_df.groupby("Title")["Survived"].mean().to_dict(),
    }
    return jsonify(jsonable(rates))


@app.route("/api/correlation", methods=["GET"])
def correlation():
    return jsonify(jsonable(cleaned_df.select_dtypes(include=[np.number]).corr().to_dict()))


# -----------------------------------------------------------------------------
# ML endpoints
# -----------------------------------------------------------------------------

def build_ml_dataset() -> Tuple[pd.DataFrame, pd.Series, list, pd.DataFrame]:
    df = cleaned_df.copy()
    for col in ["Survived", "Pclass", "Age", "SibSp", "Parch", "Fare"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["Survived"])
    df["Sex_encoded"] = (df["Sex"] == "female").astype(int)
    df["Embarked_encoded"] = df["Embarked"].astype("category").cat.codes
    df["Title_encoded"] = df["Title"].astype("category").cat.codes
    df["FamilySize"] = df["SibSp"] + df["Parch"] + 1
    df["IsAlone"] = (df["FamilySize"] == 1).astype(int)
    df["IsChild"] = (df["Age"] < 12).astype(int)
    df["IsRich"] = ((df["Pclass"] == 1) & (df["Fare"] > 50)).astype(int)

    features = [
        "Pclass", "Age", "SibSp", "Parch", "Fare", "Sex_encoded",
        "Embarked_encoded", "Title_encoded", "FamilySize", "IsAlone", "IsChild", "IsRich",
    ]
    return df[features], df["Survived"].astype(int), features, df


def get_trained_survival_model(force: bool = False) -> Dict[str, Any]:
    global _MODEL_CACHE
    if _MODEL_CACHE is not None and not force:
        return _MODEL_CACHE

    X, y, features, df = build_ml_dataset()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y,
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_split=3,
        max_features="sqrt",
        random_state=42,
        class_weight="balanced",
    )

    cv_scores = []
    if y_train.value_counts().min() >= 5:
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="accuracy")

    model.fit(X_train, y_train)
    test_pred = model.predict(X_test)
    train_pred = model.predict(X_train)
    test_prob = model.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, test_pred)
    train_accuracy = accuracy_score(y_train, train_pred)
    precision = precision_score(y_test, test_pred, zero_division=0)
    recall = recall_score(y_test, test_pred, zero_division=0)
    f1 = f1_score(y_test, test_pred, zero_division=0)
    cm = confusion_matrix(y_test, test_pred, labels=[0, 1])

    importance = {feature: float(value) for feature, value in zip(features, model.feature_importances_)}
    if observability:
        observability.model_accuracy.set(float(accuracy) * 100)
        for feature_name, importance_value in importance.items():
            observability.model_feature_importance.labels(feature=str(feature_name)).set(float(importance_value))

    _MODEL_CACHE = {
        "model": model,
        "features": features,
        "df": df,
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "test_pred": test_pred,
        "test_prob": test_prob,
        "metrics": {
            "accuracy": float(accuracy),
            "train_accuracy": float(train_accuracy),
            "overfitting_gap": float(train_accuracy - accuracy),
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "training_samples": int(len(X_train)),
            "testing_samples": int(len(X_test)),
            "model_type": "Random Forest Classifier",
            "feature_count": len(features),
            "cv_scores": [float(s) for s in cv_scores] if len(cv_scores) else [],
            "cv_mean": float(np.mean(cv_scores)) if len(cv_scores) else None,
            "cv_std": float(np.std(cv_scores)) if len(cv_scores) else None,
            "confusion_matrix": {
                "true_negative": int(cm[0][0]),
                "false_positive": int(cm[0][1]),
                "false_negative": int(cm[1][0]),
                "true_positive": int(cm[1][1]),
            },
        },
        "feature_importance": importance,
    }
    return _MODEL_CACHE


@app.route("/api/regression/survival", methods=["GET"])
def regression_survival():
    try:
        cache = get_trained_survival_model(force=request.args.get("refresh") == "true")
        X_test = cache["X_test"]
        y_test = cache["y_test"]
        test_pred = cache["test_pred"]
        test_prob = cache["test_prob"]
        df = cache["df"]
        metrics = cache["metrics"]
        importance = cache["feature_importance"]

        sample_predictions = []
        sample_count = min(10, len(X_test))
        sample_indices = list(X_test.index[:sample_count])
        for position, idx in enumerate(sample_indices):
            predicted_value = int(test_pred[position])
            actual_value = int(y_test.loc[idx])
            original_row = df.loc[idx]
            sample_predictions.append({
                "id": int(original_row.get("PassengerId", idx)),
                "predicted_survival": predicted_value == 1,
                "prediction": predicted_value,
                "prediction_label": "Survived" if predicted_value else "Did not survive",
                "actual_survival": actual_value == 1,
                "actual_label": "Survived" if actual_value else "Did not survive",
                "correct": predicted_value == actual_value,
                "survival_probability": float(test_prob[position]),
                "passenger_data": {
                    "PassengerId": int(original_row.get("PassengerId", 0)),
                    "Name": str(original_row.get("Name", "Unknown Passenger")),
                    "Pclass": int(original_row.get("Pclass", 0)),
                    "Age": float(original_row.get("Age", 0)),
                    "Sex": str(original_row.get("Sex", "unknown")),
                    "Fare": float(original_row.get("Fare", 0)),
                    "Title": str(original_row.get("Title", "Other")),
                    "Embarked": str(original_row.get("Embarked", "Unknown")),
                    "Survived": actual_value,
                },
            })

        return jsonify(jsonable({
            "model_performance": metrics,
            "cross_validation": {
                "scores": metrics.get("cv_scores", []),
                "mean": metrics.get("cv_mean"),
                "std": metrics.get("cv_std"),
            },
            "feature_importance": importance,
            "sample_predictions": sample_predictions,
            "status": "success",
        }))
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e), "status": "error"}), 500


@app.route("/api/regression/predict", methods=["GET", "POST"])
def regression_predict():
    if request.method == "GET":
        return jsonify({
            "message": "POST passenger data",
            "example": {
                "Sex": "female", "Pclass": 1, "Age": 25, "Fare": 100,
                "SibSp": 0, "Parch": 0, "Embarked": "S", "Title": "Miss",
            },
        })

    if observability:
        observability.prediction_requests.inc()

    try:
        with time_metric(observability.prediction_latency) if observability else _null_context():
            payload = request.get_json(silent=True) or {}
            cache = get_trained_survival_model()
            model = cache["model"]
            features = cache["features"]

            pclass = int(payload.get("Pclass", 3))
            age = float(payload.get("Age", cleaned_df["Age"].median()))
            sibsp = int(payload.get("SibSp", 0))
            parch = int(payload.get("Parch", 0))
            fare = float(payload.get("Fare", cleaned_df["Fare"].median()))
            sex = str(payload.get("Sex", "female")).lower()
            embarked = str(payload.get("Embarked", "S"))
            title = str(payload.get("Title", "Other"))

            # Keep encoding deterministic and lightweight. The model is simple and intended for demo inference.
            row = {
                "Pclass": pclass,
                "Age": age,
                "SibSp": sibsp,
                "Parch": parch,
                "Fare": fare,
                "Sex_encoded": 1 if sex == "female" else 0,
                "Embarked_encoded": pd.Series([embarked]).astype("category").cat.codes.iloc[0],
                "Title_encoded": pd.Series([title]).astype("category").cat.codes.iloc[0],
            }
            row["FamilySize"] = row["SibSp"] + row["Parch"] + 1
            row["IsAlone"] = int(row["FamilySize"] == 1)
            row["IsChild"] = int(row["Age"] < 12)
            row["IsRich"] = int(row["Pclass"] == 1 and row["Fare"] > 50)

            input_x = pd.DataFrame([[row[f] for f in features]], columns=features)
            prediction = int(model.predict(input_x)[0])
            probability = float(model.predict_proba(input_x)[0][1])
            prediction_label = "Survived" if prediction else "Did not survive"

            if observability:
                observability.prediction_outcomes.labels(prediction_label=prediction_label).inc()

            return jsonify(jsonable({
                "prediction": prediction,
                "prediction_label": prediction_label,
                "survival_probability": round(probability, 3),
                "confidence_percent": round(probability * 100, 1),
                "model_type": "Random Forest Classifier",
                "input_features": row,
            }))
    except Exception as e:
        if observability:
            observability.prediction_errors.inc()
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


class _null_context:
    def __enter__(self):
        return self
    def __exit__(self, exc_type, exc, tb):
        return False


def feature_analysis_payload() -> Dict[str, Any]:
    df = cleaned_df.copy()
    groups = []
    for feature in ["Pclass", "Sex", "Embarked", "Title", "FamilySize"]:
        grouped = df.groupby(feature)["Survived"].agg(["mean", "count"]).reset_index()
        entries = []
        for _, row in grouped.iterrows():
            entries.append({
                "group": str(row[feature]),
                "survival_rate": float(row["mean"]),
                "count": int(row["count"]),
            })
        best = max(entries, key=lambda x: x["survival_rate"]) if entries else None
        worst = min(entries, key=lambda x: x["survival_rate"]) if entries else None
        groups.append({
            "feature": feature,
            "feature_type": "categorical_or_discrete",
            "groups": entries,
            "best_group": best,
            "lowest_group": worst,
            "spread": float((best["survival_rate"] - worst["survival_rate"]) if best and worst else 0),
            # Backwards-compatible field for older frontend builds.
            "survival_by_group": {item["group"]: item["survival_rate"] for item in entries},
        })

    continuous = []
    for feature in ["Age", "Fare"]:
        continuous.append({
            "feature": feature,
            "feature_type": "continuous",
            "correlation_with_survival": float(df[feature].corr(df["Survived"])),
            "mean": float(df[feature].mean()),
            "median": float(df[feature].median()),
            "min": float(df[feature].min()),
            "max": float(df[feature].max()),
        })

    strongest_group = max(groups, key=lambda item: item["spread"]) if groups else None
    strongest_cont = max(continuous, key=lambda item: abs(item["correlation_with_survival"])) if continuous else None

    return {
        "summary": {
            "features_analyzed": len(groups) + len(continuous),
            "categorical_features": len(groups),
            "continuous_features": len(continuous),
            "strongest_group_feature": strongest_group["feature"] if strongest_group else None,
            "strongest_continuous_feature": strongest_cont["feature"] if strongest_cont else None,
        },
        "categorical": groups,
        "continuous": continuous,
        "insights": [
            {
                "title": "Strongest categorical separation",
                "value": strongest_group["feature"] if strongest_group else "N/A",
                "description": f"{strongest_group['feature']} creates a {strongest_group['spread'] * 100:.1f} percentage-point survival-rate spread."
                if strongest_group else "No categorical feature was available.",
            },
            {
                "title": "Strongest continuous signal",
                "value": strongest_cont["feature"] if strongest_cont else "N/A",
                "description": f"{strongest_cont['feature']} has correlation {strongest_cont['correlation_with_survival']:.3f} with survival."
                if strongest_cont else "No continuous feature was available.",
            },
        ],
        # Backwards-compatible top-level feature keys for older frontend builds.
        **{item["feature"]: item for item in groups},
        **{item["feature"]: item for item in continuous},
    }


@app.route("/api/regression/feature_analysis", methods=["GET"])
@app.route("/api/regression/feature-analysis", methods=["GET"])
def feature_analysis():
    try:
        return jsonify(jsonable(feature_analysis_payload()))
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
