# Grafana README

## Access

```txt
http://localhost:3001
admin/admin
```

Create:

```txt
Dashboard → New → Add Visualization
```

Datasource:

```txt
Prometheus
```

---

# Dashboard 1: Platform Health

Panels:

## Backend Health

Visualization:

```txt
Stat
```

Query:

```promql
probe_success{instance="http://host.docker.internal:5000/api/health"}
```

Benefit:
Instant backend status.

## Tate Health

```promql
probe_success{instance="http://host.docker.internal:5000/api/copilot/health"}
```

Benefit:
Checks Tate separately.

## Service Timeline

Visualization:

```txt
State Timeline
```

```promql
probe_success{job="service-health"}
```

Benefit:
Shows downtime and recovery.

---

# Dashboard 2: API Performance

## Request Rate

Visualization:

Time Series

```promql
sum by(path)(
rate(flask_http_request_total[1m])
)
```

Benefit:
Shows API usage.

## Top APIs

Visualization:

Bar chart

```promql
topk(10,
sum by(path)(
increase(flask_http_request_total[30m])
))
```

Benefit:
Most used endpoints.

## p95 latency

Visualization:

Time Series

```promql
histogram_quantile(
0.95,
sum by (le,path)(
rate(flask_http_request_duration_seconds_bucket[5m])
))
```

Benefit:
Detect slow routes.

---

# Dashboard 3: Tate Intelligence

## Tate requests

```promql
sum by(context)(
rate(tate_copilot_requests_total[1m])
)
```

Benefit:
Shows usage per page.

## Tate latency

```promql
histogram_quantile(
0.95,
sum by(le,context)(
rate(tate_answer_latency_seconds_bucket[5m])
))
```

Benefit:
AI response speed.

---

# Dashboard 4: ML and Search

## Prediction requests

```promql
rate(titanic_prediction_requests_total[1m])
```

## Search usage

```promql
rate(titanic_meilisearch_search_requests_total[1m])
```

Benefit:
ML + search activity.

---

# Dashboard 5: Exploration Journey

## Mission completion

Visualization:

Bar chart

```promql
sum by(task_id)(
increase(titanic_exploration_events_total[24h])
)
```

Benefit:
Tracks user engagement.

---

Recommended order:

1 Platform Health
2 API Performance
3 Tate Intelligence
4 ML/Search
5 Exploration Journey
6 Alerts
