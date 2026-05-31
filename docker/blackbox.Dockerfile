FROM prom/blackbox-exporter:latest

COPY backend/observability/blackbox/blackbox.yml /etc/blackbox_exporter/config.yml

CMD ["--config.file=/etc/blackbox_exporter/config.yml"]