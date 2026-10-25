use crate::error::Result;
use serde::Deserialize;
use std::collections::HashMap;

/// Where a catalog entry came from. Overrides win over the shared list.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Source {
    Catalog,
    Override,
}

/// A game known by its executable names.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Game {
    pub name: String,
    /// Logo or cover image URL, if the list has one.
    pub image: Option<String>,
    /// Normalized executable names: lowercase, without directories or `.exe`.
    pub executables: Vec<String>,
    pub source: Source,
}

/// One entry of a game list. Only the fields Phreox uses are read.
#[derive(Deserialize)]
struct Entry {
    name: String,
    #[serde(default)]
    image: Option<String>,
    #[serde(default)]
    executables: Vec<Executable>,
}

#[derive(Deserialize)]
struct Executable {
    name: String,
    #[serde(default)]
    os: Option<String>,
    #[serde(default)]
    is_launcher: bool,
}

/// Executable names mapped to games.
#[derive(Debug, Default)]
pub struct Catalog {
    games: Vec<Game>,
    by_executable: HashMap<String, usize>,
}

impl Catalog {
    pub fn new() -> Self {
        Self::default()
    }

    /// Loads a game list in the format `[{ "name": ..., "executables": [...] }]`.
    ///
    /// Returns the number of entries read.
    pub fn load_catalog(&mut self, json: &str) -> Result<usize> {
        self.load(json, Source::Catalog)
    }

    /// Loads a user file in the same format. Its entries take precedence over
    /// the catalog when an executable name is listed twice.
    pub fn load_overrides(&mut self, json: &str) -> Result<usize> {
        self.load(json, Source::Override)
    }

    fn load(&mut self, json: &str, source: Source) -> Result<usize> {
        let entries: Vec<Entry> = serde_json::from_str(json)?;
        let count = entries.len();

        for entry in entries {
            self.insert(entry, source);
        }

        Ok(count)
    }

    fn insert(&mut self, entry: Entry, source: Source) {
        let executables: Vec<String> = entry
            .executables
            .iter()
            .filter(|exe| !exe.is_launcher && os_matches(exe.os.as_deref()))
            .map(|exe| normalize(&exe.name))
            .filter(|name| !name.is_empty())
            .collect();

        if executables.is_empty() {
            return;
        }

        let index = self.games.len();

        for exe in &executables {
            match source {
                Source::Override => {
                    self.by_executable.insert(exe.clone(), index);
                }
                Source::Catalog => {
                    self.by_executable.entry(exe.clone()).or_insert(index);
                }
            }
        }

        self.games.push(Game {
            name: entry.name,
            image: entry.image,
            executables,
            source,
        });
    }

    /// Number of games with at least one usable executable.
    pub fn len(&self) -> usize {
        self.games.len()
    }

    pub fn is_empty(&self) -> bool {
        self.games.is_empty()
    }

    /// Finds the game for a process file name such as `Game.exe` or `game`.
    pub fn by_process(&self, file_name: &str) -> Option<&Game> {
        self.by_executable
            .get(&normalize(file_name))
            .map(|&index| &self.games[index])
    }
}

/// Keeps entries for the current platform. Game lists use `win32` and
/// `darwin` where Rust reports `windows` and `macos`.
fn os_matches(os: Option<&str>) -> bool {
    let current = match std::env::consts::OS {
        "windows" => "win32",
        "macos" => "darwin",
        other => other,
    };

    os.map_or(true, |os| os.eq_ignore_ascii_case(current))
}

/// Lowercase file name without directories or a `.exe` suffix.
fn normalize(path: &str) -> String {
    let file = path
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or(path)
        .trim()
        .to_lowercase();

    file.strip_suffix(".exe")
        .map(str::to_owned)
        .unwrap_or(file)
}
