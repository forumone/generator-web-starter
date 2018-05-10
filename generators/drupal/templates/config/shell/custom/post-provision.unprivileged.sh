#!/bin/bash

# Post provision actions that do not require root access.
# This version of the file contains common post-provision steps for Drupal sites.

# Just rename this file to "post-provision.unprivileged.sh" to make it active.

VAGRANT_CORE_FOLDER="/vagrant"
DOCROOT="/vagrant/<%= services.web.doc_root %>"

if [[ -f "${DOCROOT}/sites/default/settings.vm.php" ]]; then
  if [[ ! -f "${DOCROOT}/sites/default/settings.php" || -w "${DOCROOT}/sites/default/settings.php" ]]; then
    echo 'Copying settings file'
    cd ${DOCROOT}/sites/default && cp settings.vm.php settings.php
  fi
fi

if [[ -f "${DOCROOT}/htaccess.dev" ]]; then
  echo 'Copying .htaccess'
  cd ${DOCROOT}/ && cp htaccess.dev .htaccess
fi

if [[ ! -d "/home/vagrant/.drush" ]]; then
  echo 'Creating drush directory'
  mkdir ~/.drush
fi

if [[ ! -f "/home/vagrant/.drush/drush.ini" ]]; then
  echo 'Creating drush settings'
  echo 'memory_limit = 512M' > ~/.drush/drush.ini
fi
