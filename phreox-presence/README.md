# phreox-presence

Game detection for Phreox. It finds the games that are running and reports
them to the app. Nothing is sent to other services.

## How it works

1. **Processes.** Each scan reads the running processes. The executable path
   is used where the OS allows it.
2. **Game lists.** A process counts as a game when its executable name is in a
   game list. Overrides win over the shared list.
3. **Steam.** A process that runs from a Steam install folder counts as that
   game. The folders come from the `appmanifest_*.acf` files of the local Steam
   libraries. Steam tools such as Proton are ignored.
4. **Logos and names.** A game list entry can carry a `name` and an `image`
   URL. Steam games get Steam's public header image.

## Game list format

A list is a JSON array. Only these fields are read:

```json
[
  {
    "name": "Counter-Strike 2",
    "image": "https://example.com/cs2.jpg",
    "executables": [
      { "name": "cs2.exe", "os": "win32" },
      { "name": "cs2", "os": "linux" }
    ]
  }
]
```

- `os` is optional. Values are `win32`, `darwin` and `linux`.
- `is_launcher: true` marks a launcher that should not count as the game.

Phreox does not ship a game list. You supply it with `--catalog` or
`--overrides`, or with the environment variables `PHREOX_PRESENCE_CATALOG` and
`PHREOX_PRESENCE_OVERRIDES` when the app starts the process.

## Command line

```sh
cargo run --release -- --catalog games.json --overrides mine.json
```

| Option | Meaning |
| --- | --- |
| `--catalog <file>` | Game list, can be repeated |
| `--overrides <file>` | Own entries, can be repeated, they win on conflicts |
| `--steam <dir>` | Extra Steam root, can be repeated |
| `--no-steam` | Skip the default Steam installs |
| `--interval <secs>` | Scan interval, default 15 |
| `--rpc` | Serve the RPC protocol on stdin and stdout |
| `--once` | One scan, then exit |

## RPC protocol

With `--rpc` the process reads one JSON request per line on stdin. Each request
gets exactly one reply with the same `id`. Status changes arrive as events.

```text
→ {"id": 1, "method": "configure", "params": {"intervalSecs": 30}}
← {"id": 1, "result": {"ok": true}}
← {"event": "status", "data": {"state": "playing", "game": {"key": "game:Counter-Strike 2", "name": "Counter-Strike 2", "image": "https://example.com/cs2.jpg", "via": {"type": "process", "file_name": "cs2.exe"}}, "started_at": 1761440000000}}
← {"event": "status", "data": {"state": "idle"}}
```

| Method | Params | Effect |
| --- | --- | --- |
| `configure` | any subset of `intervalSecs`, `enabled`, `detectProcesses`, `detectSteam` | partial update, takes effect at once |
| `status` | none | current status |
| `shutdown` | none | exits |

The process exits when stdin is closed.

## Use it from Phreox

`phreox-app` starts the process and forwards the status to the renderer as
`window.phreox.presence`. The binary is at `target/release/phreox-presence`.
Override it with `PHREOX_PRESENCE_BIN`. Build it first with `cargo build --release`.

## Limitations

- Detection covers only what is in the game lists and in the Steam libraries.
  Other launchers (Epic, GOG, Battle.net) need their own source. The `steam`
  module shows the pattern to add one.
- On Linux the process name is cut to 15 characters, so detection uses the
  executable path where it can be read.
- Processes of other users often have no readable path, so those games are
  only found by name.
- Logos and names come from the game list. A game without an entry shows its
  process name, or the Steam name for Steam games.

## Tests

```sh
cargo test
```
