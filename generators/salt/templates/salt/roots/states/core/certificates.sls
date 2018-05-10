default_vagrant_ssl_cert:
  file.managed:
    - name: /etc/pki/tls/certs/vagrant.crt
    - makedirs: True
    - contents_pillar: nginx:ng:certificates:vagrant:public_cert

default_vagrant_ssl_key:
  file.managed:
    - name: /etc/pki/tls/private/vagrant.key
    - mode: 600
    - makedirs: True
    - contents_pillar: nginx:ng:certificates:vagrant:private_key

nuke_apache_default_ssl:
  file.managed:
    - name: /etc/httpd/conf.d/ssl.conf
    - makedirs: True
    - contents:
      - '# defaults handled in formula. Disabling rpm-provided ssl.conf'
