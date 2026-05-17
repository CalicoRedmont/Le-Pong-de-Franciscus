#!/bin/zsh

set -e

cd "$(dirname "$0")"

START_PORT=8766
PORT="$START_PORT"

while lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

URL="http://127.0.0.1:${PORT}/index.html"
LOG_FILE="/tmp/fab-fifty-server-${PORT}.log"

echo "FAB FIFTY - BAD PONG APÉRO SESSION"
echo "Serveur local : $URL"

python3 -m http.server "$PORT" --bind 127.0.0.1 > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

sleep 1

if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="$URL" --start-fullscreen
elif [ -d "/Applications/Chromium.app" ]; then
  open -na "Chromium" --args --app="$URL" --start-fullscreen
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "Microsoft Edge" --args --app="$URL" --start-fullscreen
else
  open "$URL"
  echo "Navigateur lancé en mode standard. Appuie sur Entrée dans le jeu pour passer en plein écran."
fi

echo "Ferme cette fenêtre pour arrêter le serveur."
wait "$SERVER_PID"
