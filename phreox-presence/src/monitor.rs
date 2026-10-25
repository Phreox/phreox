use crate::detector::{Detected, Detector};
use crate::process::running_processes;
use serde::Serialize;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// What the last scan found.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "state", rename_all = "snake_case")]
pub enum Status {
    /// No known game is running.
    Idle,
    /// A game is running. `started_at` is Unix time in milliseconds.
    Playing { game: Detected, started_at: u64 },
}

/// Scans for running games and remembers when the current one started.
pub struct Monitor {
    interval: Duration,
    detector: Detector,
    /// The running game with its start time in Unix milliseconds.
    current: Option<(Detected, u64)>,
}

impl Monitor {
    pub fn new(detector: Detector) -> Self {
        Self {
            interval: Duration::from_secs(15),
            detector,
            current: None,
        }
    }

    pub fn interval(&self) -> Duration {
        self.interval
    }

    pub fn set_interval(&mut self, interval: Duration) {
        self.interval = interval;
    }

    pub fn detector_mut(&mut self) -> &mut Detector {
        &mut self.detector
    }

    /// Scans the running processes and returns the new status.
    ///
    /// A different game gets a new start time. The start time is kept while
    /// the same game keeps running.
    pub fn scan(&mut self) -> Status {
        let processes = running_processes();
        let detected = self.detector.detect(&processes);

        let changed = self.current.as_ref().map(|(game, _)| &game.key)
            != detected.as_ref().map(|game| &game.key);

        if changed {
            self.current = detected.map(|game| (game, now_ms()));
        }

        self.status()
    }

    /// The status as of the last scan.
    pub fn status(&self) -> Status {
        match &self.current {
            Some((game, started_at)) => Status::Playing {
                game: game.clone(),
                started_at: *started_at,
            },
            None => Status::Idle,
        }
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis() as u64)
        .unwrap_or(0)
}
