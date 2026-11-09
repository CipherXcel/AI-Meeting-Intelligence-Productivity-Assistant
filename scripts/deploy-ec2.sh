#!/usr/bin/env bash
set -euo pipefail
umask 077
sha=${1:?Commit SHA required}
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || exit 1
base=/home/ubuntu/agentbuddy
export PATH="$base/runtime/node-v24.22.2-linux-x64/bin:$PATH"
exec 9>"$base/deploy.lock"
flock -n 9 || { echo 'Another deployment is running'; exit 1; }
old=$(systemctl show agentbuddy.service -p WorkingDirectory --value)
old=${old%/backend}
[[ "$old" == "$base/releases/"* && -f "$old/backend/.env" ]] || exit 1
release="$base/releases/$sha"
archive="/tmp/agentbuddy-$sha.tgz"
test -f "$archive"
test ! -e "$release" || { echo 'This release already exists; use a new commit'; exit 1; }
free=$(df -Pk "$base" | awk 'NR==2 {print $4}')
(( free > 3000000 )) || { echo 'Need at least 3 GB free before deployment'; exit 1; }
backup="$base/backups/ci-$sha"
mkdir -p "$backup" "$release"
sudo docker exec meetagent-postgres pg_dump -U agentbuddy_app_20261030 -d agentbuddy_20261030 -Fc > "$backup/database.dump"
test -s "$backup/database.dump"
sudo docker exec -i meetagent-postgres pg_restore --list < "$backup/database.dump" > "$backup/database-manifest.txt"
tar -xzf "$archive" -C "$release"
[[ "$(cat "$release/frontend/out/release.txt")" == "$sha" ]]
cp "$old/backend/.env" "$release/backend/.env"
cd "$release"
npm ci --omit=dev --no-fund
node --check backend/dist/index.js
override=/etc/systemd/system/agentbuddy.service.d/20-release.conf
sudo cp "$override" "$backup/previous-override.conf"
rollback() {
  trap - ERR HUP INT TERM
  sudo cp "$backup/previous-override.conf" "$override"
  sudo systemctl daemon-reload
  sudo systemctl restart agentbuddy.service
  echo 'Deployment failed; previous application release restored. Database backup retained.' >&2
  exit 1
}
trap rollback ERR HUP INT TERM
printf '[Service]\nWorkingDirectory=%s/backend\nExecStart=\nExecStart=%s/runtime/node-v24.22.2-linux-x64/bin/node %s/backend/dist/index.js\n' "$release" "$base" "$release" > "$backup/new-override.conf"
sudo install -m 644 "$backup/new-override.conf" "$override"
sudo systemctl daemon-reload
sudo systemctl restart agentbuddy.service
healthy=false
for attempt in {1..20}; do
  if curl --max-time 3 -fsS http://127.0.0.1:4100/api/health >/dev/null && [[ "$(curl --max-time 3 -fsS http://127.0.0.1:4100/release.txt)" == "$sha" ]]; then healthy=true; break; fi
  sleep 2
done
[[ "$healthy" == true ]]
trap - ERR HUP INT TERM
rm -f "$archive"
printf 'Deployed %s successfully\n' "$sha"
