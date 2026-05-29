# Pyroscope README

## Purpose

Pyroscope is used for continuous CPU profiling of the Flask backend.

In this project, Pyroscope helps identify which backend functions consume the most CPU during:

```txt
Tate AI answers
Meilisearch passenger search
Semantic retrieval
ML predictions
Data Explorer search/sort
Supabase/data loading
```

This is useful because Prometheus tells you **what is slow**, while Pyroscope helps reveal **why it is slow**.

---

## Access

```txt
http://localhost:4040
```

If Grafana has the Pyroscope datasource configured, you can also inspect profiles from Grafana.

---

## Backend Configuration

Your Flask backend should include Pyroscope initialization inside `backend/observability.py`.

Recommended environment variables:

```env
PYROSCOPE_ENABLED=true
PYROSCOPE_SERVER_ADDRESS=http://localhost:4040
PYROSCOPE_APPLICATION_NAME=titanic-intelligence-backend
PYROSCOPE_SAMPLE_RATE=100
APP_ENV=development
```

If the Flask backend runs inside Docker on the same Docker network as Pyroscope, use:

```env
PYROSCOPE_SERVER_ADDRESS=http://pyroscope:4040
```

If Flask runs directly on your Windows host/venv, use:

```env
PYROSCOPE_SERVER_ADDRESS=http://localhost:4040
```

---

## Docker Compose Service

Pyroscope service:

```yaml
pyroscope:
  image: grafana/pyroscope:latest
  container_name: titanic-pyroscope
  ports:
    - "4040:4040"
  command:
    - "server"
  volumes:
    - pyroscope_data:/var/lib/pyroscope
  networks:
    - titanic_observability
```

Volume:

```yaml
volumes:
  pyroscope_data:
```

---

## How to Verify Pyroscope

Start the stack:

```bash
docker compose -f docker-compose.observability.yml up -d pyroscope
```

Check readiness:

```bash
curl http://localhost:4040/ready
```

Expected:

```txt
ready
```

Check from Prometheus container:

```bash
docker exec -it titanic-prometheus wget -qO- http://pyroscope:4040/ready
```

---

## How to Generate Useful Profiles

Run your Flask backend:

```bash
python app.py
```

Then use the app:

```txt
1. Open Tate
2. Ask: What is the model accuracy?
3. Ask: Tell me about Allen
4. Search in Data Explorer
5. Run ML prediction
6. Sort Data Explorer columns
```

These actions create CPU activity that Pyroscope can profile.

---

## What to Look For

In Pyroscope, search for application:

```txt
titanic-intelligence-backend
```

Useful functions to inspect:

```txt
answer_question
retrieve_for_question
meili_passenger_search
predict_survival
search_with_meilisearch
sort_dataframe
build_ml_dataset
```

---

## Best Visualizations

### 1. Flame Graph

Best for:

```txt
Which function uses the most CPU?
```

Benefit:
Shows the full call stack and hotspots.

### 2. Timeline

Best for:

```txt
When did CPU usage increase?
```

Benefit:
Helps connect user actions to backend load.

### 3. Comparison View

Best for:

```txt
Was the backend faster before or after code changes?
```

Benefit:
Useful for optimization and portfolio demonstration.

---

## Best Build Story Wording

```txt
Pyroscope provides continuous CPU profiling for the backend. While Prometheus shows API latency and request volume, Pyroscope reveals which Python functions are responsible for backend workload during AI responses, search operations, and ML predictions.
```

---

## Troubleshooting

### Pyroscope UI does not show app

Check Flask terminal. You should see:

```txt
Pyroscope profiling enabled
```

If not, check:

```env
PYROSCOPE_ENABLED=true
PYROSCOPE_SERVER_ADDRESS=http://localhost:4040
```

### Pyroscope container is up but no profiles appear

Generate backend activity:

```txt
Ask Tate questions
Run predictions
Search passenger data
```

### Flask is inside Docker

Use:

```env
PYROSCOPE_SERVER_ADDRESS=http://pyroscope:4040
```

### Flask is outside Docker

Use:

```env
PYROSCOPE_SERVER_ADDRESS=http://localhost:4040
```
