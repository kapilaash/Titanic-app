FROM prom/prometheus:latest

USER root

COPY backend/observability/prometheus/prometheus.prod.yml /etc/prometheus/prometheus.yml
COPY backend/observability/prometheus/alerts.yml /etc/prometheus/alerts.yml

CMD ["--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus", "--web.enable-lifecycle", "--web.listen-address=0.0.0.0:9090"]