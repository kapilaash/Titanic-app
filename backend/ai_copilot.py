# ai_copilot.py
import os
import re
import traceback
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from observability import get_observability, normalize_metric_label


@dataclass
class RetrievalResult:
    title: str
    text: str
    kind: str
    score: Optional[float] = None
    source: str = "local"
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "text": self.text,
            "kind": self.kind,
            "score": self.score,
            "source": self.source,
            "metadata": self.metadata or {},
        }


class TitanicAICopilot:
    """
    Hybrid analytics copilot with Meilisearch as the primary passenger/name search layer.

    Runtime complexity notes:
    - Meilisearch passenger lookup: handled by search engine index; does not scan dataframe in Flask.
    - Exact pandas analytics: O(n) over Titanic rows. n=891, so this is trivial.
    - Semantic RAG fallback: O(n*d) in memory, where d is embedding dimension. Fine for 891 rows.
    - Startup indexing: O(n) document creation + embedding/index creation.
    """

    def __init__(self, df: pd.DataFrame):
        print("Initializing TitanicAICopilot: Meilisearch-primary hybrid RAG")
        self.df = self._prepare_dataframe(df)
        self.current_context = "dashboard"
        self.conversation_history: List[Dict[str, Any]] = []
        self.last_passengers: List[Dict[str, Any]] = []

        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.embedding_model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

        self.meili_url = os.getenv("MEILI_URL", "http://127.0.0.1:7700")
        self.meili_key = os.getenv("MEILI_MASTER_KEY", "")
        self.meili_index_name = os.getenv("MEILI_INDEX", "passengers")
        self.meili_primary = os.getenv("MEILI_PRIMARY", "true").lower() == "true"
        self.meili_client = None
        self.meili_index = None
        self.meili_available = False

        self.groq_enabled = bool(self.groq_api_key)
        self.gemini_enabled = bool(self.gemini_api_key)

        self.setup_knowledge_base()
        self.setup_app_guide()
        self.build_local_documents()
        self.init_meilisearch()
        self.build_semantic_index()

        print("TitanicAICopilot ready")

    # ------------------------------------------------------------------
    # Serialization / normalization
    # ------------------------------------------------------------------

    @staticmethod
    def jsonable(obj: Any) -> Any:
        if isinstance(obj, dict):
            return {str(k): TitanicAICopilot.jsonable(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple, set)):
            return [TitanicAICopilot.jsonable(v) for v in obj]
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

    @staticmethod
    def normalize_text(text: Any) -> str:
        text = "" if text is None else str(text).lower()
        text = re.sub(r"[^a-z0-9\s]", " ", text)
        return re.sub(r"\s+", " ", text).strip()

    @staticmethod
    def safe_float(value: Any, default: float = 0.0) -> float:
        try:
            if pd.isna(value):
                return default
            return float(value)
        except Exception:
            return default

    @staticmethod
    def safe_int(value: Any, default: int = 0) -> int:
        try:
            if pd.isna(value):
                return default
            return int(value)
        except Exception:
            return default

    @staticmethod
    def survival_label(value: Any) -> str:
        try:
            return "Survived" if int(value) == 1 else "Did not survive"
        except Exception:
            return "Unknown"

    def _prepare_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        clean = df.copy()
        required = [
            "PassengerId", "Survived", "Pclass", "Name", "Sex", "Age", "SibSp",
            "Parch", "Ticket", "Fare", "Cabin", "Embarked"
        ]
        for col in required:
            if col not in clean.columns:
                clean[col] = np.nan

        for col in ["PassengerId", "Survived", "Pclass", "Age", "SibSp", "Parch", "Fare"]:
            clean[col] = pd.to_numeric(clean[col], errors="coerce")

        clean["PassengerId"] = clean["PassengerId"].fillna(0).astype(int)
        clean["Survived"] = clean["Survived"].fillna(0).astype(int)
        clean["Pclass"] = clean["Pclass"].fillna(3).astype(int)
        clean["Age"] = clean["Age"].fillna(clean["Age"].median())
        clean["Fare"] = clean["Fare"].fillna(clean["Fare"].median())
        clean["SibSp"] = clean["SibSp"].fillna(0).astype(int)
        clean["Parch"] = clean["Parch"].fillna(0).astype(int)

        clean["Name"] = clean["Name"].fillna("Unknown Passenger").astype(str)
        clean["Sex"] = clean["Sex"].fillna("unknown").astype(str).str.lower()
        clean["Embarked"] = clean["Embarked"].fillna("S").astype(str)
        clean["Ticket"] = clean["Ticket"].fillna("Unknown").astype(str)
        clean["Cabin"] = clean["Cabin"].fillna("Unknown").astype(str)

        clean["Title"] = clean["Name"].str.extract(r" ([A-Za-z]+)\.", expand=False).fillna("Other")
        title_map = {
            "Mr": "Mr", "Miss": "Miss", "Mrs": "Mrs", "Master": "Master",
            "Dr": "Officer", "Rev": "Officer", "Col": "Officer", "Major": "Officer",
            "Mlle": "Miss", "Ms": "Miss", "Lady": "Royalty", "Countess": "Royalty",
            "Don": "Royalty", "Dona": "Royalty", "Mme": "Mrs", "Sir": "Royalty",
            "Jonkheer": "Royalty", "Capt": "Officer"
        }
        clean["Title"] = clean["Title"].map(title_map).fillna("Other")
        clean["FamilySize"] = clean["SibSp"] + clean["Parch"] + 1
        clean["IsAlone"] = (clean["FamilySize"] == 1).astype(int)
        clean["normalized_name"] = clean["Name"].apply(self.normalize_text)
        return clean

    # ------------------------------------------------------------------
    # Knowledge base
    # ------------------------------------------------------------------

    def setup_knowledge_base(self) -> None:
        df = self.df

        def rate(mask: pd.Series) -> float:
            subset = df[mask]
            return 0.0 if subset.empty else float(subset["Survived"].mean() * 100)

        self.stats = {
            "overall": {
                "passengers": int(len(df)),
                "survivors": int((df["Survived"] == 1).sum()),
                "non_survivors": int((df["Survived"] == 0).sum()),
                "survival_rate": float(df["Survived"].mean() * 100),
                "average_age": float(df["Age"].mean()),
                "average_fare": float(df["Fare"].mean()),
                "male_count": int((df["Sex"] == "male").sum()),
                "female_count": int((df["Sex"] == "female").sum()),
                "first_class": int((df["Pclass"] == 1).sum()),
                "second_class": int((df["Pclass"] == 2).sum()),
                "third_class": int((df["Pclass"] == 3).sum()),
            },
            "survival_by": {
                "class": {1: rate(df["Pclass"] == 1), 2: rate(df["Pclass"] == 2), 3: rate(df["Pclass"] == 3)},
                "gender": {"male": rate(df["Sex"] == "male"), "female": rate(df["Sex"] == "female")},
            },
            "model_info": {
                "model_type": "Random Forest",
                "endpoint": "/api/regression/survival",
            }
        }

    def setup_app_guide(self) -> None:
        self.app_features = {
            "dashboard": "Command overview of Titanic survival metrics, system status, and product story.",
            "analysis": "EDA section for correlations, feature analysis, and survival breakdowns.",
            "regression": "ML lab for Random Forest performance, feature importance, diagnostics, and predictions.",
            "data": "Data explorer for passenger-level search, server-side sorting, and record lookup.",
            "copilot": "Tate AI copilot for backend-aware assistance and passenger retrieval.",
            "engineering": "Build Story section explaining architecture, observability, and product workflow.",
        }

    # ------------------------------------------------------------------
    # Document creation
    # ------------------------------------------------------------------

    def passenger_record_dict(self, row: pd.Series) -> Dict[str, Any]:
        return {
            "id": int(row["PassengerId"]),
            "PassengerId": int(row["PassengerId"]),
            "Name": str(row["Name"]),
            "normalized_name": str(row["normalized_name"]),
            "Sex": str(row["Sex"]),
            "Age": float(row["Age"]),
            "Pclass": int(row["Pclass"]),
            "SibSp": int(row["SibSp"]),
            "Parch": int(row["Parch"]),
            "FamilySize": int(row["FamilySize"]),
            "Ticket": str(row["Ticket"]),
            "Fare": float(row["Fare"]),
            "Cabin": str(row["Cabin"]),
            "Embarked": str(row["Embarked"]),
            "Title": str(row["Title"]),
            "Survived": int(row["Survived"]),
            "SurvivalStatus": self.survival_label(row["Survived"]),
        }

    def row_to_text(self, row: pd.Series, prefix: str = "Passenger record") -> str:
        return (
            f"{prefix}\n"
            f"PassengerId: {int(row['PassengerId'])}\n"
            f"Name: {row['Name']}\n"
            f"Sex: {row['Sex']}\n"
            f"Age: {float(row['Age']):.2f}\n"
            f"Pclass: {int(row['Pclass'])}\n"
            f"SibSp: {int(row['SibSp'])}\n"
            f"Parch: {int(row['Parch'])}\n"
            f"FamilySize: {int(row['FamilySize'])}\n"
            f"Ticket: {row['Ticket']}\n"
            f"Fare: {float(row['Fare']):.4f}\n"
            f"Cabin: {row['Cabin']}\n"
            f"Embarked: {row['Embarked']}\n"
            f"Title: {row['Title']}\n"
            f"Survived: {int(row['Survived'])} ({self.survival_label(row['Survived'])})"
        )

    def build_local_documents(self) -> None:
        self.documents: List[RetrievalResult] = []
        for _, row in self.df.iterrows():
            self.documents.append(RetrievalResult(
                title=f"Passenger {int(row['PassengerId'])}: {row['Name']}",
                text=self.row_to_text(row),
                kind="passenger",
                source="dataframe",
                metadata={"PassengerId": int(row["PassengerId"]), "Name": str(row["Name"])}
            ))

        s = self.stats
        aggregate_text = (
            f"Website/app summary. This Titanic analytics website has {s['overall']['passengers']} passengers. "
            f"It provides exploratory data analysis, survival statistics, passenger-level search, "
            f"Random Forest machine learning predictions, feature importance, and an AI copilot. "
            f"Overall survival rate: {s['overall']['survival_rate']:.1f}%. "
            f"Female survival: {s['survival_by']['gender']['female']:.1f}%. "
            f"Male survival: {s['survival_by']['gender']['male']:.1f}%."
        )
        self.documents.append(RetrievalResult("Website help", aggregate_text, "app_help", source="system"))
        self.documents.append(RetrievalResult(
            "Dataset overview",
            f"Titanic dataset overview: {s['overall']['passengers']} passengers, "
            f"{s['overall']['survivors']} survivors, {s['overall']['non_survivors']} non-survivors, "
            f"average age {s['overall']['average_age']:.2f}, average fare {s['overall']['average_fare']:.2f}.",
            "aggregate",
            source="system"
        ))

    # ------------------------------------------------------------------
    # Meilisearch primary search
    # ------------------------------------------------------------------

    def init_meilisearch(self) -> None:
        if not self.meili_primary:
            print("Meilisearch disabled by MEILI_PRIMARY=false")
            return

        try:
            import meilisearch
            self.meili_client = meilisearch.Client(self.meili_url, self.meili_key or None)
            self.meili_client.health()
            self.meili_index = self.meili_client.index(self.meili_index_name)

            docs = [self.passenger_record_dict(row) for _, row in self.df.iterrows()]
            task = self.meili_index.add_documents(docs, primary_key="id")
            self._wait_for_meili_task(task)

            for update_call, payload in [
                (self.meili_index.update_searchable_attributes, ["Name", "normalized_name", "PassengerId", "Ticket", "Cabin"]),
                (self.meili_index.update_filterable_attributes, ["Sex", "Pclass", "Survived", "Embarked", "Title"]),
                (self.meili_index.update_sortable_attributes, ["Age", "Fare", "PassengerId", "Pclass"]),
                (self.meili_index.update_displayed_attributes, [
                    "PassengerId", "Name", "Sex", "Age", "Pclass", "SibSp", "Parch", "FamilySize",
                    "Ticket", "Fare", "Cabin", "Embarked", "Title", "Survived", "SurvivalStatus"
                ]),
            ]:
                task = update_call(payload)
                self._wait_for_meili_task(task)

            settings_task = self.meili_index.update_typo_tolerance({
                "enabled": True,
                "minWordSizeForTypos": {"oneTypo": 4, "twoTypos": 8}
            })
            self._wait_for_meili_task(settings_task)

            self.meili_available = True
            print(f"Meilisearch ready at {self.meili_url}, index={self.meili_index_name}, docs={len(docs)}")
        except Exception as e:
            self.meili_available = False
            print(f"Meilisearch unavailable. Passenger fuzzy search will be limited. Reason: {e}")

    def _wait_for_meili_task(self, task_response: Any) -> None:
        """Wait for Meilisearch async task, compatible with several SDK response shapes."""
        try:
            task_uid = None
            if isinstance(task_response, dict):
                task_uid = task_response.get("taskUid") or task_response.get("uid")
            else:
                task_uid = getattr(task_response, "task_uid", None) or getattr(task_response, "uid", None)
            if task_uid is not None and self.meili_client:
                self.meili_client.wait_for_task(task_uid, timeout_in_ms=10000, interval_in_ms=100)
        except Exception:
            # Do not fail app startup for a wait helper issue; search endpoint will reveal availability.
            pass


    def ensure_meili_connection(self, force_reindex: bool = False) -> bool:
        """
        Reconnect to Meilisearch automatically when startup timing causes the
        first connection attempt to fail.

        This prevents Tate from staying permanently in `meilisearch unavailable`
        mode when Meilisearch becomes ready after Flask has already started.
        """
        if self.meili_available and self.meili_index is not None and not force_reindex:
            try:
                if self.meili_client is not None:
                    self.meili_client.health()
                return True
            except Exception as e:
                print(f"Existing Meilisearch connection became unhealthy: {e}")
                self.meili_available = False
                self.meili_index = None

        if not self.meili_primary:
            return False

        try:
            import meilisearch

            self.meili_client = meilisearch.Client(self.meili_url, self.meili_key or None)
            self.meili_client.health()
            self.meili_index = self.meili_client.index(self.meili_index_name)

            if force_reindex:
                docs = [self.passenger_record_dict(row) for _, row in self.df.iterrows()]
                task = self.meili_index.add_documents(docs, primary_key="id")
                self._wait_for_meili_task(task)

                for update_call, payload in [
                    (self.meili_index.update_searchable_attributes, ["Name", "normalized_name", "PassengerId", "Ticket", "Cabin"]),
                    (self.meili_index.update_filterable_attributes, ["Sex", "Pclass", "Survived", "Embarked", "Title"]),
                    (self.meili_index.update_sortable_attributes, ["Age", "Fare", "PassengerId", "Pclass"]),
                    (self.meili_index.update_displayed_attributes, [
                        "PassengerId", "Name", "Sex", "Age", "Pclass", "SibSp", "Parch", "FamilySize",
                        "Ticket", "Fare", "Cabin", "Embarked", "Title", "Survived", "SurvivalStatus"
                    ]),
                ]:
                    task = update_call(payload)
                    self._wait_for_meili_task(task)

                settings_task = self.meili_index.update_typo_tolerance({
                    "enabled": True,
                    "minWordSizeForTypos": {"oneTypo": 4, "twoTypos": 8}
                })
                self._wait_for_meili_task(settings_task)

            self.meili_available = True
            print(f"Meilisearch connected at {self.meili_url}, index={self.meili_index_name}")
            return True

        except Exception as e:
            self.meili_available = False
            self.meili_index = None
            print(f"Meilisearch reconnect failed: {e}")
            return False


    def meili_passenger_search(self, query: str, limit: int = 5, filters: Optional[str] = None) -> List[RetrievalResult]:
        observability = get_observability()
        if observability:
            observability.meilisearch_search_requests.inc()

        if not self.ensure_meili_connection():
            if observability:
                observability.meilisearch_search_failures.inc()
            return []

        try:
            options: Dict[str, Any] = {
                "limit": limit,
                "attributesToRetrieve": [
                    "PassengerId", "Name", "Sex", "Age", "Pclass", "SibSp", "Parch", "FamilySize",
                    "Ticket", "Fare", "Cabin", "Embarked", "Title", "Survived", "SurvivalStatus"
                ],
                "showRankingScore": True,
                "matchingStrategy": "all",
            }
            if filters:
                options["filter"] = filters

            result = self.meili_index.search(query, options)
            hits = result.get("hits", []) if isinstance(result, dict) else getattr(result, "hits", [])

            docs: List[RetrievalResult] = []
            for hit in hits:
                text = self.hit_to_text(hit)
                docs.append(RetrievalResult(
                    title=f"Meilisearch passenger match: {hit.get('Name')}",
                    text=text,
                    kind="passenger",
                    score=hit.get("_rankingScore"),
                    source="meilisearch",
                    metadata={"PassengerId": hit.get("PassengerId"), "Name": hit.get("Name")}
                ))
            return docs
        except Exception as e:
            observability = get_observability()
            if observability:
                observability.meilisearch_search_failures.inc()
            print(f"Meilisearch query failed: {e}")
            return []

    def hit_to_text(self, hit: Dict[str, Any]) -> str:
        return (
            "Passenger record from Meilisearch\n"
            f"PassengerId: {hit.get('PassengerId')}\n"
            f"Name: {hit.get('Name')}\n"
            f"Sex: {hit.get('Sex')}\n"
            f"Age: {hit.get('Age')}\n"
            f"Pclass: {hit.get('Pclass')}\n"
            f"SibSp: {hit.get('SibSp')}\n"
            f"Parch: {hit.get('Parch')}\n"
            f"FamilySize: {hit.get('FamilySize')}\n"
            f"Ticket: {hit.get('Ticket')}\n"
            f"Fare: {hit.get('Fare')}\n"
            f"Cabin: {hit.get('Cabin')}\n"
            f"Embarked: {hit.get('Embarked')}\n"
            f"Title: {hit.get('Title')}\n"
            f"Survived: {hit.get('Survived')} ({hit.get('SurvivalStatus')})"
        )

    # ------------------------------------------------------------------
    # Semantic index for RAG context
    # ------------------------------------------------------------------

    def build_semantic_index(self) -> None:
        self.embedding_backend = "none"
        self.embedding_model = None
        self.embeddings = None
        self.vectorizer = None
        self.corpus = [d.text for d in self.documents]
        try:
            from sentence_transformers import SentenceTransformer
            self.embedding_model = SentenceTransformer(self.embedding_model_name)
            self.embeddings = self.embedding_model.encode(self.corpus, normalize_embeddings=True, show_progress_bar=False)
            self.embedding_backend = "sentence-transformers"
            print(f"Semantic index ready: {len(self.corpus)} docs")
        except Exception as e:
            print(f"Sentence-transformers unavailable; TF-IDF fallback. Reason: {e}")
            from sklearn.feature_extraction.text import TfidfVectorizer
            self.vectorizer = TfidfVectorizer(lowercase=True, stop_words="english", ngram_range=(1, 2))
            self.embeddings = self.vectorizer.fit_transform(self.corpus)
            self.embedding_backend = "tfidf"

    def semantic_search(self, query: str, top_k: int = 5) -> List[RetrievalResult]:
        try:
            if self.embedding_backend == "sentence-transformers":
                q = self.embedding_model.encode([query], normalize_embeddings=True, show_progress_bar=False)[0]
                scores = np.dot(self.embeddings, q)
            else:
                from sklearn.metrics.pairwise import cosine_similarity
                qv = self.vectorizer.transform([query])
                scores = cosine_similarity(qv, self.embeddings)[0]
            top = np.argsort(scores)[-top_k:][::-1]
            results: List[RetrievalResult] = []
            for idx in top:
                original = self.documents[int(idx)]
                results.append(RetrievalResult(
                    title=original.title,
                    text=original.text,
                    kind=original.kind,
                    score=float(scores[int(idx)]),
                    source=f"semantic_{self.embedding_backend}",
                    metadata=original.metadata
                ))
            return results
        except Exception as e:
            print(f"Semantic search failed: {e}")
            return []

    # ------------------------------------------------------------------
    # Intent routing
    # ------------------------------------------------------------------

    def classify_intent(self, question: str) -> str:
        q = self.normalize_text(question)
        if q in {"hi", "hello", "hey"}:
            return "greeting"
        if any(p in q for p in ["what this website", "what does this website", "what thiis website", "how to use", "help", "what can i do"]):
            return "app_help"
        if self.last_passengers and any(p in q for p in [
            "their age", "their ages", "what is their age", "what s their age", "how old are they",
            "their sex", "their gender", "their class", "their fare", "their ticket", "their cabin",
            "did they survive", "who survived", "which survived", "what about them", "these passengers", "those passengers"
        ]):
            return "follow_up"
        if any(p in q for p in ["model accuracy", "accuracy", "feature importance", "important feature", "most important feature", "random forest", "model performance"]):
            return "model_info"
        if any(p in q for p in ["predict", "prediction", "would survive", "survive if"]):
            return "prediction"
        if any(p in q for p in ["how many", "count", "average", "mean", "survival rate", "highest fare", "lowest fare", "oldest", "youngest"]):
            return "eda"
        if any(p in q for p in ["tell about", "tell me about", "age of", "sex of", "passenger id", "name of", "details of"]):
            return "passenger_lookup"
        # Short queries in data context are usually passenger search.
        if self.current_context == "data" and len(q.split()) <= 4:
            return "passenger_lookup"
        return "rag"

    def extract_search_query(self, question: str) -> str:
        q = question.strip()
        patterns = [
            r"tell\s+(?:me\s+)?about\s+(.+)$",
            r"details\s+of\s+(.+)$",
            r"age\s+of\s+(.+)$",
            r"sex\s+of\s+(.+)$",
            r"passenger\s*id\s+of\s+(.+)$",
            r"name\s+of\s+(.+)$",
        ]
        for pattern in patterns:
            m = re.search(pattern, q, flags=re.IGNORECASE)
            if m:
                return m.group(1).strip(" ?.!")
        return q.strip(" ?.!")

    # ------------------------------------------------------------------
    # Exact analytics layer
    # ------------------------------------------------------------------

    def answer_eda_exact(self, question: str) -> Optional[Dict[str, Any]]:
        q = self.normalize_text(question)
        df = self.df

        if "highest fare" in q or "most expensive" in q or "paid the highest" in q:
            row = df.loc[df["Fare"].idxmax()]
            return self.answer_from_text(
                f"The passenger with the highest fare was **{row['Name']}**. Fare: **{row['Fare']:.2f}**. "
                f"PassengerId: **{int(row['PassengerId'])}**. Survival: **{self.survival_label(row['Survived'])}**.",
                "eda_exact"
            )

        if "lowest fare" in q or "cheapest" in q:
            row = df.loc[df["Fare"].idxmin()]
            return self.answer_from_text(
                f"The lowest fare was paid by **{row['Name']}**. Fare: **{row['Fare']:.2f}**. "
                f"PassengerId: **{int(row['PassengerId'])}**. Survival: **{self.survival_label(row['Survived'])}**.",
                "eda_exact"
            )

        if "oldest" in q:
            subset = df[df["Survived"] == 1] if "survivor" in q or "survived" in q else df
            row = subset.loc[subset["Age"].idxmax()]
            label = "oldest survivor" if ("survivor" in q or "survived" in q) else "oldest passenger"
            return self.answer_from_text(
                f"The **{label}** was **{row['Name']}**, age **{row['Age']:.1f}**. "
                f"PassengerId: **{int(row['PassengerId'])}**. Survival: **{self.survival_label(row['Survived'])}**.",
                "eda_exact"
            )

        if "youngest" in q:
            subset = df[df["Survived"] == 1] if "survivor" in q or "survived" in q else df
            row = subset.loc[subset["Age"].idxmin()]
            label = "youngest survivor" if ("survivor" in q or "survived" in q) else "youngest passenger"
            return self.answer_from_text(
                f"The **{label}** was **{row['Name']}**, age **{row['Age']:.2f}**. "
                f"PassengerId: **{int(row['PassengerId'])}**. Survival: **{self.survival_label(row['Survived'])}**.",
                "eda_exact"
            )

        if "survival rate" in q:
            if "female" in q or "women" in q:
                val = self.stats["survival_by"]["gender"]["female"]
                return self.answer_from_text(f"Female passengers had a survival rate of **{val:.1f}%**.", "eda_exact")
            if "male" in q or "men" in q:
                val = self.stats["survival_by"]["gender"]["male"]
                return self.answer_from_text(f"Male passengers had a survival rate of **{val:.1f}%**.", "eda_exact")
            return self.answer_from_text(f"The overall survival rate was **{self.stats['overall']['survival_rate']:.1f}%**.", "eda_exact")

        if "how many" in q or "count" in q or "number of" in q:
            mask = pd.Series(True, index=df.index)
            filters = []
            if "female" in q or "women" in q:
                mask &= df["Sex"] == "female"; filters.append("female")
            if "male" in q or "men" in q:
                mask &= df["Sex"] == "male"; filters.append("male")
            if "first class" in q or "1st class" in q:
                mask &= df["Pclass"] == 1; filters.append("first class")
            if "second class" in q or "2nd class" in q:
                mask &= df["Pclass"] == 2; filters.append("second class")
            if "third class" in q or "3rd class" in q:
                mask &= df["Pclass"] == 3; filters.append("third class")
            if "survived" in q or "survivor" in q:
                mask &= df["Survived"] == 1; filters.append("survived")
            if "died" in q or "not survive" in q or "dead" in q:
                mask &= df["Survived"] == 0; filters.append("did not survive")
            if "child" in q or "children" in q:
                mask &= df["Age"] < 18; filters.append("children under 18")
            count = int(mask.sum())
            if filters:
                return self.answer_from_text(f"There are **{count}** passengers matching: {', '.join(filters)}.", "eda_exact")
            return self.answer_from_text(f"The dataset contains **{len(df)}** passengers.", "eda_exact")

        return None

    def answer_from_text(self, text: str, source: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return {"type": "direct_answer", "response": text, "confidence": "high", "source": source, "data": data}

    # ------------------------------------------------------------------
    # Retrieval orchestration
    # ------------------------------------------------------------------

    def retrieve_for_question(self, question: str, intent: str, top_k: int = 8) -> List[RetrievalResult]:
        observability = get_observability()
        if observability:
            observability.tate_retrieval_requests.labels(intent=normalize_metric_label(intent, "unknown")).inc()
        docs: List[RetrievalResult] = []

        if intent == "passenger_lookup":
            search_query = self.extract_search_query(question)
            # Primary path: Meilisearch. This is where typo tolerance should happen.
            docs.extend(self.meili_passenger_search(search_query, limit=top_k))
            if docs:
                return docs

            # Deterministic fallback only when Meilisearch is unavailable/no hits.
            # No fuzzy RapidFuzz and no substring guessing that returns Lennon for Alen.
            docs.extend(self.exact_dataframe_name_search(search_query, limit=top_k))
            return docs

        if intent == "app_help":
            return [d for d in self.documents if d.kind == "app_help"]

        docs.extend(self.semantic_search(question, top_k=top_k))
        return docs

    def exact_dataframe_name_search(self, query: str, limit: int = 5) -> List[RetrievalResult]:
        q = self.normalize_text(query)
        if not q:
            return []
        results: List[RetrievalResult] = []
        # Exact token/prefix fallback only. This avoids bad fuzzy guesses when Meili is off.
        for _, row in self.df.iterrows():
            name_norm = row["normalized_name"]
            if q == name_norm or name_norm.startswith(q) or q in name_norm.split():
                results.append(RetrievalResult(
                    title=f"Dataframe exact match: {row['Name']}",
                    text=self.row_to_text(row),
                    kind="passenger",
                    source="dataframe_exact_fallback",
                    metadata={"PassengerId": int(row["PassengerId"]), "Name": row["Name"]}
                ))
                if len(results) >= limit:
                    break
        return results

    def format_context(self, docs: List[RetrievalResult]) -> str:
        if not docs:
            return "No relevant context was retrieved."
        return "\n\n".join([f"[Source {i}: {d.title} | {d.source}]\n{d.text}" for i, d in enumerate(docs, 1)])

    # ------------------------------------------------------------------
    # LLMs
    # ------------------------------------------------------------------

    def query_groq(self, prompt: str) -> str:
        if not self.groq_enabled:
            return ""
        try:
            from groq import Groq
            client = Groq(api_key=self.groq_api_key)
            res = client.chat.completions.create(
                model=self.groq_model,
                messages=[
                    {"role": "system", "content": "You are a concise Titanic analytics copilot. Use only provided context."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=450,
            )
            return res.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq failed: {e}")
            return ""

    def query_gemini(self, prompt: str) -> str:
        if not self.gemini_enabled:
            return ""
        try:
            from google import genai
            client = genai.Client(api_key=self.gemini_api_key)
            res = client.models.generate_content(model=self.gemini_model, contents=prompt)
            return res.text.strip() if res.text else ""
        except Exception as e:
            print(f"Gemini failed: {e}")
            return ""

    def build_prompt(self, question: str, docs: List[RetrievalResult]) -> str:
        return f"""
Use only the retrieved context to answer.
Do not invent passengers or facts.
If there are multiple matching passengers, list them clearly.
If the user typed a misspelled name and Meilisearch returned close matches, say "closest matches".
Keep the answer concise and useful.
- Do not use markdown tables.
- Use short paragraphs or bullet points preferably numbered.
- If multiple passengers are returned, list each passenger separately.
- Keep each passenger record compact.
- Use this format:

1. Name
Passenger ID: ...
Age: ...
Sex: ...
Class: ...
Fare: ...
Survival: ...

Retrieved context:
{self.format_context(docs)}

Question:
{question}

Answer:
""".strip()

    # ------------------------------------------------------------------
    # Follow-up and local model intelligence
    # ------------------------------------------------------------------

    def _parse_passenger_text(self, passenger_doc: Dict[str, Any]) -> Dict[str, str]:
        """Convert a stored passenger retrieval result back into a small field dictionary."""
        parsed: Dict[str, str] = {}
        text = str(passenger_doc.get("text", ""))
        for line in text.splitlines():
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            parsed[key.strip()] = value.strip()

        metadata = passenger_doc.get("metadata") or {}
        if metadata.get("Name") and "Name" not in parsed:
            parsed["Name"] = str(metadata.get("Name"))
        if metadata.get("PassengerId") and "PassengerId" not in parsed:
            parsed["PassengerId"] = str(metadata.get("PassengerId"))
        return parsed

    def answer_followup_from_last_passengers(self, question: str) -> Dict[str, Any]:
        if not self.last_passengers:
            return self.answer_from_text(
                "I do not have a previous passenger result to reference. Search for a passenger first, then ask a follow-up.",
                "follow_up_no_memory",
            )

        q = self.normalize_text(question)
        field = None
        label = None
        if "age" in q or "old" in q:
            field, label = "Age", "Age"
        elif "sex" in q or "gender" in q:
            field, label = "Sex", "Sex"
        elif "class" in q:
            field, label = "Pclass", "Class"
        elif "fare" in q or "ticket price" in q:
            field, label = "Fare", "Fare"
        elif "ticket" in q:
            field, label = "Ticket", "Ticket"
        elif "cabin" in q:
            field, label = "Cabin", "Cabin"
        elif "survive" in q or "survived" in q or "survival" in q:
            field, label = "Survived", "Survival"

        lines: List[str] = []
        for index, passenger_doc in enumerate(self.last_passengers[:8], start=1):
            passenger = self._parse_passenger_text(passenger_doc)
            name = passenger.get("Name", passenger_doc.get("title", f"Passenger {index}"))
            passenger_id = passenger.get("PassengerId", "Unknown")

            if field:
                value = passenger.get(field, "Unknown")
                if field == "Survived" and "(" in value:
                    value = value.split("(", 1)[1].rstrip(")")
                lines.append(f"{index}. **{name}** — Passenger ID: {passenger_id}; {label}: **{value}**")
            else:
                lines.append(
                    f"{index}. **{name}**\n"
                    f"Passenger ID: {passenger_id}\n"
                    f"Age: {passenger.get('Age', 'Unknown')}\n"
                    f"Sex: {passenger.get('Sex', 'Unknown')}\n"
                    f"Class: {passenger.get('Pclass', 'Unknown')}\n"
                    f"Fare: {passenger.get('Fare', 'Unknown')}\n"
                    f"Survival: {passenger.get('Survived', 'Unknown')}"
                )

        return self.answer_from_text(
            "Here are the details from the previous passenger result:\n\n" + "\n".join(lines),
            "follow_up_memory",
            {"last_passenger_count": len(self.last_passengers)},
        )

    def answer_model_info_exact(self, question: str) -> Dict[str, Any]:
        """Compute lightweight Random Forest metrics directly from the active dataframe."""
        try:
            from sklearn.ensemble import RandomForestClassifier
            from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
            from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split

            df = self.df.copy()
            df["Sex_encoded"] = (df["Sex"] == "female").astype(int)
            df["Embarked_encoded"] = df["Embarked"].astype("category").cat.codes
            df["Title_encoded"] = df["Title"].astype("category").cat.codes
            df["IsChild"] = (df["Age"] < 12).astype(int)
            df["IsRich"] = ((df["Pclass"] == 1) & (df["Fare"] > 50)).astype(int)
            features = [
                "Pclass", "Age", "SibSp", "Parch", "Fare", "Sex_encoded", "Embarked_encoded",
                "Title_encoded", "FamilySize", "IsAlone", "IsChild", "IsRich",
            ]
            X = df[features]
            y = df["Survived"].astype(int)
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
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
            pred = model.predict(X_test)

            accuracy = accuracy_score(y_test, pred)
            precision = precision_score(y_test, pred, zero_division=0)
            recall = recall_score(y_test, pred, zero_division=0)
            f1 = f1_score(y_test, pred, zero_division=0)
            importance = sorted(zip(features, model.feature_importances_), key=lambda item: item[1], reverse=True)[:5]
            feature_lines = "\n".join([f"- {name}: {score:.3f}" for name, score in importance])
            cv_line = f" Cross-validation mean: **{float(np.mean(cv_scores)) * 100:.1f}%**." if len(cv_scores) else ""

            return self.answer_from_text(
                "The active Random Forest model reports:\n\n"
                f"- Accuracy: **{accuracy * 100:.1f}%**\n"
                f"- Precision: **{precision * 100:.1f}%**\n"
                f"- Recall: **{recall * 100:.1f}%**\n"
                f"- F1 score: **{f1 * 100:.1f}%**\n"
                f"-{cv_line}\n\n"
                "Top feature importance signals:\n"
                f"{feature_lines}",
                "model_info_exact",
                {
                    "accuracy": accuracy,
                    "precision": precision,
                    "recall": recall,
                    "f1_score": f1,
                    "top_features": [{"feature": name, "importance": float(score)} for name, score in importance],
                },
            )
        except Exception as e:
            print(f"Model info computation failed: {e}")
            return self.answer_from_text(
                "The model diagnostics are available in the ML Insights section through `/api/regression/survival`.",
                "model_info_unavailable",
            )

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    def answer_question(self, question: str) -> Dict[str, Any]:
        print(f"Question: {question} | context={self.current_context}")
        intent = self.classify_intent(question)

        self.conversation_history.append({"role": "user", "content": question, "intent": intent, "time": datetime.now().isoformat()})

        if intent == "greeting":
            s = self.stats["overall"]
            return self.answer_from_text(
                f"Hello. This Titanic analytics app contains **{s['passengers']} passengers** and the overall survival rate is **{s['survival_rate']:.1f}%**. Ask about passengers, EDA, ML predictions, survival patterns, fares, age, or class.",
                "greeting"
            )

        if intent == "app_help":
            return self.answer_from_text(
                "This website is an **AI-powered Titanic intelligence platform**. It lets users explore passenger data, view EDA charts and survival patterns, run Random Forest survival predictions, search passenger records with Meilisearch, and ask Tate AI questions grounded in backend data.",
                "app_help"
            )

        if intent == "follow_up":
            return self.answer_followup_from_last_passengers(question)

        if intent == "model_info":
            return self.answer_model_info_exact(question)

        if intent == "eda":
            exact = self.answer_eda_exact(question)
            if exact:
                return exact

        if intent == "prediction":
            return self.answer_from_text(
                "Use the Prediction section or `/api/regression/predict` to run the trained Random Forest model. Example input: Sex=female, Pclass=1, Age=25, Fare=100.",
                "prediction_help"
            )

        docs = self.retrieve_for_question(question, intent, top_k=8)
        if docs and intent == "passenger_lookup":
            self.last_passengers = [d.to_dict() for d in docs if d.kind == "passenger"]

        if not docs:
            if intent == "passenger_lookup" and not self.meili_available:
                return self.answer_from_text(
                    "I could not find that passenger. Meilisearch is currently unavailable, so typo-tolerant search is disabled. Start Meilisearch and try again.",
                    "no_match_meili_unavailable",
                    {"meilisearch_available": False}
                )
            return self.answer_from_text("The dataset context does not contain enough information to answer that question.", "no_context")

        prompt = self.build_prompt(question, docs)
        response = self.query_groq(prompt) or self.query_gemini(prompt)
        if not response:
            response = self.format_local_answer(question, docs)

        sources = [d.to_dict() for d in docs]
        return {
            "type": "hybrid_ai_response",
            "response": response,
            "confidence": "high" if docs else "low",
            "source": "meilisearch_primary_rag" if any(d.source == "meilisearch" for d in docs) else "hybrid_rag",
            "data": {
                "intent": intent,
                "meilisearch_available": self.meili_available,
                "semantic_backend": self.embedding_backend,
                "sources": self.jsonable(sources),
            }
        }

    def format_local_answer(self, question: str, docs: List[RetrievalResult]) -> str:
        lines = []
        for doc in docs[:5]:
            if doc.kind == "passenger":
                meta = doc.metadata or {}
                lines.append(f"**{meta.get('Name', doc.title)}**\n{doc.text}")
            else:
                lines.append(doc.text)
        return "\n\n".join(lines)

    def set_context(self, context: str) -> None:
        context = str(context or "dashboard").strip().lower()
        self.current_context = context if context in self.app_features else "dashboard"

    def get_suggestions(self) -> List[str]:
        return {
            "dashboard": ["What does this website do?", "What was the overall survival rate?", "How many passengers were in first class?"],
            "analysis": ["Compare male and female survival rate.", "Who paid the highest fare?", "How many children survived?"],
            "regression": ["What is the model accuracy?", "Which features are most important?", "Predict survival for female in 1st class."],
            "data": ["Tell about Allen", "Tell about Alen", "What are their ages?"],
            "engineering": ["Explain the backend architecture.", "How does Meilisearch work here?", "What does observability track?"],
            "copilot": ["Tell about Allen", "What is the model accuracy?", "What can Tate answer?"],
        }.get(self.current_context, ["What does this website do?"])

    def get_quick_actions(self, context: str) -> List[Dict[str, str]]:
        context = str(context or self.current_context).lower()
        common = [
            {"icon": "🔎", "label": "Search Allen", "action": "ask:Tell about Alen", "type": "analysis"},
            {"icon": "📊", "label": "Survival Rate", "action": "ask:What was the survival rate?", "type": "statistics"},
            {"icon": "🤖", "label": "Prediction", "action": "navigate:regression", "type": "navigation"},
            {"icon": "🏠", "label": "Help", "action": "ask:What does this website do?", "type": "explanation"},
        ]
        if context == "regression":
            return [
                {"icon": "🎯", "label": "Accuracy", "action": "ask:What is the model accuracy?", "type": "model_info"},
                {"icon": "✦", "label": "Top Features", "action": "ask:Which features are most important?", "type": "model_info"},
                {"icon": "🧑‍✈️", "label": "Prediction", "action": "navigate:regression", "type": "prediction"},
                {"icon": "🏠", "label": "Help", "action": "ask:What does this website do?", "type": "explanation"},
            ]
        if context == "engineering":
            return [
                {"icon": "⚙️", "label": "Architecture", "action": "ask:Explain the backend architecture.", "type": "explanation"},
                {"icon": "📡", "label": "Observability", "action": "ask:What does observability track?", "type": "explanation"},
                {"icon": "🔎", "label": "Search Layer", "action": "ask:How does Meilisearch work here?", "type": "analysis"},
                {"icon": "📊", "label": "Dashboard", "action": "navigate:dashboard", "type": "navigation"},
            ]
        return common

    def predict_survival(self, passenger_info: Dict[str, Any]) -> Dict[str, Any]:
        sex = str(passenger_info.get("Sex", "female")).lower()
        pclass = self.safe_int(passenger_info.get("Pclass", 3), 3)
        age = self.safe_float(passenger_info.get("Age", 30), 30)
        fare = self.safe_float(passenger_info.get("Fare", 32), 32)
        prob = 50.0
        prob += self.stats["survival_by"]["gender"].get(sex, 50) - 50
        prob += self.stats["survival_by"]["class"].get(pclass, 50) - 50
        if age < 12:
            prob += 10
        if fare > 100:
            prob += 8
        prob = max(5, min(95, prob))
        return {"prediction": 1 if prob >= 50 else 0, "probability": round(prob, 1), "note": "Copilot estimate. Use ML endpoint for Random Forest prediction."}
