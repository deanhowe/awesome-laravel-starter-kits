#!/bin/bash

if [ ! -f "templates.json" ]; then
echo "Error: templates.json file not found"
exit 1
fi

# Validate JSON syntax
if ! jq empty templates.json 2>/dev/null; then
echo "Error: templates.json contains invalid JSON"
exit 1
fi

# Validate structure (must have official and community sections)
if ! jq -e '.official and .community' templates.json >/dev/null; then
echo "Error: templates.json must contain both 'official' and 'community' sections"
exit 1
fi

# Validate that official section contains required fields
if ! jq -e '.official | all(has("title", "package", "repo"))' templates.json >/dev/null; then
    echo "Error: All items in official section must have title, package, and repo fields"
    exit 1
fi

# Validate that community section items contain required fields
if ! jq -e '.community | to_entries[] | .value[] | has("title", "package", "repo")' templates.json >/dev/null; then
    echo "Error: All items in community sections must have title, package, and repo fields"
    exit 1
fi

# Validate that all values are strings (except stack which is optional)
if ! jq -e 'def check_strings: if type == "object" then (if has("title") then .title|type == "string" else true end) and (if has("package") then .package|type == "string" else true end) and (if has("repo") then .repo|type == "string" else true end) else true end; walk(check_strings)' templates.json >/dev/null; then
    echo "Error: title, package, and repo values must be strings"
    exit 1
fi

echo "✅ templates.json is valid"
