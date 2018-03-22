nginx:
  ng:
    vhosts:
      managed:
        vagrant.conf:
          enabled: True
          config:
            - server:
              - server_name: localhost
              - listen: 8080 default_server
              - listen: 443 ssl default_server
              - index: index.html index.htm
              - ssl_certificate: ssl/vagrant.crt
              - ssl_certificate_key: ssl/vagrant.key
              - root: {{ document_root }}
              - access_log: /var/log/nginx/vagrant.log
              - location /:
                - try_files: $uri $uri/ $uri/index.html
