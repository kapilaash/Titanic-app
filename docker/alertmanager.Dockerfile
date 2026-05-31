FROM prom/alertmanager:latest

COPY backend/observability/alertmanager/alertmanager.prod.yml /etc/alertmanager/alertmanager.yml

CMD ["--config.file=/etc/alertmanager/alertmanager.yml", "--storage.path=/alertmanager"]