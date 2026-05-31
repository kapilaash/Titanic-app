FROM prom/prometheus:latest

COPY backend/observability/prometheus/prometheus.prod.yml /etc/prometheus/prometheus.yml
COPY backend/observability/prometheus/alerts.yml /etc/prometheus/alerts.yml

CMD ["--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus", "--web.enable-lifecycle"]