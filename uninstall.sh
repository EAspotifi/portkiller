#!/usr/bin/env bash
# uninstall.sh — PortKiller GNOME Shell Extension Uninstaller

set -e

EXTENSION_UUID="portkiller@ernest.dev"
INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PortKiller — GNOME Extension Uninstaller"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Disable the extension first if possible
if command -v gnome-extensions &> /dev/null; then
    echo "→ Disabling extension $EXTENSION_UUID..."
    gnome-extensions disable "$EXTENSION_UUID" || true
fi

# Remove the extension directory
if [ -d "$INSTALL_DIR" ]; then
    echo "→ Removing extension files from $INSTALL_DIR..."
    rm -rf "$INSTALL_DIR"
    echo "✔ Files removed successfully."
else
    echo "⚠ Extension directory not found. Is it installed?"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Uninstallation Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Detect session type to inform user
if [ "$XDG_SESSION_TYPE" = "x11" ]; then
    echo "  Detected X11 session."
    echo "  You may need to restart GNOME Shell to fully apply changes:"
    echo ""
    echo "    busctl --user call org.gnome.Shell /org/gnome/Shell \\"
    echo "      org.gnome.Shell Eval s 'Meta.restart(\"Restarting…\")'"
    echo ""
else
    echo "  Detected Wayland session."
    echo "  ⚠  You may need to log out and log back in to fully apply changes"
    echo "     and remove it from extension managers."
    echo ""
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
