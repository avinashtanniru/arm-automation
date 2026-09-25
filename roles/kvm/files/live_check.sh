#!/bin/bash
echo "=== Nginx (HTTPS :443 / :80) Connected Clients ==="
out=$(ss -tn state established "( sport = :443 or sport = :80 )" | awk "NR>1 {print \$4}" | rev | cut -d: -f2- | rev | sort | uniq -c)
echo "${out:-  0 connected}"
echo "=== AVM Service (:8080) Connected Clients ==="
out=$(ss -tn state established sport = :8080 | awk "NR>1 {print \$4}" | rev | cut -d: -f2- | rev | sort | uniq -c)
echo "${out:-  0 connected}"
echo "=== Video Stream Viewers (uStreamer) ==="
cnt=$(curl -s --unix-socket /run/kvmd/ustreamer.sock http://localhost/state 2>/dev/null | jq -r ".result.stream.clients" 2>/dev/null)
echo "  Active viewers: ${cnt:-0 (stream idle)}"

curl -s --unix-socket /run/kvmd/ustreamer.sock http://localhost/state | jq .result.stream