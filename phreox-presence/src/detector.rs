use crate::catalog::Catalog;
use crate::process::ProcessInfo;
use crate::steam::SteamGame;
use serde::Serialize;

/// A game that was recognised among the running processes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Detected {
    /// Stable identifier. It changes only when the game changes.
    pub key: String,
    pub name: String,
    /// Logo or cover image URL, if known.
    pub image: Option<String>,
    pub via: MatchSource,
}

/// Steam's public header image for an app.
pub fn steam_header_url(app_id: u32) -> String {
    format!("https://cdn.akamai.steamstatic.com/steam/apps/{app_id}/header.jpg")
}

/// How a game was recognised.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum MatchSource {
    /// A running process has an executable name from the game list.
    Process { file_name: String },
    /// Running from a Steam install folder.
    SteamInstall { app_id: u32 },
}

/// Matches running processes against the game lists.
#[derive(Debug)]
pub struct Detector {
    catalog: Catalog,
    installed: Vec<SteamGame>,
    use_processes: bool,
    use_steam: bool,
}

impl Detector {
    /// Both sources are on by default.
    pub fn new(catalog: Catalog, installed: Vec<SteamGame>) -> Self {
        Self {
            catalog,
            installed,
            use_processes: true,
            use_steam: true,
        }
    }

    /// Turns the two detection sources on or off.
    pub fn set_sources(&mut self, use_processes: bool, use_steam: bool) {
        self.use_processes = use_processes;
        self.use_steam = use_steam;
    }

    /// Current state of the two sources as `(processes, steam)`.
    pub fn sources(&self) -> (bool, bool) {
        (self.use_processes, self.use_steam)
    }

    /// Returns the first recognised game.
    ///
    /// Process matches are tried first, since they carry the game's name from
    /// the list. Install-folder matches cover games that are not in any list.
    pub fn detect(&self, processes: &[ProcessInfo]) -> Option<Detected> {
        if self.use_processes {
            for process in processes {
                if let Some(game) = self.catalog.by_process(&process.file_name) {
                    return Some(Detected {
                        key: format!("game:{}", game.name),
                        name: game.name.clone(),
                        image: game.image.clone(),
                        via: MatchSource::Process {
                            file_name: process.file_name.clone(),
                        },
                    });
                }
            }
        }

        if self.use_steam {
            return self.detect_install(processes);
        }

        None
    }

    fn detect_install(&self, processes: &[ProcessInfo]) -> Option<Detected> {
        processes
            .iter()
            .filter_map(|process| process.exe.as_deref())
            .find_map(|exe| {
                self.installed
                    .iter()
                    .find(|game| exe.starts_with(&game.install_dir))
            })
            .map(|game| Detected {
                key: format!("steam:{}", game.app_id),
                name: game.name.clone(),
                image: Some(steam_header_url(game.app_id)),
                via: MatchSource::SteamInstall {
                    app_id: game.app_id,
                },
            })
    }
}
