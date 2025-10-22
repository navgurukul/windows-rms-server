# Probelms in Software Installation.
When RMS installs software using the System profile (which runs with the highest privilege), some applications are installed inside:

C:\Windows\SysWOW64\config\systemprofile\AppData\Local

These installations are not visible or accessible to any logged-in user account. But can be accessed by running them from the right destination.

This is caused because different installers are based on different installation technologies for example MSI (BRAVE) or Squirrel (Electron based maybe custom too) (Atom and Discord (Custom but electron based)). Squirrel based do not repect the --install-arguments flag to install in a proper directory and hence they are impossible to install in a proper directory under a USER %LOCALAPPDATA% location. Since we are using SYSTEM USER the installation path resolves to C:\Windows\SysWOW64\config\systemprofile\AppData\Local.

There are some installer which cannot be installed properly without user interference since they don't have .portable or they don't respect the --install-arguments flag.

Some installers have the location are not specified in them and so they follow wherever choclatey puts it ,for example, for OBS Studio portable. It is installed under C:\ProgramData\chocolatey\lib.

| Software    | Installer Type      | Respects `/D` or `/machine` | Works from SYSTEM                                  | Works from Admin | Portable Alternative   |
| ----------- | ------------------- | --------------------------- | -------------------------------------------------- | ---------------- | ---------------------- |
| **Brave**   | Google MSI          | ✅ Yes (`--system-level`)    | ⚠️ Installs under systemprofile unless flag passed | ✅                | ❌                      |
| **Atom**    | Squirrel (Electron) | ❌ No                        | ✅                                                  | ⚠️ Ignores `/D=` | ✅ (`atom.portable`)    |
| **Discord** | Squirrel (Electron) | ❌ No                        | ✅                                                  | ⚠️ Ignored `/D=` | ⚠️ unofficial portable |


# General Rule for installations

| App Type                                              | Best Practice                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| **MSI-based or supports /machine**                    | Install as SYSTEM with proper flags                                    |
| **Squirrel / Electron-based (per-user)**              | Use portable versions or copy extracted binaries                       |
| **EXE-based (generic)**                               | Test `/D=...`, `/S`, `/ALLUSERS=1` first                               |
| **Apps with no system mode (Discord, VS Code, Atom)** | Deploy portable, or preinstall under ProgramData and symlink for users |
