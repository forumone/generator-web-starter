# Miscellanous rules to clean up after ourselves, etc

{% set logdirectories = 'nginx', 'varnish', 'php-fpm' %}

{% for dir in logdirectories %}
logdir-perms-{{dir}}:
  file.directory:
    - name: /var/log/{{ dir }}
    - mode: 755
{% endfor %}

# Install misc packages as required
{% set packages = salt['pillar.get']('extra_packages', False) %}
{% if packages != False %}
install-misc-packages:
  pkg.installed:
    - enablerepo: epel
    - pkgs: {{ packages }}
{% endif %}

# Restart services at end of provision. Dependencies may update and cause
# symbol lookup errors otherwise

restart-running-services-after-provision:
  cmd.run:
    - name: for service in nginx php-fpm httpd varnish mysqld; do pgrep $service >/dev/null && /etc/init.d/$service restart; done
