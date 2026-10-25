//! JSON-lines RPC over stdin and stdout, used by the Electron app.
//!
//! The app starts `phreox-presence --rpc` and writes one request per line:
//!
//! ```text
//! {"id": 1, "method": "configure", "params": {"intervalSecs": 30}}
//! ```
//!
//! Every request gets exactly one reply with the same `id`:
//!
//! ```text
//! {"id": 1, "result": {"ok": true}}
//! {"id": 2, "error": "unknown method: foo"}
//! ```
//!
//! Status changes are pushed as events, without an `id`:
//!
//! ```text
//! {"event": "status", "data": {"state": "playing", "game": {"key": "game:Counter-Strike 2", "name": "Counter-Strike 2", "via": {"type": "process", "file_name": "cs2.exe"}}, "started_at": 1761440000000}}
//! {"event": "status", "data": {"state": "idle"}}
//! ```
//!
//! Methods: `configure` (partial update), `status`, `shutdown`.
//! The process exits when stdin is closed, after `shutdown`.

use crate::monitor::Monitor;
use serde::Deserialize;
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
use std::sync::mpsc::{self, TryRecvError};
use std::thread;
use std::time::{Duration, Instant};

#[derive(Deserialize)]
struct Request {
    id: Value,
    method: String,
    #[serde(default)]
    params: Value,
}

/// Partial update. Fields that are not sent keep their value.
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct Configure {
    interval_secs: Option<u64>,
    enabled: Option<bool>,
    detect_processes: Option<bool>,
    detect_steam: Option<bool>,
}

/// Runs the RPC loop until `shutdown` is received or stdin is closed.
pub fn serve(monitor: Monitor) {
    let (lines, incoming) = mpsc::channel::<String>();

    // Reading stdin blocks, so it runs on its own thread. The loop below
    // stays free to scan.
    thread::spawn(move || {
        for line in io::stdin().lock().lines() {
            let Ok(line) = line else { break };

            if lines.send(line).is_err() {
                break;
            }
        }
    });

    let mut state = State {
        monitor,
        enabled: true,
        last_report: None,
        last_scan: None,
    };

    loop {
        loop {
            match incoming.try_recv() {
                Ok(line) => {
                    if state.handle(&line) {
                        return;
                    }
                }
                Err(TryRecvError::Empty) => break,
                Err(TryRecvError::Disconnected) => return,
            }
        }

        if state.enabled && state.scan_due() {
            state.scan();
        }

        thread::sleep(Duration::from_millis(100));
    }
}

struct State {
    monitor: Monitor,
    enabled: bool,
    /// Last value sent as an event, so unchanged states are not repeated.
    last_report: Option<Value>,
    last_scan: Option<Instant>,
}

impl State {
    /// Handles one request line. Returns `true` when the process should stop.
    fn handle(&mut self, line: &str) -> bool {
        let request: Request = match serde_json::from_str(line) {
            Ok(request) => request,
            Err(error) => {
                reply_error(&Value::Null, &format!("invalid request: {error}"));
                return false;
            }
        };

        match request.method.as_str() {
            "configure" => match serde_json::from_value::<Configure>(request.params) {
                Ok(patch) => {
                    self.configure(patch);
                    reply_ok(&request.id, json!({ "ok": true }));
                }
                Err(error) => reply_error(&request.id, &format!("invalid params: {error}")),
            },

            "status" => reply_ok(&request.id, self.current_value()),

            "shutdown" => {
                reply_ok(&request.id, json!({ "ok": true }));
                return true;
            }

            other => reply_error(&request.id, &format!("unknown method: {other}")),
        }

        false
    }

    fn configure(&mut self, patch: Configure) {
        if let Some(secs) = patch.interval_secs {
            self.monitor
                .set_interval(Duration::from_secs(secs.max(2)));
        }

        if patch.detect_processes.is_some() || patch.detect_steam.is_some() {
            let detector = self.monitor.detector_mut();
            let (processes, steam) = detector.sources();

            // Sources that were not sent keep their current state.
            detector.set_sources(
                patch.detect_processes.unwrap_or(processes),
                patch.detect_steam.unwrap_or(steam),
            );
        }

        if let Some(enabled) = patch.enabled {
            self.enabled = enabled;

            if !enabled {
                self.report(json!({ "state": "disabled" }));
            }
        }

        // Apply the change at once instead of waiting for the next interval.
        self.last_scan = None;
    }

    fn current_value(&self) -> Value {
        if !self.enabled {
            return json!({ "state": "disabled" });
        }

        serde_json::to_value(self.monitor.status()).unwrap_or(Value::Null)
    }

    fn scan_due(&self) -> bool {
        self.last_scan
            .map_or(true, |last| last.elapsed() >= self.monitor.interval())
    }

    fn scan(&mut self) {
        self.last_scan = Some(Instant::now());

        let status = self.monitor.scan();
        let value = serde_json::to_value(status).unwrap_or(Value::Null);

        self.report(value);
    }

    fn report(&mut self, value: Value) {
        if self.last_report.as_ref() == Some(&value) {
            return;
        }

        emit(&json!({ "event": "status", "data": value }));
        self.last_report = Some(value);
    }
}

fn reply_ok(id: &Value, result: Value) {
    emit(&json!({ "id": id, "result": result }));
}

fn reply_error(id: &Value, message: &str) {
    emit(&json!({ "id": id, "error": message }));
}

fn emit(message: &Value) {
    let mut out = io::stdout().lock();

    // A closed stdout means the parent is gone. Nothing useful is left to do.
    let _ = writeln!(out, "{message}");
    let _ = out.flush();
}
