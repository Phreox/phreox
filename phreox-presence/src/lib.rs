//! Game detection for Phreox.
//!
//! The crate finds the games that are running and tells the app about them.
//!
//! * **Game lists** – [`Catalog`] maps executable names to game names. Steam
//!   libraries are read by [`steam`], which finds installed games by their
//!   install folder.
//! * **Detection** – [`Detector`] matches the running processes from
//!   [`process::running_processes`] against both sources.
//! * **Monitor** – [`Monitor`] scans regularly and remembers when the current
//!   game started.
//! * **RPC** – [`rpc::serve`] exposes the monitor as JSON lines over stdio, so
//!   the Electron app can drive it without linking Rust code.

pub mod catalog;
pub mod detector;
pub mod error;
pub mod monitor;
pub mod process;
pub mod rpc;
pub mod steam;

pub use catalog::{Catalog, Game, Source};
pub use detector::{Detected, Detector, MatchSource};
pub use error::{Error, Result};
pub use monitor::{Monitor, Status};
pub use process::ProcessInfo;
pub use steam::SteamGame;
