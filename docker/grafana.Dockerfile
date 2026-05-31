FROM grafana/grafana:latest

USER root

COPY backend/observability/grafana/provisioning /etc/grafana/provisioning
COPY backend/observability/grafana/dashboards /var/lib/grafana/dashboards

RUN mkdir -p /var/lib/grafana/plugins \
    && chown -R 472:0 /var/lib/grafana /etc/grafana/provisioning \
    && chmod -R g+rwX /var/lib/grafana /etc/grafana/provisioning

USER 472