# Phreox self-hosted Space

This bundle includes the Space server JAR, native start scripts, a Docker Compose configuration and a Pterodactyl egg.

A Space server is yours: its spaces, members and messages stay on it. It needs no Phreox account. It registers at the Phreox service with
its own key, so that invite links (`service.phreox.talk/<code>`) lead to it, and everything else is set up in its console.

## Set up

1. Point a public hostname at a TLS reverse proxy that forwards to port 8082. Forward WebSocket upgrades and long-lived HTTP connections.
2. Edit `space.properties` as UTF-8 text: set `PHREOX_SPACE_PUBLIC_URL` to that `https` address, and `PHREOX_SPACE_NAME` to the name of
   your space. Environment variables take precedence over the file.
3. Start the server (see below). It makes its key (`data/node.key`), its first space and the first invite link, and prints the link:
   `This server has no owner yet. Open https://service.phreox.talk/abcd2345 in Phreox: the first person who comes in is the owner.`
4. Open the link in Phreox. You are the owner now: you hold the top role of the space and manage it from the app.

The service gives an address only to the server that answers there: it asks `https://<your address>/api/v1/node/key` when the server
registers. If the log says `No space node with this key answers at ...`, the address does not reach this server from the internet yet.

The server stores its database, its key and its settings in `data/`. Back this directory up as a whole, and keep `node.key` private: the
key is the identity of your server. Preserve the directory when updating the JAR.

## The console

Type commands into the terminal the server runs in (the console of a hosting panel is that terminal). `help` lists them:

| Command | What it does |
|---|---|
| `status`, `setup` | what the server is, whether the service knows it, and what is still to do |
| `invite create [uses=N] [hours=N]` | makes an invite link; `invite list`, `invite revoke <code>` |
| `owner add <user>`, `owner remove <user>`, `owner list` | who owns the server (the first person who came in, and whoever you add) |
| `member list`, `member kick <user>`, `member ban <user>`, `member unban <user>` | the people of a space |
| `role list`, `role give <user> <role>`, `role take <user> <role>` | roles |
| `channel list`, `channel create <name> [category=<name>] [private]`, `category create <name>` | channels |
| `space list`, `space create <name>`, `space rename <name>`, `space delete confirm` | the spaces on this server |
| `set open-creation on\|off`, `settings` | whether every member may make spaces here (owners always may) |
| `save`, `stop` | write everything to the disk now; stop the server |

`<user>` is a Phreox user name or an account id. With several spaces, name the one you mean: `space=<name or id>`. A name with spaces
stands in quotes.

The same commands run from a second terminal on the same machine, for scripts and for servers whose terminal nobody holds:
`./start.sh invite create uses=10` (or `java -jar phreox-space.jar owner add tom`). That needs the same configuration, because the
command finds the running server by its port and shows the token it keeps in `data/console.token`.

## Linux and macOS

Install Java 25, then run `chmod +x start.sh && ./start.sh`. `JAVA_HOME` selects a Java installation. `PHREOX_JAVA_OPTS` overrides the JVM flags.

## Windows

Install Java 25, edit `space.properties`, then run `start.bat` in a terminal. `JAVA_HOME` selects a Java installation.

## Docker

Install Docker with Compose, then run `docker compose up -d`. Use `docker compose logs -f` for logs (the first invite link is there) and
`docker compose down` to stop. Data lives in the `space-data` volume. The external port defaults to 8082.

For the console, run one command at a time with `docker compose exec space java -jar phreox-space.jar <command>`, or attach to the
terminal with `docker attach <container>` and leave it with Ctrl+P Ctrl+Q.

For updates, stop the server, replace `phreox-space.jar` with a newer Space JAR and start again. Compose users can run `docker compose up -d --force-recreate` after replacement.

## Pterodactyl

Import `egg-phreox-space.json` through the admin panel. Select a port allocation and set the public URL and the name of the space in the
egg variables. Its installer downloads the selected release. The console of the panel is the console of the server: the first invite link
appears there, and the commands above are typed there.

## Customization

The default category, public channel, optional private channel and the names of the Owner, Moderator and Member roles are set in
`space.properties`. These defaults apply to newly created spaces. Permissions and everything else are changed in the app by an owner.

`PHREOX_SPACE_MAX_FILE_BYTES` sets the upload ceiling, while verified Volt entitlements also apply. `PHREOX_SPACE_FLUSH_SECONDS` controls database flushes. `PHREOX_SPACE_ORIGINS` adds explicit browser origins.

`GET /api/v1/health` reports server health. Stop the server gracefully (`stop`) to flush pending database changes. A longer flush interval increases the amount of recent data exposed to an abrupt process or machine failure.
