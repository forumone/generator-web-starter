#!/usr/bin/env bash

#############################################################################
# Tar generated project output for upload as an artifact.
#
# This script is used as a consolidated step for each scenario execution to
# tar up the generated output for upload as a step artifact. There is special
# handling included to ensure files ignored by version control are excluded.
# For debugging, the list of excluded files is also generated in a .tarignore
# file alongside the tar file for upload as an artifact as well.
#############################################################################

set -exuo pipefail
shopt -s extglob

image=$1
scenario=$2

ARTIFACT_PATH=".buildkite/artifacts/${image}/${scenario}"
TARIGNORE_FILE="${ARTIFACT_PATH}/.tarignore"

# Create an artifact directory to contain all output for this test scenario.
mkdir -p "$ARTIFACT_PATH"

# Build an index of files ignored by git to be excluded from the archive getting uploaded.
# NB. 'git check-ignore' requires execution within a git repository even if it doesn't
#   need to be used.
DIR=$PWD
cd "test/$scenario"
git init
find . | git check-ignore --stdin > "$DIR/$TARIGNORE_FILE"
cd "$DIR"

echo "Ignoring $(wc -l < "$TARIGNORE_FILE") files."

# Create a tar file containing all generated files that will be committed to the repository.
tar -czf "${ARTIFACT_PATH}/${scenario}.tgz" -C "test/${scenario}" --exclude-vcs -X "$TARIGNORE_FILE" .
