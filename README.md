# PortKiller — GNOME Shell Extension

> A developer-focused GNOME Shell extension that monitors active TCP/UDP listening ports and lets you kill any process with a single click — right from the top bar.

![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-45%2B-4A86CF?style=flat-square&logo=gnome)
![Version](https://img.shields.io/badge/version-1.0.0-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square)

---

## Features

- 🔌 **Live port monitoring** — lists all TCP ports currently in LISTEN state
- ⚡ **One-click kill** — send SIGKILL to any process by port
- 💀 **Kill All** — terminate every listening process at once (safely skips system/unknown ports)
- 🔢 **Top-bar badge** — instantly see how many ports are open (blue badge)
- ⚙️ **Customizable Indicator** — highly configurable through extension preferences:
  - Show the number of active ports
  - Show a small green dot when ports are active
  - Show only the simple icon (clean mode)
- 🛡️ **Smart filtering** — automatically hides common system ports and unknown processes to keep your list clean
- 🔄 **Manual refresh** — refresh button inside the menu
- 🎨 **Dark-themed UI** — fits perfectly in the GNOME top bar

---

## Requirements

- GNOME Shell **45 or newer** (tested up to GNOME 49)
- `ss` command (from `iproute2`, pre-installed on Fedora/Ubuntu/Arch)

---

## Installation

```bash
git clone https://github.com/EAspotifi/portkiller.git
cd portkiller
chmod +x install.sh
./install.sh
```

### Enable the extension

**Wayland** (Fedora default): Log out and log back in, then:
```bash
gnome-extensions enable portkiller@ernest.dev
```

**X11**: Reload GNOME Shell without logging out:
```bash
busctl --user call org.gnome.Shell /org/gnome/Shell \
  org.gnome.Shell Eval s 'Meta.restart("Restarting…")'
gnome-extensions enable portkiller@ernest.dev
```

You can also use [Extension Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager) or [GNOME Extensions](https://extensions.gnome.org/) to enable and configure it graphically.

---

## Usage

1. Click the **PortKiller icon** (🔌) in the top bar.
2. The popup lists all active listening ports with process name and PID (hiding basic system components).
3. Click **Kill** next to a port to terminate that process immediately.
4. Click **Kill All Ports** to terminate every listed process.
5. Click the **refresh** button (↻) to manually re-scan ports.
6. Open the **Preferences** to customize what the top-bar icon displays.

---

## File Structure

```
PortKiller/
├── extension.js      # Main extension — panel button & popup menu
├── portHelper.js     # Port scanning (ss) & kill logic
├── prefs.js          # Preferences window (GNOME Extension Settings)
├── stylesheet.css    # Menu & indicator styles
├── metadata.json     # Extension metadata
├── schemas/          # GSettings schemas for extension preferences
├── install.sh        # Installation script
├── uninstall.sh      # Uninstallation script
├── .gitignore        # Git ignored files
└── README.md
```

---

## How It Works

- Uses `ss -tlnup` (socket statistics) to list all listening TCP sockets and their associated PIDs.
- Sends `kill -9 <PID>` to terminate a process. Falls back to `pkexec kill -9 <PID>` (polkit dialog) for processes owned by other users.
- Connects to `GSettings` to allow live customization of the panel indicator.
- Written in modern ESM JavaScript as required by GNOME Shell 45+.

---

## Uninstall

You can easily uninstall the extension using the provided script:

```bash
chmod +x uninstall.sh
./uninstall.sh
```

Or manually:

```bash
gnome-extensions disable portkiller@ernest.dev
rm -rf ~/.local/share/gnome-shell/extensions/portkiller@ernest.dev
```

---

## License

GPL-3.0 — see [LICENSE](LICENSE).
