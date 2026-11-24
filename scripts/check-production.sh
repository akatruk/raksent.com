#!/usr/bin/env bash
# Check the public site from outside: pages, inquiry form, redirects, security headers, TLS and certificates.
# Usage: check-production.sh [--wait-for-revision SHA]
set -euo pipefail

origin="${PRODUCTION_ORIGIN:-https://raksent.com}"
host="${origin#https://}"
expected=""
if [[ "${1:-}" == "--wait-for-revision" ]]; then
  expected="${2:?usage: check-production.sh [--wait-for-revision SHA]}"
fi

failures=0
pass() { echo "ok   $*"; }
fail() { echo "FAIL $*" >&2; failures=$((failures + 1)); }
status_of() { curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$1" 2>/dev/null || true; }
redirect_of() { curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 15 "$1" 2>/dev/null || true; }

if [[ -n "$expected" ]]; then
  deadline=$((SECONDS + ${WAIT_SECONDS:-900}))
  until [[ "$(curl -fsS --max-time 10 "$origin/version" 2>/dev/null || true)" == "$expected" ]]; do
    if (( SECONDS >= deadline )); then
      echo "FAIL production did not serve $expected within ${WAIT_SECONDS:-900}s" >&2
      exit 1
    fi
    sleep 20
  done
  pass "production serves $expected"
else
  echo "info production revision: $(curl -fsS --max-time 10 "$origin/version" 2>/dev/null || echo unknown)"
fi

for path in / /services /methodology /about /contact /privacy /terms /request-assessment /robots.txt /sitemap.xml; do
  status="$(status_of "$origin$path")"
  if [[ "$status" == 200 ]]; then pass "$path"; else fail "$path returned ${status:-no response}"; fi
done

form="$(curl -fsS --max-time 15 "$origin/request-assessment" 2>/dev/null || true)"
if grep -q 'method="post"' <<<"$form"; then pass "inquiry form accepts submissions"; else fail "inquiry form is unavailable"; fi

status="$(status_of "$origin/readyz")"
if [[ "$status" == 404 ]]; then pass "internal readiness endpoint is not public"; else fail "/readyz returned $status"; fi

if [[ "$(redirect_of "http://$host/services")" == "308 $origin/services" ]]; then pass "HTTP redirects to HTTPS"; else fail "HTTP does not redirect to HTTPS"; fi
if [[ "$(redirect_of "https://www.$host/services")" == "301 $origin/services" ]]; then pass "www redirects to the apex"; else fail "www does not redirect to the apex"; fi

headers="$(curl -sS -D - -o /dev/null --max-time 15 "$origin/" 2>/dev/null | tr -d '\r' | tr '[:upper:]' '[:lower:]' || true)"
for header in 'strict-transport-security: max-age=' "content-security-policy: default-src 'none'" \
  "frame-ancestors 'none'" 'x-content-type-options: nosniff' 'referrer-policy: strict-origin-when-cross-origin'; do
  if grep -qF -- "$header" <<<"$headers"; then pass "header $header"; else fail "missing header $header"; fi
done
if grep -qE '^(server|x-powered-by|via):' <<<"$headers"; then fail "response discloses server software"; else pass "no server software headers"; fi

handshake() { openssl s_client -connect "$host:443" -servername "$host" "$@" </dev/null >/dev/null 2>&1; }
for version in tls1_2 tls1_3; do
  if handshake "-$version"; then pass "$version accepted"; else fail "$version rejected"; fi
done
if handshake -tls1_1 -cipher 'DEFAULT:@SECLEVEL=0'; then fail "tls1_1 accepted"; else pass "tls1_1 rejected"; fi

for name in "$host" "www.$host"; do
  certificate="$(openssl s_client -connect "$host:443" -servername "$name" -verify_hostname "$name" -verify_return_error \
    </dev/null 2>/dev/null | openssl x509 2>/dev/null || true)"
  if [[ -z "$certificate" ]]; then
    fail "$name certificate did not verify"
  elif openssl x509 -noout -checkend $((14 * 86400)) >/dev/null <<<"$certificate"; then
    pass "$name certificate valid for at least 14 days"
  else
    fail "$name certificate expires within 14 days"
  fi
done

if (( failures )); then
  echo "$failures production check(s) failed" >&2
  exit 1
fi
echo "All production checks passed"
