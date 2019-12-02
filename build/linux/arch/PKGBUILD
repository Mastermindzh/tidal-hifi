# Maintainer: Rick van Lieshout <info@rickvanlieshout.com>

_pkgname=tidal-hifi
pkgname="$_pkgname"
pkgver=0.5
pkgrel=1
pkgdesc="The web version of listen.tidal.com running in electron with hifi support thanks to widevine."
arch=("x86_64")
url="https://github.com/Mastermindzh/tidal-hifi"
license=("custom:MIT")

depends=("libxss" "nss" "gtk3")
makedepends=("npm" "git")
provides=("$_pkgname")

source=("https://github.com/Mastermindzh/tidal-hifi/archive/$pkgver.zip"
        "${_pkgname}.desktop")
sha512sums=('a25a9189a10aa35a62ad41299792909b0ac6547544802ef9d1f58d6d0bff75b4d364975c81d5a4d73eabf64bdb772c3823c3b3cd58540d40acaedf6594033f61'
            'fa5fa918ea890baa5f500db3153a6eff3d63966528ffa3349acda3ea02fbecb1ea78a1ba1d23ef7402de2228fc0a483252e0b7e72c73cfb25ed401bedaf856f5')

cdToPkg(){
    cd "tidal-hifi-$pkgver"
}

prepare() {
    cdToPkg

    # install build dependencies
    npm install
}

build() {
    cdToPkg

    # We are not using the systems Electron as we need castlab's Electron.
    npx electron-builder --linux dir
}

package() {
    cdToPkg

    install -d "${pkgdir}/opt/${_pkgname}/" "${pkgdir}/usr/bin" "${pkgdir}/usr/share/doc" "${pkgdir}/usr/share/licenses"

    cp -r dist/linux-unpacked/* "${pkgdir}/opt/${_pkgname}/"
    chmod +x "${pkgdir}/opt/${_pkgname}/${_pkgname}"

    ln -s "/opt/${_pkgname}/${_pkgname}" "${pkgdir}/usr/bin/${_pkgname}"

    install -Dm 644 "build/icon.png" "${pkgdir}/usr/share/pixmaps/${_pkgname}.png"
    install -Dm 644 "${srcdir}/${_pkgname}.desktop" "${pkgdir}/usr/share/applications/${_pkgname}.desktop"

    install -Dm 644 "README.md" "${pkgdir}/usr/share/doc/${pkgname}/README.md"
    install -Dm 644 "LICENSE" "${pkgdir}/usr/share/licenses/${pkgname}/LICENSE"
    ln -s "/opt/${_pkgname}/LICENSE.electron.txt" "${pkgdir}/usr/share/licenses/${pkgname}/LICENSE.electron.txt"
    ln -s "/opt/${_pkgname}/LICENSES.chromium.html" "${pkgdir}/usr/share/licenses/${pkgname}/LICENSES.chromium.html"
}
