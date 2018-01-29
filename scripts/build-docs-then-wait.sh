#!/bin/bash

# -
# This script is a simple extension of 'build-docs-local.sh'; all it does is add
# an infinite sleep/wait after the docs have been built so that the script
# never terminates. The point is to allow execution and source watching via
# PM2 for continuous documentation updates during development.
#
# You should never need to run this script directly...
# -

# Find our path...
MY_SCRIPT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run the main script
"$MY_SCRIPT_PATH/build-docs-local.sh"


# Say something
echo " "
echo " "

printf "%-17s" " "
printf "\e[1;30m%s\e[m" "Docs built; Waiting for source updates..."
printf "%-18s" " "
printf "\n"

# Blank Line
printf "\n"

# Now we wait...
sleep infinity

