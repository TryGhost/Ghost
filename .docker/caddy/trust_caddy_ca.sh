#!/bin/bash

# --- Configuration ---
# !! IMPORTANT: Set this to your Caddy Docker container name or ID !!
CADDY_CONTAINER_NAME="ghost-caddy-1" # PLEASE UPDATE IF YOUR CONTAINER NAME IS DIFFERENT

# Path where Caddy stores its local root CA inside the container
CADDY_INTERNAL_CERT_PATH="/data/caddy/pki/authorities/local/root.crt"

# Temporary path on your host to save the certificate
HOST_TEMP_CERT_PATH="./caddy_local_root_for_keychain.crt"

# Hostnames to ensure are in /etc/hosts
HOSTNAMES_TO_CHECK=("site.ghost" "admin.ghost")
LOOPBACK_IP="127.0.0.1"
HOSTS_FILE="/etc/hosts"
# --- End Configuration ---

# Check if running as root (needed for 'security add-trusted-cert' and /etc/hosts modification)
if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root (e.g., using sudo) to modify the System Keychain and /etc/hosts file."
  exit 1
fi

echo "--- Checking /etc/hosts entries ---"
NEEDS_FLUSH=0
for HOSTNAME in "${HOSTNAMES_TO_CHECK[@]}"; do
    ENTRY="${LOOPBACK_IP} ${HOSTNAME}"
    if grep -qE "^\s*${LOOPBACK_IP}\s+${HOSTNAME}\s*(\#.*)?$" "${HOSTS_FILE}"; then
        echo "Entry for '${HOSTNAME}' already exists in ${HOSTS_FILE}."
    elif grep -qE "^\s*::1\s+${HOSTNAME}\s*(\#.*)?$" "${HOSTS_FILE}"; then
        echo "IPv6 Entry for '${HOSTNAME}' already exists in ${HOSTS_FILE}. Assuming IPv4 is also handled or not strictly needed for local dev."
    else
        echo "Entry for '${HOSTNAME}' not found. Adding '${ENTRY}' to ${HOSTS_FILE}."
        # Add a newline just in case the hosts file doesn't end with one
        echo "" >> "${HOSTS_FILE}"
        echo "${ENTRY}" >> "${HOSTS_FILE}"
        if [ $? -eq 0 ]; then
            echo "Successfully added '${ENTRY}'."
            NEEDS_FLUSH=1
        else
            echo "Error: Failed to add '${ENTRY}' to ${HOSTS_FILE}."
            # Consider exiting if this fails, as Caddy might not work as expected
        fi
    fi
done

if [ ${NEEDS_FLUSH} -eq 1 ]; then
    echo "One or more entries were added to /etc/hosts."
    echo "Consider flushing your DNS cache if you experience issues immediately:"
    echo "sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder"
fi
echo "--- /etc/hosts check complete ---"
echo ""


echo "--- Managing Caddy Local CA Trust ---"
echo "Attempting to copy Caddy's local root CA certificate from container '$CADDY_CONTAINER_NAME'..."

# Step 1: Copy the certificate from the Docker container
docker cp "${CADDY_CONTAINER_NAME}:${CADDY_INTERNAL_CERT_PATH}" "${HOST_TEMP_CERT_PATH}"
if [ $? -ne 0 ]; then
  echo "Error: Failed to copy certificate from Docker container."
  echo "Please ensure the container name '$CADDY_CONTAINER_NAME' is correct and the container is running."
  echo "Also, Caddy needs to have served an HTTPS site at least once to generate its local CA."
  exit 1
fi
echo "Certificate copied successfully to ${HOST_TEMP_CERT_PATH}"

echo "Adding certificate to System Keychain and trusting it..."

# Step 2: Add the certificate to the System Keychain and set trust settings
security add-trusted-cert -d -r trustRoot -k "/Library/Keychains/System.keychain" "${HOST_TEMP_CERT_PATH}"

if [ $? -ne 0 ]; then
  echo "Error: Failed to add or trust the certificate in Keychain."
  echo "You might see a duplicate if a previous version of this CA with the same name was already added but not fully trusted."
  # Clean up the temp cert
  rm -f "${HOST_TEMP_CERT_PATH}"
  exit 1
fi

echo "Certificate successfully added to System Keychain and trusted."

# Step 3: Clean up the temporary certificate file
rm -f "${HOST_TEMP_CERT_PATH}"
echo "Temporary certificate file cleaned up."
echo "--- Caddy Local CA Trust complete ---"

echo ""
echo "Script finished."
echo "IMPORTANT: You may need to restart your web browser(s) for the changes to take full effect, especially for new CA trust."

exit 0