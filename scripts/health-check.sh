#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:5001}"

probe() {
  local name="$1" url="$2" want="${3:-200}"
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)
  if [ "$code" = "$want" ]; then
    echo "OK   | $name ($code)"
  else
    echo "FAIL | $name expected=$want got=$code"
  fi
}

echo "Health check against: $BASE"

# basic API health
probe "/ping"            "$BASE/ping" 200
probe "/__version"       "$BASE/__version" 200

# public dashboards (adjust to what you deployed)
probe "/auth/role-select.html" "$BASE/auth/role-select.html" 200
probe "/admin.html"            "$BASE/admin.html" 200
probe "/sacco/admin.html"      "$BASE/sacco/admin.html" 200
probe "/matatu/owner.html"     "$BASE/matatu/owner.html" 200
probe "/taxi/index.html"       "$BASE/taxi/index.html" 200

# optional pages you added
probe "/sacco/staff.html"      "$BASE/sacco/staff.html" 200
probe "/matatu/staff.html"     "$BASE/matatu/staff.html" 200
probe "/bodaboda/bodaboda.html" "$BASE/bodaboda/bodaboda.html" 200
probe "/taxy/taxy.html"         "$BASE/taxy/taxy.html" 200
