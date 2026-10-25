use std::path::PathBuf;
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};

/// A running process as far as detection cares.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProcessInfo {
    /// File name of the executable, such as `game.exe`.
    pub file_name: String,
    /// Full path of the executable. `None` when the OS does not let us read it,
    /// which happens for processes that belong to other users.
    pub exe: Option<PathBuf>,
}

/// Snapshot of all running processes.
///
/// The executable path is read where possible, because the process name is
/// truncated on Linux to 15 characters.
pub fn running_processes() -> Vec<ProcessInfo> {
    let mut system = System::new();

    system.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::nothing().with_exe(UpdateKind::OnlyIfNotSet),
    );

    system
        .processes()
        .values()
        .map(|process| {
            let exe = process.exe().map(|path| path.to_path_buf());

            let file_name = exe
                .as_ref()
                .and_then(|path| path.file_name())
                .map(|name| name.to_string_lossy().into_owned())
                .unwrap_or_else(|| process.name().to_string_lossy().into_owned());

            ProcessInfo { file_name, exe }
        })
        .collect()
}
