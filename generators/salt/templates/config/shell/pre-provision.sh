#!/bin/bash

VAGRANT_CORE_FOLDER="/vagrant"

if [[ -f "${VAGRANT_CORE_FOLDER}/config/shell/custom/pre-provision.sh" ]]; then
  source ${VAGRANT_CORE_FOLDER}/config/shell/custom/pre-provision.sh
fi;

