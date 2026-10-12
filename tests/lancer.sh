#!/bin/bash
# Lance toute la série de tests hors ligne (faux Apps Script + Chromium/Playwright).
# Usage : bash tests/lancer.sh   (depuis la racine du dépôt)
cd "$(dirname "$0")/.." || exit 1
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
echec=0
for t in tests/test_*.js; do
  sortie=$(node "$t" "$PWD" 2>&1 | tail -1)
  case "$sortie" in *": OK"|*"CONFIG client relu: true"*) echo "✅ $(basename "$t")";; *) echo "❌ $(basename "$t") — $sortie"; echec=1;; esac
done
exit $echec
