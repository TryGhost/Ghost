#!/bin/bash

# --- Configuration ---
# !! IMPORTANT: Set this to your Caddy Docker container name or ID !!
CADDY_CONTAINER_NAME="ghost-caddy" # PLEASE UPDATE IF YOUR CONTAINER NAME IS DIFFERENT

# Path where Caddy stores its local root CA inside the container
CADDY_INTERNAL_CERT_PATH="/data/caddy/pki/authorities/local/root.crt"

# Temporary path on your host to save the certificate
HOST_TEMP_CERT_PATH="./caddy_local_root_for_keychain.crt"
# --- End Configuration ---

# Check if running as root (needed for 'security add-trusted-cert' and /etc/hosts modification)
if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root (e.g., using sudo) to modify the System Keychain."
  exit 1
fi

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
echo "IMPORTANT: You may need to restart your web browser(s) and/or clear your browser cache for the changes to take full effect."

exit 0