#!/usr/bin/env bash
# Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... scripts/smoke.sh https://your-api.example.com
set -euo pipefail

API="${1:?Usage: smoke.sh <api-url>}"
API="${API%/}"
: "${ADMIN_EMAIL:?Set ADMIN_EMAIL}"
: "${ADMIN_PASSWORD:?Set ADMIN_PASSWORD}"

NAME="Smoke Check $(date +%s)"

echo "health"
curl -fsS "$API/api/health" > /dev/null

echo "submit inquiry"
curl -fsS -X POST "$API/api/inquiries" -H 'Content-Type: application/json' \
  -d "{\"userType\":\"parent\",\"category\":\"general_query\",\"name\":\"$NAME\",\"email\":\"smoke@example.com\",\"phone\":\"9000000000\",\"message\":\"Smoke test inquiry, safe to ignore.\"}" > /dev/null

echo "login"
TOKEN=$(curl -fsS -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | sed -E 's/.*"token":"([^"]+)".*/\1/')

echo "list and find the new inquiry"
ENCODED=$(printf '%s' "$NAME" | sed 's/ /%20/g')
curl -fsS "$API/api/admin/inquiries?q=$ENCODED" -H "Authorization: Bearer $TOKEN" | grep -q "$NAME"

echo "protected route without token returns 401"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/admin/inquiries")
[ "$CODE" = "401" ]

echo "smoke test passed"
