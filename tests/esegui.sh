#!/usr/bin/env bash
# Esegue tutte le verifiche automatiche di UFinance.
#   tests/esegui.sh            → tutte le suite locali (circa 10 minuti)
#   tests/esegui.sh rapido     → solo riconoscimento vocale (pochi secondi)
#   SITO=fbb89f72 tests/esegui.sh  → in più verifica il sito pubblicato con quella build
#   SUITE="revisione4 investimenti" tests/esegui.sh → solo le suite indicate
# I server di prova avviati qui vengono chiusi alla fine (anche se lo script viene interrotto).
# Requisiti: node + Playwright con Chromium (già presenti nell'ambiente cloud), python3, git.
set -u
cd "$(dirname "$0")/.."
ROOT=$(pwd); T=$ROOT/tests; W=$T/.work
export NODE_PATH=${NODE_PATH:-$(npm root -g 2>/dev/null)}
node "$T/voice_unit.js" > /tmp/uf_voice.txt 2>&1; echo "== riconoscimento vocale: $(grep -c '^PASS' /tmp/uf_voice.txt) PASS, $(grep -c '^FAIL' /tmp/uf_voice.txt) FAIL"
grep '^FAIL' -A1 /tmp/uf_voice.txt | head -20
[ "${1:-}" = "rapido" ] && exit 0

# server di prova dell'app (porta 8765) e dell'aggiornamento (porta 8768): avviati solo se non ci sono già, chiusi alla fine
up() { curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$1/" 2>/dev/null; }
PIDS=""
serve() { python3 -m http.server "$1" --bind 127.0.0.1 --directory "$2" </dev/null >/dev/null 2>&1 & PIDS="$PIDS $!"; }
trap '[ -n "$PIDS" ] && kill $PIDS 2>/dev/null' EXIT INT TERM
mkdir -p "$W/upg" "$W/ver"
[ "$(up 8765)" = "200" ] || serve 8765 "$ROOT/app"
[ "$(up 8768)" = "200" ] || serve 8768 "$W/upg"
# versioni di partenza per il test di aggiornamento (dalla cronologia git)
#  originale = PWA importata dallo zip (build 6ef00147); pubblicata = prima versione su Netlify (c44b2187);
#  online   = versione attualmente pubblicata (ultimo commit che tocca app/, o HEAD se ci sono modifiche non salvate)
if git diff --quiet HEAD -- app; then ONLINE=$(git log -2 --format=%h -- app | tail -1); else ONLINE=HEAD; fi
for v in "originale 6fe0dce" "pubblicata 069c258" "online $ONLINE"; do set -- $v; rm -rf "$W/ver/$1"; mkdir -p "$W/ver/$1"; git archive "$2" app | tar -x -C "$W/ver/$1" --strip-components=1; done
sleep 1
FAILS=0
for s in ${SUITE:-funzioni regressioni investimenti voce_tutorial revisione3 revisione4 schermate_ferme novita3 aggiornamento}; do
  node "$T/$s.js" > "/tmp/uf_$s.txt" 2>&1
  p=$(grep -c '^PASS' "/tmp/uf_$s.txt"); f=$(grep -c '^FAIL' "/tmp/uf_$s.txt")
  if ! grep -qE 'TUTTI PASSATI|FALLITI' "/tmp/uf_$s.txt"; then f=$((f+1)); echo "== $s: interrotto (vedi /tmp/uf_$s.txt)"; else echo "== $s: $p PASS, $f FAIL"; fi
  grep '^FAIL' "/tmp/uf_$s.txt" | head -5; FAILS=$((FAILS+f))
done
if [ -n "${SITO:-}" ]; then NOBADGE=1 node "$T/sito_pubblicato.js" "$SITO" > /tmp/uf_sito.txt 2>&1; echo "== sito pubblicato: $(grep -c '^PASS' /tmp/uf_sito.txt) PASS, $(grep -c '^FAIL' /tmp/uf_sito.txt) FAIL"; grep '^FAIL' /tmp/uf_sito.txt; fi
echo; [ "$FAILS" = 0 ] && echo "TUTTE LE SUITE LOCALI PASSATE" || echo "ATTENZIONE: $FAILS verifiche fallite"
