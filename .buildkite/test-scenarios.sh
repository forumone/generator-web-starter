#!/usr/bin/env bash

#############################################################################
# Assemble test scenario steps to upload to the buildkite agent.
#
# Test scenarios are defined and should match to directories found at
# test/<scenario> containing a .yo-rc.json file to support uninteractive
# generator execution.
#
# For each test scenario a scenario execution step, and a comparison step
# is generatated and appended to the test-scenarios.yml file that serves as
# a stub for defining defaults and environment variables to be used in
# all steps.
#############################################################################

set -euo pipefail
shopt -s extglob

# The versions of Buildkite plugins to be used.
DOCKER_COMPOSE_PLUGIN_VERSION="v3.7.0"
DOCKER_COMPOSE_PLUGIN="docker-compose#${DOCKER_COMPOSE_PLUGIN_VERSION}"

# This is the list of test scenarios intended for execution. Each scenario identifier
# corresponds to a directory within test/ that is expected to contain a set of Yeoman
# configuration at test/<scenario>/.yo-rc.json.
declare -A test_scenarios=(
  # [test_directory]=<label>
  ['d8-standard']='D8: Standard'
  ['d8-pantheon']='D8: Pantheon'
  ['wp-standard']='WP: Standard'
)

# Usage: create-scenario-step <scenario_name> <scenario_label> <image>
# * scenario_name is a directory name at test/<scenario_name>
# * scenario_label is a readable label to display for this test scenario
# * image (optional) is the base image to use for the test. Options: test | stable | next
create-scenario-step() {
  local scenario=$1
  local label=$2
  local image=${3:-test}

  # Output the Buildkite step for building this scenario using the step template
  # defined in the base template file.
  cat <<YAML
  - <<: *step-defaults
    <<: *docker-agents
    label: ":node: ${label}"
    key: "${image}_${scenario//-/_}"
    depends_on: "${image}_image"
    artifact_paths:
      - .buildkite/artifacts/**/*
    env:
      SCENARIO: ${scenario}
    command: yo --no-insight web-starter --force --debug --uninteractive
    plugins:
      - *ecr
      - ${DOCKER_COMPOSE_PLUGIN}:
          run: "${image}"
          debug: true
      - improbable-eng/metahook:
          pre-artifact: .buildkite/tar-generator-output.sh $image $scenario

YAML
}

# Usage: create-compare-step <scenario_name> <scenario_label> <base_image> <target_image>
# * scenario_name is a directory name at test/<scenario_name>
# * scenario_label is a readable label to display for this test scenario
# * base_image (optional) is the base image to compare against. Defaults to test
# * target_image (optional) is the base image to compare against. Defaults to stable
create-compare-step() {
  local scenario=$1
  local label=$2
  local image_1=${3:-test}
  local image_2=${4:-stable}

  # Output the Buildkite step for building this scenario using the step template
  # defined in the base template file.
  cat <<YAML

  - label: ':mag: Compare: ${label}'
    <<: *step-defaults
    <<: *docker-agents
    depends_on:
      - '${image_1}_${scenario//-/_}'
      - '${image_2}_${scenario//-/_}'
    env:
      SCENARIO: ${scenario}
    plugins:
      # Download the tarball into the test directory for use building the Docker image.
      - artifacts#v1.3.0:
          download: ".buildkite/artifacts/**/${scenario}/${scenario}.tgz"
          upload: ".buildkite/artifacts/${scenario}.html"
      - docker-compose#v3.7.0:
          run: diff
          debug: true
          workdir: '/artifacts'
          # Run as the root user since Buildkite's filesystem sets root ownership of files by default.
          user: root
          # Disable shell to pass commands directly into the image's entrypoint script.
          shell: false
          command:
            - --exclude-directory-metadata=recursive
            - --no-default-limits
            - --new-file
            - --exclude
            - "${scenario}.tgz"
            - --html
            - /artifacts/${scenario}.html
            - ${image_1}/${scenario}
            - ${image_2}/${scenario}
          volumes:
            - './.buildkite/artifacts:/artifacts'
      - improbable-eng/metahook:
          pre-command: |
            set -ex
            # Extract artifact gzips for direct file comparisons.
            $(cd ".buildkite/artifacts/${image_1}/${scenario}" && tar -xf "${scenario}.tgz")
            ls ".buildkite/artifacts/${image_1}/${scenario}"

            $(cd ".buildkite/artifacts/${image_2}/${scenario}" && tar -xf "${scenario}.tgz")
            ls ".buildkite/artifacts/${image_2}/${scenario}"

YAML
}

# Make the pipeline file to upload starting from the stub file defining templates and defaults.
FILE=$(mktemp "${BUILDKITE_PIPELINE_SLUG:-generator-web-starter}--${BUILDKITE_BUILD_NUMBER:-000}--test-scenarios.tmp-XXXXXX")
cat ".buildkite/test-scenarios.yml" > "${FILE}"

# For each key (i.e., scenario name), we output a Buildkite pipeline step to be uploaded
# via the agent.
for scenario in "${!test_scenarios[@]}"; do
  scenario_label="${test_scenarios[${scenario}]}"

  # Create the current build's scenario step.
  create-scenario-step "$scenario" "${scenario_label}" test >> "${FILE}"

  # Create a baseline scenario step.
  # TODO: Make execution of these additional steps dynamic.
  # create-step "${scenario}" "${scenario_label} (Baseline)" stable >> "${FILE}"
  create-scenario-step "${scenario}" "${scenario_label} (Next)" next >> "${FILE}"

  # Create an output comparison step.
  create-compare-step "${scenario}" "${scenario_label}" test next >> "${FILE}"

done

cat "${FILE}"

# Cleanup afterward.
rm "${FILE}"
