#!/bin/bash
set -euo pipefail

# NOTE: This is an overridden copy of the WordPress container's docker-entrypoint.sh.
# It has been modified to:
# 1. not download WP core,
# 2. not handle Apache, and
# 3. not update wp-config based on the environment (we're using .env files for that)

# Removed: Unused "file_env" function

# Removed: user/group assignment

# Removed: code to download WP core if not present (it doesn't recognize the wp-starter layout.)

# Removed: code to create or update wp-config if not present.

TERM=dumb php -- <<'EOPHP'
<?php
// database might not exist, so let's try creating it (just to be safe)

$stderr = fopen('php://stderr', 'w');

// https://codex.wordpress.org/Editing_wp-config.php#MySQL_Alternate_Port
//   "hostname:port"
// https://codex.wordpress.org/Editing_wp-config.php#MySQL_Sockets_or_Pipes
//   "hostname:unix-socket-path"
list($host, $socket) = explode(':', getenv('DB_HOST'), 2);
$port = 0;
if (is_numeric($socket)) {
	$port = (int) $socket;
	$socket = null;
}
$user = getenv('DB_USER');
$pass = getenv('DB_PASSWORD');
$dbName = getenv('DB_NAME');

$maxTries = 10;
do {
	$mysql = new mysqli($host, $user, $pass, '', $port, $socket);
	if ($mysql->connect_error) {
		fwrite($stderr, "\n" . date('c') . ' MySQL Connection Error: (' . $mysql->connect_errno . ') ' . $mysql->connect_error . "\n");
		--$maxTries;
		if ($maxTries <= 0) {
			fwrite($stderr, "\n" . date('c') . ' Connection to MySQL failed.' . "\n");
			exit(1);
		}
		sleep(3);
	}
} while ($mysql->connect_error);

if (!$mysql->query('CREATE DATABASE IF NOT EXISTS `' . $mysql->real_escape_string($dbName) . '`')) {
	fwrite($stderr, "\n" . 'MySQL "CREATE DATABASE" Error: ' . $mysql->error . "\n");
	$mysql->close();
	exit(1);
}

$mysql->close();
EOPHP

echo "Executing php-fpm..."

exec php-fpm
