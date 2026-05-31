FROM grafana/grafana:latest

USER root

COPY docker/grafana-entrypoint.sh /grafana-entrypoint.sh
RUN chmod +x /grafana-entrypoint.sh

ENTRYPOINT ["/grafana-entrypoint.sh"]