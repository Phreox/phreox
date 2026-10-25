//! Reads installed games from local Steam libraries.
//!
//! Steam writes one `appmanifest_<appid>.acf` file per installed app into each
//! library's `steamapps` folder. Those files name the app and its install
//! folder, which is enough to recognise a game by the processes running from it.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

/// An installed Steam game and the folder its files live in.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SteamGame {
    pub app_id: u32,
    pub name: String,
    pub install_dir: PathBuf,
}

/// Splits Valve's KeyValues format (ACF and VDF files) into quoted tokens.
/// Braces and other punctuation are skipped. Backslash escapes are unwrapped,
/// so `"C:\\Games"` becomes `C:\Games`.
fn tokens(input: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut chars = input.chars();

    while let Some(c) = chars.next() {
        if c != '"' {
            continue;
        }

        let mut token = String::new();

        while let Some(ch) = chars.next() {
            match ch {
                '"' => break,
                '\\' => {
                    if let Some(escaped) = chars.next() {
                        token.push(escaped);
                    }
                }
                _ => token.push(ch),
            }
        }

        out.push(token);
    }

    out
}

/// Reads the app ID, name and install folder from an app manifest.
///
/// `common_dir` is the `steamapps/common` folder of the library that holds
/// the manifest.
pub fn parse_app_manifest(content: &str, common_dir: &Path) -> Option<SteamGame> {
    let mut app_id: Option<u32> = None;
    let mut name: Option<String> = None;
    let mut install: Option<String> = None;

    for pair in tokens(content).windows(2) {
        let value = &pair[1];

        match pair[0].as_str() {
            "appid" if app_id.is_none() => app_id = value.parse().ok(),
            "name" if name.is_none() => name = Some(value.clone()),
            "installdir" if install.is_none() => install = Some(value.clone()),
            _ => {}
        }
    }

    Some(SteamGame {
        app_id: app_id?,
        name: name?,
        install_dir: common_dir.join(install?),
    })
}

/// Steam library folders: the Steam root plus any extra libraries listed in
/// `steamapps/libraryfolders.vdf`.
pub fn library_folders(steam_root: &Path) -> Vec<PathBuf> {
    let mut libraries = vec![steam_root.to_path_buf()];
    let vdf = steam_root.join("steamapps").join("libraryfolders.vdf");

    if let Ok(content) = std::fs::read_to_string(vdf) {
        for pair in tokens(&content).windows(2) {
            if pair[0] == "path" {
                let path = PathBuf::from(&pair[1]);

                if !libraries.contains(&path) {
                    libraries.push(path);
                }
            }
        }
    }

    libraries
}

/// Every installed game across all libraries of the given Steam roots.
///
/// Steam tools such as Proton are skipped, since they run as part of a game.
/// Each app ID is returned once, even when a symlinked root is listed twice.
pub fn installed_games(steam_roots: &[PathBuf]) -> Vec<SteamGame> {
    let mut seen = HashSet::new();
    let mut games = Vec::new();

    for root in steam_roots {
        for library in library_folders(root) {
            let steamapps = library.join("steamapps");
            let common = steamapps.join("common");

            let Ok(entries) = std::fs::read_dir(&steamapps) else {
                continue;
            };

            for entry in entries.flatten() {
                let file = entry.file_name();
                let file = file.to_string_lossy();

                if !(file.starts_with("appmanifest_") && file.ends_with(".acf")) {
                    continue;
                }

                let Ok(content) = std::fs::read_to_string(entry.path()) else {
                    continue;
                };

                let Some(game) = parse_app_manifest(&content, &common) else {
                    continue;
                };

                if is_tool(&game.name) {
                    continue;
                }

                if seen.insert(game.app_id) {
                    games.push(game);
                }
            }
        }
    }

    games
}

fn is_tool(name: &str) -> bool {
    ["Proton", "Steam Linux Runtime", "Steamworks Shared"]
        .iter()
        .any(|prefix| name.starts_with(prefix))
}

/// Default Steam installs for the current platform, limited to those that exist.
pub fn default_steam_roots() -> Vec<PathBuf> {
    let home = std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_default();

    let mut roots = Vec::new();

    if cfg!(windows) {
        for var in ["ProgramFiles(x86)", "ProgramFiles"] {
            if let Some(dir) = std::env::var_os(var) {
                roots.push(PathBuf::from(dir).join("Steam"));
            }
        }
    } else if cfg!(target_os = "macos") {
        roots.push(home.join("Library/Application Support/Steam"));
    } else {
        roots.push(home.join(".local/share/Steam"));
        roots.push(home.join(".steam/steam"));
        roots.push(home.join(".var/app/com.valvesoftware.Steam/.local/share/Steam"));
    }

    roots.into_iter().filter(|root| root.exists()).collect()
}
