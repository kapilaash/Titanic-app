FROM grafana/grafana:latest

USER root

COPY backend/observability/grafana/provisioning /etc/grafana/provisioning
COPY backend/observability/grafana/dashboards /etc/grafana/dashboards

RUN mkdir -p /var/lib/grafana /var/lib/grafana/plugins /etc/grafana/dashboards \
    && chown -R 472:0 /var/lib/grafana /etc/grafana/provisioning /etc/grafana/dashboards \
    && chmod -R g+rwX /var/lib/grafana /etc/grafana/provisioning /etc/grafana/dashboards

USER 472