#!/usr/bin/env bash

# Variables
#JSDOC_PATH="./node_modules/@lukechavers/jsdoc/node_modules/jsdoc/jsdoc.js"
JSDOC_PATH="./node_modules/jsdoc/jsdoc.js"
CONFIG_PATH="./docs/config/jsdoc-html-local.json"
DOC_ROOT_PATH="./docs/html"
DOC_DEST_PATH="$DOC_ROOT_PATH/latest"
TEMPLATE_PATH="./node_modules/@lukechavers/jsdoc"
TUTORIAL_PATH="./docs/tutorials"

# Say Hello
echo " "
echo " > Clearing existing docs at '$DOC_ROOT_PATH'"
echo " "

rm -rf "$DOC_ROOT_PATH"

echo " "
echo " > Building Docs at '$DOC_DEST_PATH'"
echo " "

"$JSDOC_PATH" \
    --configure "$CONFIG_PATH" \
    --destination "$DOC_DEST_PATH" \
    --template "$TEMPLATE_PATH" \
    --tutorials "$TUTORIAL_PATH" \
    --recurse \
    --verbose

#"$JSDOC_PATH" --help
