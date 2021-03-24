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
# * base_image (optional) is the base image to compare against. Defaults to stable
# * target_image (optional) is the base image to compare against. Defaults to test
create-compare-step() {
  local scenario=$1
  local label=$2
  local image_1=${3:-stable}
  local image_2=${4:-test}

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
          upload:
            # Upload the HTML diff report.
            - ".buildkite/artifacts/*.html"
            # Upload the compared tar files for easy access if needed for local testing.
            - ".buildkite/artifacts/*/*/*.tgz"
      - docker-compose#v3.7.0:
          run: diff
          debug: true
          workdir: '/artifacts'
          # Run as the root user since Buildkite's filesystem sets root ownership of files by default.
          user: root
          # Disable shell to pass commands directly into the image's entrypoint script.
          shell: false
          command:
            # Don't compare file permissions, created/modified dates, etc.
            - --exclude-directory-metadata=recursive
            # Remove limits for diff output.
            - --no-default-limits
            # Don't compare the tar file used to extract the scenario content.
            - --exclude
            - "${scenario}.tgz"
            # Output results as an HTML file for easy viewing.
            - --html
            - /artifacts/${scenario}.html
            # Include JQuery in the HTML output to suppport collapsing output.
            - --jquery
            - "\${JQUERY_CDN}"
            # Show diff output in the terminal.
            - --text
            - '-'
            # Produce a report file even if no diffs were found.
            - --output-empty
            # Identify the directories to be compared. Starting with the most stable
            # to identify new changes deviating from it.
            - ${image_1}/${scenario}
            - ${image_2}/${scenario}
          volumes:
            - './.buildkite/artifacts:/artifacts'
      - improbable-eng/metahook:
          pre-command: |
            set -ex
            # Extract artifact gzips for direct file comparisons.
            (cd ".buildkite/artifacts/${image_1}/${scenario}" && tar -xf "${scenario}.tgz")
            # Fail if an expected file from the archive is not found.
            [[ -e ".buildkite/artifacts/${image_1}/${scenario}/docker-compose.yml" ]]

            (cd ".buildkite/artifacts/${image_2}/${scenario}" && tar -xf "${scenario}.tgz")
            # Fail if an expected file from the archive is not found.
            [[ -e ".buildkite/artifacts/${image_2}/${scenario}/docker-compose.yml" ]]
          post-command: |
            set -ex
            # Fail if the report file wasn't created as expected.
            [[ -e ".buildkite/artifacts/${scenario}.html" ]]

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
  create-scenario-step "${scenario}" "${scenario_label} (Baseline)" stable >> "${FILE}"
  # create-scenario-step "${scenario}" "${scenario_label} (Next)" next >> "${FILE}"

  # Create an output comparison step.
  create-compare-step "${scenario}" "${scenario_label}" stable test >> "${FILE}"
  # create-compare-step "${scenario}" "${scenario_label}" next test >> "${FILE}"

done

cat "${FILE}"

# Cleanup afterward.
rm "${FILE}"
