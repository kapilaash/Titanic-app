# Prometheus README

## Access

```txt
http://localhost:9090
```

Prometheus uses PromQL for querying metrics.

---

# Health Queries

### All targets

```promql
up
```

Benefit:
Shows whether Prometheus can scrape each target.

### Health checks

```promql
probe_success
```

```promql
probe_success{job="service-health"}
```

Benefit:
Shows backend, Grafana, Tate, Alertmanager, Pyroscope and Meilisearch health.

### Health latency

```promql
probe_duration_seconds
```

Benefit:
Shows service response time.

---

# Flask API Queries

### Request count

```promql
flask_http_request_total
```

### Requests per second

```promql
sum by (path) (
 rate(flask_http_request_total[1m])
)
```

Benefit:
Shows heavily used endpoints.

### Request status

```promql
sum by (method,path,status)(
 rate(flask_http_request_total[1m])
)
```

Benefit:
Shows errors vs successful traffic.

### p95 latency

```promql
histogram_quantile(
0.95,
sum by (le,path)(
 rate(flask_http_request_duration_seconds_bucket[5m])
)
)
```

Benefit:
Shows slow APIs.

### Exceptions

```promql
increase(flask_http_request_exceptions_total[5m])
```

Benefit:
Shows backend failures.

---

# Tate Queries

### Total requests

```promql
tate_copilot_requests_total
```

### Usage by page

```promql
sum by (context)(
rate(tate_copilot_requests_total[1m])
)
```

### Tate errors

```promql
increase(tate_copilot_errors_total[5m])
```

### Tate latency

```promql
histogram_quantile(
0.95,
sum by (le,context)(
rate(tate_answer_latency_seconds_bucket[5m])
)
)
```

Benefit:
Track AI performance.

---

# ML Queries

```promql
rate(titanic_prediction_requests_total[1m])
```

Prediction usage

```promql
increase(titanic_prediction_errors_total[5m])
```

Prediction failures

```promql
sum by (prediction_label)(
increase(titanic_prediction_outcomes_total[1h])
)
```

Prediction outcomes

---

# Search Queries

```promql
rate(titanic_meilisearch_search_requests_total[1m])
```

Search activity

```promql
increase(titanic_meilisearch_search_failures_total[10m])
```

Search failures

---

# Alert Queries

```promql
ALERTS
```

```promql
ALERTS{alertstate="firing"}
```

Benefit:
Active incidents.
