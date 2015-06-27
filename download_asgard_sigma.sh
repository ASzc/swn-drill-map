#!/bin/sh

set -e
set -u

local_file="asgard_sigma.html"

curl -sS 'https://dl.dropboxusercontent.com/u/146314/asgard_sigma/galactic_encyclopedia.html' | iconv -f "ISO-8859-2" -t "utf-8" - > "$local_file"

echo "Success, see $local_file"
