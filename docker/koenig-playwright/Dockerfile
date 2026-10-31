# check=skip=InvalidDefaultArgInFrom
# The workflow supplies the exact version of the installed @playwright/test.
ARG PLAYWRIGHT_IMAGE
FROM ${PLAYWRIGHT_IMAGE} AS fonts

ENV DEBIAN_FRONTEND=noninteractive

# Download the installer package without executing its unbounded HTTP downloader.
# Ubuntu's manifest supplies the archive URLs and SHA-256 checksums; use HTTPS
# with explicit timeouts, verify each archive, then extract the original fonts.
RUN set -eu; \
    apt-get update -o Acquire::Retries=3 -o Acquire::http::Timeout=30; \
    apt-get install -y --no-install-recommends \
        -o Acquire::Retries=3 -o Acquire::http::Timeout=30 cabextract curl; \
    mkdir /tmp/mscorefonts; \
    cd /tmp/mscorefonts; \
    apt-get download ttf-mscorefonts-installer; \
    dpkg-deb --extract ./*.deb package; \
    awk '/^Url:/ {url=$2; sub(/^http:/, "https:", url)} /^Sha256:/ {print url, $2}' \
        package/usr/share/package-data-downloads/ttf-mscorefonts-installer > downloads; \
    test -s downloads; \
    mkdir -p /usr/share/fonts/truetype/msttcorefonts; \
    while read -r url checksum; do \
        archive="${url##*/}"; \
        curl --fail --location --retry 2 --connect-timeout 10 --max-time 30 \
            --output "$archive" "$url"; \
        printf '%s  %s\n' "$checksum" "$archive" | sha256sum --check -; \
        cabextract --lowercase --directory=/usr/share/fonts/truetype/msttcorefonts "$archive"; \
    done < downloads; \
    cp -a package/usr/share/doc/ttf-mscorefonts-installer /usr/share/doc/

FROM ${PLAYWRIGHT_IMAGE}

# Upstream supplies the browsers and codecs. Add only Koenig's fonts and their
# license documentation, leaving the installer and build tools in the first stage.
COPY --from=fonts /usr/share/fonts/truetype/msttcorefonts/*.ttf /usr/share/fonts/truetype/msttcorefonts/
COPY --from=fonts /usr/share/doc/ttf-mscorefonts-installer /usr/share/doc/ttf-mscorefonts-installer
RUN fc-cache -f && fc-match --format '%{family}' Georgia | grep -Fx Georgia
