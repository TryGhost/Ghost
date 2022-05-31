#!/bin/bash

# shellcheck disable=SC1091

set -o errexit
set -o nounset
set -o pipefail
# set -o xtrace # Uncomment this line for debugging purpose

# Load Ghost environment
. /opt/bitnami/scripts/ghost-env.sh

# Load libraries
. /opt/bitnami/scripts/libbitnami.sh
. /opt/bitnami/scripts/liblog.sh
. /opt/bitnami/scripts/libos.sh

print_welcome_page

# Configure libnss_wrapper based on the UID/GID used to run the container
# This container supports arbitrary UIDs, therefore we have do it dynamically
if ! am_i_root; then
    export LNAME="ghost"
    export LD_PRELOAD="/opt/bitnami/common/lib/libnss_wrapper.so"
    if [[ -f "$LD_PRELOAD" ]]; then
        info "Configuring libnss_wrapper"
        NSS_WRAPPER_PASSWD="$(mktemp)"
        export NSS_WRAPPER_PASSWD
        NSS_WRAPPER_GROUP="$(mktemp)"
        export NSS_WRAPPER_GROUP
        echo "ghost:x:$(id -u):$(id -g):Ghost:/home/ghost:/bin/false" >"$NSS_WRAPPER_PASSWD"
        echo "ghost:x:$(id -g):" >"$NSS_WRAPPER_GROUP"
        chmod 400 "$NSS_WRAPPER_PASSWD" "$NSS_WRAPPER_GROUP"
    fi
fi

if [[ "$1" = "/opt/bitnami/scripts/ghost/run.sh" ]]; then
    /opt/bitnami/scripts/mysql-client/setup.sh
    /opt/bitnami/scripts/ghost/setup.sh
    sed -i 's/file/stdout/g' /bitnami/ghost/config.production.json
    /post-init.sh
    info "** Ghost setup finished! **"
fi

echo ""
exec "$@"
