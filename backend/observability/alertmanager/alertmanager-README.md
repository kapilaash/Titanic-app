# Alertmanager README

## Purpose

Alertmanager receives alerts from Prometheus and routes them.

In this project, Alertmanager helps detect and report:

```txt
Backend down
Tate API down
Meilisearch down
Grafana down
Pyroscope down
Prometheus target down
High API latency
Backend exceptions
Tate errors
Prediction endpoint errors
```

Prometheus decides when an alert should fire. Alertmanager receives that alert, groups it, deduplicates it, and sends it to a receiver.

---

## Access

```txt
http://localhost:9093
```

---

## Important Concept

Alertmanager does **not** monitor services by itself.

Correct flow:

```txt
Prometheus scrapes metrics
        ↓
Prometheus evaluates alert rules
        ↓
Prometheus sends firing alerts
        ↓
Alertmanager groups/routes alerts
        ↓
Flask webhook receives alert payload
```

---

## Docker Compose Service

```yaml
alertmanager:
  image: prom/alertmanager:latest
  container_name: titanic-alertmanager
  command:
    - "--config.file=/etc/alertmanager/alertmanager.yml"
    - "--storage.path=/alertmanager"
    - "--web.external-url=http://localhost:9093"
  ports:
    - "9093:9093"
  volumes:
    - ./observability/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
    - alertmanager_data:/alertmanager
  networks:
    - titanic_observability
```

Volume:

```yaml
volumes:
  alertmanager_data:
```

---

## Alertmanager Config Location

Place config here:

```txt
backend/observability/alertmanager/alertmanager.yml
```

This path matters because your compose file is inside:

```txt
backend/docker-compose.observability.yml
```

---

## Flask Webhook Endpoint

Your backend should expose:

```txt
POST /api/observability/alerts
```

This endpoint receives Alertmanager payloads and logs them in the Flask terminal.

Example output:

```txt
ALERTMANAGER_WEBHOOK {"status":"firing","alert_count":2}
```

---

## Recommended Prometheus Alert Rules

### Backend down

```promql
probe_success{instance="http://host.docker.internal:5000/api/health"} == 0
```

### Tate API down

```promql
probe_success{instance="http://host.docker.internal:5000/api/copilot/health"} == 0
```

### Meilisearch down

```promql
probe_success{instance="http://meilisearch:7700/health"} == 0
```

### High backend latency

```promql
rate(flask_http_request_duration_seconds_sum[2m])
/
rate(flask_http_request_duration_seconds_count[2m])
> 1
```

### Tate errors

```promql
increase(tate_copilot_errors_total[5m]) > 0
```

### Prediction errors

```promql
increase(titanic_prediction_errors_total[5m]) > 0
```

---

## Grafana Panels for Alertmanager

### 1. Active Alerts Table

Query:

```promql
ALERTS{alertstate="firing"}
```

Visualization:

```txt
Table
```

Benefit:
Shows exactly what is broken now.

### 2. Alert Count by Severity

Query:

```promql
sum by (severity) (
  ALERTS{alertstate="firing"}
)
```

Visualization:

```txt
Bar chart
```

Benefit:
Separates critical issues from warnings.

### 3. Alert Count by Layer

Query:

```promql
sum by (layer) (
  ALERTS{alertstate="firing"}
)
```

Visualization:

```txt
Bar chart
```

Benefit:
Shows which layer is failing: backend, search, AI, ML, observability, profiling.

### 4. Alertmanager Webhook Count

Query:

```promql
increase(titanic_alertmanager_webhooks_total[1h])
```

Visualization:

```txt
Time series
```

Benefit:
Confirms Alertmanager is sending alerts to Flask.

---

## How to Test Alertmanager

### 1. Stop Meilisearch

```bash
docker stop titanic-meilisearch
```

Wait 30–60 seconds.

Check Prometheus alerts:

```txt
http://localhost:9090/alerts
```

Check Alertmanager:

```txt
http://localhost:9093
```

Check Flask terminal for:

```txt
ALERTMANAGER_WEBHOOK
```

### 2. Restart Meilisearch

```bash
docker start titanic-meilisearch
```

Alert should resolve.

---

