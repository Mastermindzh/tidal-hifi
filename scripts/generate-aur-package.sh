#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

version="${1:-${VERSION:-}}"
commit_sha="${2:-${GITHUB_SHA:-}}"

if [[ -z "$version" ]]; then
  version="$(node -p "require('./package.json').version")"
fi

if [[ -z "$commit_sha" ]]; then
  commit_sha="$(git rev-parse --short HEAD)"
else
  commit_sha="${commit_sha:0:7}"
fi

pkgver="${version}.r0.g${commit_sha}"

mkdir -p .aur
cp packaging/aur/tidal-hifi.desktop .aur/tidal-hifi.desktop
cp packaging/aur/tidal-hifi.xml .aur/tidal-hifi.xml

cat > .aur/PKGBUILD <<PKGBUILD
# Maintainer: Rick van Lieshout <info@rickvanlieshout.com>

pkgname=tidal-hifi-git
pkgrel=1
pkgver=${pkgver}
pkgdesc="The web version of tidal.com running in electron with hifi support thanks to widevine"
arch=(x86_64)
url="https://github.com/Mastermindzh/tidal-hifi"
license=("custom:MIT")
depends=(libxss nss gtk3 libxcrypt-compat libnotify)
makedepends=(git)
provides=(tidal-hifi)
conflicts=(tidal-hifi)

source=("git+https://github.com/Mastermindzh/tidal-hifi.git"
    "tidal-hifi.desktop"
    "tidal-hifi.xml")
sha512sums=('SKIP'
    'SKIP'
    'SKIP')

getnvm() {
    if command -v nvm; then
        echo "nvm command found, using system version.."
    else

        if test -f "/usr/share/nvm/init-nvm.sh"; then
            echo "found init-nvm.sh in /usr/share/nvm, sourcing..."
            unset npm_config_prefix
            source "/usr/share/nvm/init-nvm.sh"
        else
            echo "nvm could not be found, installing"
            unset npm_config_prefix
            folderName=\$(cat /dev/urandom | tr -cd 'a-f0-9' | head -c 12)
            git clone https://aur.archlinux.org/nvm.git "\$folderName"
            cd "\$folderName" || exit
            makepkg -si --asdeps
            source /usr/share/nvm/init-nvm.sh
            cd ../
            rm -rf "\$folderName"
        fi
    fi
}

pkgver() {
    cd "\${srcdir}/\${pkgname%-git}" || exit
    git describe --long --tags | sed 's/\([^-]*-g\)/r\1/;s/-/./g'
}

prepare() {
    getnvm

    cd "\${srcdir}/\${pkgname%-git}" || exit

    # use correct nodejs/npm versions
    nvm install lts/jod
    nvm use lts/jod

    # install build dependencies
    npm install
}

build() {
    getnvm

    cd "\${srcdir}/\${pkgname%-git}" || exit

    # We are not using the systems Electron as we need castlab's Electron.
    npm run build-arch
}

package() {
    cd "\${srcdir}/\${pkgname%-git}" || exit

    install -d "\${pkgdir}/opt/tidal-hifi/" "\${pkgdir}/usr/bin" "\${pkgdir}/usr/share/doc" "\${pkgdir}/usr/share/licenses"

    cp -r dist/linux-unpacked/* "\${pkgdir}/opt/tidal-hifi/"
    chmod +x "\${pkgdir}/opt/tidal-hifi/tidal-hifi"

    ln -s "/opt/tidal-hifi/tidal-hifi" "\${pkgdir}/usr/bin/tidal-hifi"

    install -Dm 644 "build/icon.png" "\${pkgdir}/usr/share/pixmaps/tidal-hifi.png"
    for iconPath in build/icons/[0-9]*x[0-9]*.png; do
        iconSize="\${iconPath##*/}"
        iconSize="\${iconSize%.png}"
        # Only install icons whose name is a valid "WxH" size to avoid creating invalid hicolor directories.
        if [[ ! "\$iconSize" =~ ^[0-9]+x[0-9]+\$ ]]; then
            continue
        fi
        install -Dm 644 "\$iconPath" "\${pkgdir}/usr/share/icons/hicolor/\$iconSize/apps/tidal-hifi.png"
    done
    install -Dm 644 "\${srcdir}/tidal-hifi.desktop" "\${pkgdir}/usr/share/applications/tidal-hifi.desktop"
    install -Dm 644 "\${srcdir}/tidal-hifi.xml" "\${pkgdir}/usr/share/mime/packages/tidal-hifi.xml"

    install -Dm 644 "README.md" "\${pkgdir}/usr/share/doc/\${pkgname}/README.md"
    install -Dm 644 "LICENSE" "\${pkgdir}/usr/share/licenses/\${pkgname}/LICENSE"

    ln -s "/opt/tidal-hifi/LICENSE.electron.txt" "\${pkgdir}/usr/share/licenses/\${pkgname}/LICENSE.electron.txt"
    ln -s "/opt/tidal-hifi/LICENSES.chromium.html" "\${pkgdir}/usr/share/licenses/\${pkgname}/LICENSES.chromium.html"
}
PKGBUILD
