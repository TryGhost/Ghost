#!/bin/sh

# Entrypoint script for the Stripe CLI service in compose.yml
## This script fetches the webhook secret from Stripe CLI and writes it to a shared config file
## that the Ghost server can read to verify webhook signatures.

# Note: the stripe CLI container is based on alpine, hence `sh` instead of `bash`.
set -eu

# Initialize child process variable
child=""

# Handle shutdown signals gracefully.
_term() {
    echo "Caught SIGTERM/SIGINT signal, shutting down gracefully..."
    if [ -n "$child" ]; then
        kill -TERM "$child" 2>/dev/null || true
        wait "$child" 2>/dev/null || true
    fi
    exit 0
}

# Set up signal handlers (POSIX-compliant signal names)
trap _term TERM INT

# Check if STRIPE_SECRET_KEY is set
if [ -z "${STRIPE_SECRET_KEY:-}" ]; then
    echo "ERROR: STRIPE_SECRET_KEY is not set" >&2
    echo "" >&2
    echo "To use the Stripe service, you must set STRIPE_SECRET_KEY in your .env file:" >&2
    echo "  STRIPE_SECRET_KEY=sk_test_..." >&2
    echo "" >&2
    echo "You can find your secret key at: https://dashboard.stripe.com/test/apikeys" >&2
    exit 1
fi

echo "Using STRIPE_SECRET_KEY for authentication"

# Fetch the webhook secret with timeout
echo "Fetching Stripe webhook secret..."
WEBHOOK_SECRET=$(timeout 10s stripe listen --print-secret --api-key "${STRIPE_SECRET_KEY}" 2>&1 || echo "TIMEOUT")

# Check if we got a timeout
if [ "$WEBHOOK_SECRET" = "TIMEOUT" ]; then
    echo "ERROR: Timed out waiting for Stripe CLI (10s)" >&2
    echo "Please check that your STRIPE_SECRET_KEY is valid" >&2
    exit 1
fi

# Check if we got a valid secret (should start with "whsec_")
if echo "$WEBHOOK_SECRET" | grep -q "^whsec_"; then
    echo "Successfully fetched webhook secret"
else
    echo "ERROR: Failed to fetch Stripe webhook secret" >&2
    echo "Output: $WEBHOOK_SECRET" >&2
    echo "Please ensure STRIPE_SECRET_KEY is set in your environment" >&2
    exit 1
fi

# Write the webhook secret to the shared config file
ENV_FILE="/mnt/shared-config/.env.stripe"
TMP_ENV_FILE="/mnt/shared-config/.env.stripe.tmp"

echo "Writing Stripe configuration to $ENV_FILE..."

cat > "$TMP_ENV_FILE" << EOF
STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET
EOF

if [ $? -eq 0 ]; then
    mv "$TMP_ENV_FILE" "$ENV_FILE"
    if [ $? -eq 0 ]; then
        echo "Successfully wrote Stripe configuration to $ENV_FILE"
    else
        echo "ERROR: Failed to move temporary file to $ENV_FILE" >&2
        exit 1
    fi
else
    echo "ERROR: Failed to create temporary configuration file" >&2
    rm -f "$TMP_ENV_FILE"
    exit 1
fi

# Start stripe listen in the background
echo "Starting Stripe webhook listener forwarding to http://server:2368/members/webhooks/stripe/"
stripe listen --forward-to http://server:2368/members/webhooks/stripe/ --api-key "${STRIPE_SECRET_KEY}" &
child=$!

# Wait for the child process
wait "$child"
