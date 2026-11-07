# A space node that keeps itself up to date: it takes the newest phreox-space release of its channel when it starts and then looks again
# every few minutes, replacing itself when there is a newer one. Build context is the repository root:
#   docker build -f docker/space-node/Dockerfile -t phreox-space-node .
FROM eclipse-temurin:25-jre

RUN apt-get update && apt-get install -y --no-install-recommends curl jq ca-certificates && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 phreox && mkdir -p /app /data && chown -R phreox /app /data

COPY pterodactyl/update.sh /app/update.sh
COPY docker/space-node/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/update.sh /app/entrypoint.sh

USER phreox
WORKDIR /app
ENV PHREOX_SPACE_DATA_DIR=/data
VOLUME /data

ENTRYPOINT ["/app/entrypoint.sh"]
