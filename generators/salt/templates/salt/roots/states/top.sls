base:
  '*':
    - core
    - epel
    - jinja26
    - node
    - node.npm-install
    - ruby
#    Load mysql.client first to avoid getting mysql-libs from base repo
    - mysql.client
    - mysql
    - memcached.config
<% if (webserver == 'nginx') { %>
    - nginx.ng
<% } %>
    - varnish.repo
    - varnish
    - php.ng
    - php.ng.cli.ini
<% if (webserver == 'nginx' || webserver == 'apache24') { %>
    - php.ng.fpm.pools
<% } %>
<% if (webserver == 'apache') { %>
    - core.certificates
    - apache.mod_ssl
    - apache.mod_php5
    - apache.config
    - apache.vhosts.standard
<% } %>
<% if (webserver == 'apache24') { %>
    - core.certificates
    - apache.mod_ssl
    - apache.config
    - apache.vhosts.standard
    - apache.modules
<% } %>
    - composer
<% if (platform == 'drupal' || platform == 'drupal8') { %>
    - drush
<% } %>
<% if (platform == 'wordpress') { %>
    - wpcli
<% } %>
<% if (search != '') { %>
    - java
<% } %>
<% if (search == 'solr3') { %>
    - solr.v3
<% } %>
<% if (search == 'solr4') { %>
    - solr.v4
<% } %>
<% if (search == 'elasticsearch') { %>
    - elasticsearch
<% } %>
    - mailhog
    - core.cleanup
