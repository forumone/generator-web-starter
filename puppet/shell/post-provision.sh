#!/bin/bash

VAGRANT_CORE_FOLDER="/vagrant"

if [[ -f "${VAGRANT_CORE_FOLDER}/Gemfile" ]]; then
  echo 'Installing bundler gems'
  cd "${VAGRANT_CORE_FOLDER}" && bundle install >/dev/null
fi

if [[ -f "${VAGRANT_CORE_FOLDER}/package.json" ]]; then
  echo 'Installing NPM packages'
  cd "${VAGRANT_CORE_FOLDER}" && npm install >/dev/null
fi

if [[ -f "${VAGRANT_CORE_FOLDER}/bower.json" ]]; then
  echo 'Installing bower packages'
  cd "${VAGRANT_CORE_FOLDER}" && bower install >/dev/null
fi

if [[ -f "${VAGRANT_CORE_FOLDER}/puppet/shell/custom/post-provision.sh" ]]; then
  ${VAGRANT_CORE_FOLDER}/puppet/shell/custom/post-provision.sh
fi;

