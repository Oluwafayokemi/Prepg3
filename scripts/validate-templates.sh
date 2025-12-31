#!/bin/bash
set -e
### Args ###
# $1 - Stacks directory Path
############
if [ "$#" -ne 1 ]
then
  echo -e "Command usage: \n    validate-templates path/to/your/templates/directory"
  exit 1
fi

for TEMPLATE in $(find $1 -type f \( -iname "*.json" -o -iname "*.yaml" \)); do
  echo "Validating $TEMPLATE";
  aws --no-cli-pager cloudformation --region eu-north-1 validate-template --template-body "file://$TEMPLATE";
done