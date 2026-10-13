#!/usr/bin/env bash
# PocketStrike-AI static preview server.
# Builds a static snapshot of the Web UI into ./dist (inside PROJECT_DIR),
# writes deployment-output.json for the controller, and serves ./dist in the
# foreground on PORT (default 3000).
set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-3000}"
export PORT
OPENCODE_WEB_DIR_FALLBACK="/home/runner/work/_temp/omgithub-web"
WEB_DIR="${OPENCODE_WEB_DIR:-$OPENCODE_WEB_DIR_FALLBACK}"

/usr/bin/time -p which python3
/usr/bin/time -p python3 --version

# Build the static snapshot when sources are newer (or on first run).
/usr/bin/time -p mkdir -p dist/static
if [[ ! -f dist/index.html || templates/index.html -nt dist/index.html ]]; then
  /usr/bin/time -p cp templates/index.html dist/index.html
else
  echo "dist/index.html is up to date."
fi
/usr/bin/time -p cp static/style.css dist/static/style.css
/usr/bin/time -p cp static/script.js dist/static/script.js
/usr/bin/time -p test -f dist/index.html

# Publish the built directory for the controller.
/usr/bin/time -p mkdir -p "$WEB_DIR"
/usr/bin/time -p python3 -c "import json; json.dump({'project': '$(pwd)', 'directory': '$(pwd)/dist'}, open('$WEB_DIR/deployment-output.json', 'w'))"
/usr/bin/time -p cat "$WEB_DIR/deployment-output.json"
echo ""

# Serve in the foreground (controller-owned tmux session keeps this alive).
exec python3 -m http.server "$PORT" --directory dist
