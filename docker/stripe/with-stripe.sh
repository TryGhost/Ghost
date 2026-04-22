#!/bin/bash

# Wrapper script to run commands with the Stripe profile enabled
# Checks for STRIPE_SECRET_KEY before starting, failing early with helpful error
#
# Usage: ./docker/stripe/with-stripe.sh <command>
# Example: ./docker/stripe/with-stripe.sh nx run ghost-monorepo:docker:dev

set -e

check_stripe_key() {
    # Check environment variable first
    if [ -n "$STRIPE_SECRET_KEY" ]; then
        return 0
    fi

    # Check .env file for non-empty value
    if [ -f .env ] && grep -qE '^STRIPE_SECRET_KEY=.+' .env; then
        return 0
    fi

    return 1
}

if ! check_stripe_key; then
    echo ""
    echo "================================================================================"
    echo "ERROR: STRIPE_SECRET_KEY is not set"
    echo ""
    echo "To use the Stripe service, set STRIPE_SECRET_KEY in your .env file or ENV vars:"
    echo "  STRIPE_SECRET_KEY=sk_test_..."
    echo ""
    echo "You can find your secret key at: https://dashboard.stripe.com/test/apikeys"
    echo "================================================================================"
    echo ""
    exit 1
fi

# Run the command with the stripe profile enabled
export COMPOSE_PROFILES="${COMPOSE_PROFILES:+$COMPOSE_PROFILES,}stripe"
exec "$@"
