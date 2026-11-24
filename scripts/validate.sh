#!/usr/bin/env bash
# Run dependency-free checks from any working directory.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

bash -n scripts/inventory.sh scripts/validate.sh
node --test tests/website.test.mjs tests/theme.test.mjs
node --check applications/portal/public/portal.js
python3 - <<'PY'
from pathlib import Path

for filename in ("applications/api/app.py", "tests/portal_smoke.py"):
    source = Path(filename).read_bytes()
    compile(source, filename, "exec")
PY
