#!/bin/sh
set -e

mkdir -p /var/lib/grafana
mkdir -p /var/lib/grafana/plugins

chown -R 472:0 /var/lib/grafana || true
chmod -R g+rwX /var/lib/grafana || true

exec /run.sh