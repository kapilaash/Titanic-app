# Titanic Observability - Complete Code

This zip contains complete replacement files for your backend plus the full observability stack.

## Copy these files

```txt
backend/app.py
backend/copilot_routes.py
backend/observability.py
backend/requirements-observability.txt
docker-compose.observability.yml
observability/
```

## Install backend dependencies

```bash
cd backend
pip install -r requirements-observability.txt
```

## Start your Flask backend

```bash
python app.py
```

Confirm these work:

```txt
http://localhost:5000/api/health
http://localhost:5000/metrics
http://localhost:5000/api/observability/health
```

## Start observability tools

From project root:

```bash
docker compose -f docker-compose.observability.yml up -d
```

## Open tools

```txt
Prometheus:    http://localhost:9090
Grafana:       http://localhost:3001
Alertmanager: http://localhost:9093
Pyroscope:    http://localhost:4040
Meilisearch:  http://localhost:7700
```

Grafana login:

```txt
admin / admin
```

## What is tracked

```txt
Prometheus:
- Flask API request rate
- Flask endpoint latency
- Flask exceptions
- Tate copilot request count
- Tate copilot errors
- ML prediction request count
- ML prediction errors
- Meilisearch search usage
- Prometheus health
- Grafana health
- Alertmanager health
- Pyroscope health
- Meilisearch health

Grafana:
- Auto-provisioned Prometheus datasource
- Auto-provisioned Pyroscope datasource
- Auto-provisioned Titanic observability dashboard

Alertmanager:
- Receives alerts from Prometheus
- Sends webhook alerts back to Flask at /api/observability/alerts

Pyroscope:
- Receives continuous profiling data from Flask through pyroscope-io
```

## Important note

Alertmanager does not independently monitor services. Prometheus evaluates alert rules and sends alerts to Alertmanager. This setup still checks Prometheus health from the same Prometheus process using blackbox probes, but a fully dead Prometheus cannot send its own alert. For true external monitoring, use a second Prometheus or uptime monitor.
