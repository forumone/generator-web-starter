import dedent from 'dedent';

export const enableXdebug = dedent(`
  if test ! -z "\${F1_XDEBUG:-}"; then
    docker-php-ext-enable xdebug
    echo 'xdebug.remote_enable=1' > /usr/local/etc/php/conf.d/xdebug.ini
  fi
`);

// The following are interpolations for Docker Compose files, not mistaken backtick
// interpolations.
/* eslint-disable no-template-curly-in-string */
export const xdebugEnvironment: Readonly<Record<string, string>> = {
  XDEBUG_CONFIG: 'remote_host=${F1_XDEBUG_REMOTE:-127.0.0.1}',
};
