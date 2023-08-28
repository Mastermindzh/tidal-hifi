#!/bin/bash

if [ "$1" != "" ]; then # check if arg 1 is present
    FILE=$1
else
    echo "Please provide a file as an argument."
    exit 1
fi

SIZES=("16x16" "22x22" "24x24" "32x32" "48x48" "64x64" "128x128" "256x256" "384x384")

echo "Resizing $FILE..."

for i in "${SIZES[@]}"; do
    convert "$FILE" -resize "$i" "$i.png"
done
