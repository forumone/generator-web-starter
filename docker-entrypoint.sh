#!/usr/bin/env bash
set -Eeuo pipefail

# Apply permissions updates to the mounted Docker socket to enable
# the Node user with the `root` group assignment access to Docker.
if [[ $(stat -c '%A' /var/run/docker.sock 2> /dev/null | cut -c 6) != 'w' ]]; then
  chmod g+w /var/run/docker.sock || true
else
  echo 'The Docker socket is unavailable and may be needed.' 1>&2
fi

# Set group ownership on the directory to enable write access.
echo "Assigning group ownership to source files..."
chown -R ":$(id -gn)" "$PWD"
echo "Assigning group write access to source files..."
chmod -R g+w "$PWD"|| true

# first arg is `-f` or `--some-option`
# or there are no args
if [ "$#" -eq 0 ] || [ "${1#-}" != "$1" ]; then
	# docker run bash -c 'echo hi'
	exec bash "$@"
fi

exec "$@"
