import dedent from 'dedent';

// http://xdebug.org/docs/all_settings#remote_enable
export const enableXdebug = dedent(`
  if test ! -z "\${F1_XDEBUG:-}"; then
    docker-php-ext-enable xdebug
    echo 'xdebug.remote_enable=1' > /usr/local/etc/php/conf.d/xdebug.ini
  fi
`);

// http://xdebug.org/docs/all_settings#profiler_enable_trigger
export const enableXdebugProfiler = dedent(`
  if test ! -z "\${F1_XDEBUG_PROFILE:-}"; then
    docker-php-ext-enable xdebug
    if test ! -d "/var/www/html/_profiles"; then
      mkdir /var/www/html/_profiles
    fi
    chmod -R 0777 /var/www/html/_profiles
    echo 'xdebug.profiler_enable_trigger=1' > /usr/local/etc/php/conf.d/xdebug.ini
    echo "xdebug.profiler_output_dir='/var/www/html/_profiles'" >> /usr/local/etc/php/conf.d/xdebug.ini
    echo 'max_execution_time=100' >> /usr/local/etc/php/conf.d/xdebug.ini
  fi
`);

// The following are interpolations for Docker Compose files, not mistaken backtick
// interpolations.
/* eslint-disable no-template-curly-in-string */
export const xdebugEnvironment: Readonly<Record<string, string>> = {
  XDEBUG_CONFIG: 'remote_host=${F1_XDEBUG_REMOTE:-127.0.0.1}',
};
