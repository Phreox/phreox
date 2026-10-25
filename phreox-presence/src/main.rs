//! Command-line runner for Phreox game detection.
//!
//! Without `--rpc` it prints the detected game on every scan. With `--rpc` it
//! serves the JSON-lines protocol from the `rpc` module, which the Electron
//! app uses.

use phreox_presence::monitor::Monitor;
use phreox_presence::rpc;
use phreox_presence::steam::{default_steam_roots, installed_games};
use phreox_presence::{Catalog, Detector};
use std::path::PathBuf;
use std::time::Duration;

const USAGE: &str = "usage: phreox-presence [options]

options:
  --catalog <file>     game list (JSON), may be repeated
  --overrides <file>   own entries in the same format, may be repeated
  --steam <dir>        extra Steam root, may be repeated
  --no-steam           do not look at the default Steam installs
  --interval <secs>    scan interval, default 15
  --rpc                serve the JSON-lines RPC on stdin/stdout
  --once               one scan, then exit";

struct Options {
    catalogs: Vec<PathBuf>,
    overrides: Vec<PathBuf>,
    steam_roots: Vec<PathBuf>,
    default_steam: bool,
    interval_secs: u64,
    rpc: bool,
    once: bool,
}

fn main() {
    let options = match parse(std::env::args().skip(1)) {
        Ok(options) => options,
        Err(message) => {
            eprintln!("{message}\n\n{USAGE}");
            std::process::exit(2);
        }
    };

    if let Err(error) = run(options) {
        eprintln!("phreox-presence: {error}");
        std::process::exit(1);
    }
}

fn run(options: Options) -> phreox_presence::Result<()> {
    let mut catalog = Catalog::new();

    for path in &options.catalogs {
        catalog.load_catalog(&std::fs::read_to_string(path)?)?;
    }

    for path in &options.overrides {
        catalog.load_overrides(&std::fs::read_to_string(path)?)?;
    }

    let mut roots = options.steam_roots;

    if options.default_steam {
        roots.extend(default_steam_roots());
    }

    let installed = installed_games(&roots);

    eprintln!(
        "catalog: {} games, steam: {} installed",
        catalog.len(),
        installed.len(),
    );

    let mut monitor = Monitor::new(Detector::new(catalog, installed));
    monitor.set_interval(Duration::from_secs(options.interval_secs.max(2)));

    if options.rpc {
        rpc::serve(monitor);
        return Ok(());
    }

    loop {
        println!("{:?}", monitor.scan());

        if options.once {
            break;
        }

        std::thread::sleep(monitor.interval());
    }

    Ok(())
}

fn parse(mut args: impl Iterator<Item = String>) -> Result<Options, String> {
    let mut options = Options {
        catalogs: Vec::new(),
        overrides: Vec::new(),
        steam_roots: Vec::new(),
        default_steam: true,
        interval_secs: 15,
        rpc: false,
        once: false,
    };

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--catalog" => options.catalogs.push(value(&mut args, &arg)?.into()),
            "--overrides" => options.overrides.push(value(&mut args, &arg)?.into()),
            "--steam" => options.steam_roots.push(value(&mut args, &arg)?.into()),
            "--no-steam" => options.default_steam = false,
            "--interval" => {
                options.interval_secs = value(&mut args, &arg)?
                    .parse()
                    .map_err(|_| "--interval needs a number of seconds".to_string())?;
            }
            "--rpc" => options.rpc = true,
            "--once" => options.once = true,
            other => return Err(format!("unknown argument: {other}")),
        }
    }

    Ok(options)
}

fn value(args: &mut impl Iterator<Item = String>, flag: &str) -> Result<String, String> {
    args.next()
        .ok_or_else(|| format!("{flag} needs a value"))
}
