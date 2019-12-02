#!/bin/bash
# Will generate a correctly formatted SRCINFO file

SCRIPT_DIST=".SRCINFO"

# generate SRCINFO
makepkg --printsrcinfo > $SCRIPT_DIST

# replace pkgbase with tidal-hifi-git
pkgName="tidal-hifi-git"
sed -i "1s/.*/pkgbase = $pkgName/" $SCRIPT_DIST

# replace pkgbase with tidal-hifi-git
sed -i '/^pkgname/ d' $SCRIPT_DIST
echo "pkgname = $pkgName" >> $SCRIPT_DIST

# remove double line breaks and replace with single line breaks
sed -i '/^$/N;/^\n$/D' $SCRIPT_DIST
