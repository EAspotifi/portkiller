#!/usr/bin/env bash
# Build a ZIP suitable for extensions.gnome.org (no gschemas.compiled per EGO025).
set -euo pipefail

UUID="portkiller@ernest.dev"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${ROOT}/${UUID}.zip"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "${TMP}/${UUID}/schemas"
cp "${ROOT}/metadata.json" "${ROOT}/extension.js" "${ROOT}/portHelper.js" \
  "${ROOT}/prefs.js" "${ROOT}/stylesheet.css" "${TMP}/${UUID}/"
cp "${ROOT}/schemas/org.gnome.shell.extensions.portkiller.gschema.xml" "${TMP}/${UUID}/schemas/"
[[ -f "${ROOT}/LICENSE" ]] && cp "${ROOT}/LICENSE" "${TMP}/${UUID}/"

rm -f "$OUT"
( cd "$TMP" && zip -r "$OUT" "$UUID" )
echo "Created: $OUT (no gschemas.compiled — EGO compiles for 45+)"
