#!/usr/bin/env bash
# install.sh — PortKiller GNOME Shell Extension Installer

set -e

EXTENSION_UUID="portkiller@ernest.dev"
INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PortKiller — GNOME Extension Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create destination directory
mkdir -p "$INSTALL_DIR"

# Copy extension files
echo "→ Copying extension files to $INSTALL_DIR"
cp "$SOURCE_DIR/metadata.json"  "$INSTALL_DIR/"
cp "$SOURCE_DIR/extension.js"   "$INSTALL_DIR/"
cp "$SOURCE_DIR/portHelper.js"  "$INSTALL_DIR/"
cp "$SOURCE_DIR/stylesheet.css" "$INSTALL_DIR/"
cp "$SOURCE_DIR/prefs.js"       "$INSTALL_DIR/"
cp -r "$SOURCE_DIR/schemas"     "$INSTALL_DIR/"

echo "✔ Files installed."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Detect session type
if [ "$XDG_SESSION_TYPE" = "x11" ]; then
    echo "  Detected X11 session."
    echo "  Reload GNOME Shell with:"
    echo ""
    echo "    busctl --user call org.gnome.Shell /org/gnome/Shell \\"
    echo "      org.gnome.Shell Eval s 'Meta.restart(\"Restarting…\")'"
    echo ""
else
    echo "  Detected Wayland session."
    echo "  ⚠  GNOME Shell cannot be reloaded on Wayland."
    echo "  → Log out and log back in to apply the extension."
    echo ""
fi

echo "  Then enable the extension with:"
echo ""
echo "    gnome-extensions enable $EXTENSION_UUID"
echo ""
echo "  Or use GNOME Extensions app / Extension Manager."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
