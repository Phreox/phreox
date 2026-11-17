# Phreox self-hosted Space

This bundle includes the Space server JAR, native start scripts, a Docker Compose configuration and a Pterodactyl egg.

## Configure

Edit `space.properties` as UTF-8 text. Set your public HTTPS URL, Phreox service URL and operator account credentials. Use a dedicated operator account. Keep this file private. Environment variables take precedence over the file.

Point your public hostname at a TLS reverse proxy forwarding to port 8082. Forward WebSocket upgrades and long-lived HTTP connections. The node registers with the configured service using your operator account. Clients must be able to reach the public URL. The audience defaults to its hostname. An optional `PHREOX_SPACE_SERVICE_KEY` pins the service's Base64 Ed25519 public key.

The node stores its database and signing key in `data/`. Back this directory up together. Preserve its contents when updating the JAR.

## Linux and macOS

Install Java 25, then run `chmod +x start.sh && ./start.sh`. `JAVA_HOME` selects a Java installation. `PHREOX_JAVA_OPTS` overrides the JVM flags.

## Windows

Install Java 25, edit `space.properties`, then run `start.bat` in a terminal. `JAVA_HOME` selects a Java installation.

## Docker

Install Docker with Compose, then run `docker compose up -d`. Use `docker compose logs -f` for logs and `docker compose down` to stop. Data lives in the `space-data` volume. The external port defaults to 8082 and can be changed with `PHREOX_SPACE_PORT`; the container port stays 8082. Configuration is read from the same `space.properties` file.

For updates, stop the server, replace `phreox-space.jar` with a newer Space JAR and start again. Compose users can run `docker compose up -d --force-recreate` after replacement.

## Pterodactyl

Import `egg-phreox-space.json` through the admin panel. Select a port allocation and configure the public URL, service URL and operator account in the egg variables. Its installer downloads the selected release channel. A GitHub token is needed if the releases repository is private. The egg uses its configured release channel independently of the JAR included in this ZIP. Its updater verifies release checksums and checks for updates every 30 seconds by default. Set the interval to 0 for updates only at startup.

## Customization

The operator can change the default category, public channel, optional private channel and Owner/Moderator/Member role names in `space.properties`. These defaults apply to newly created spaces. Permissions are assigned to the roles independently of their names. The private channel uses MLS encryption and requires its normal client-side key setup.

`PHREOX_SPACE_MAX_FILE_BYTES` sets the upload ceiling, while verified Volt entitlements also apply. `PHREOX_SPACE_FLUSH_SECONDS` controls database flushes. `PHREOX_SPACE_ORIGINS` adds explicit browser app origins, comma separated without paths or trailing slashes. Authentication remains token-based.

`GET /api/v1/health` reports server health. Stop the server gracefully to flush pending database changes. A longer flush interval increases the amount of recent data exposed to an abrupt process or machine failure.
