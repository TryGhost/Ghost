#!/bin/bash

# Runs the development environment with Ghost receiving Stripe webhooks the way it
# does in production.
#
# In production Ghost gives Stripe a URL to send webhooks to, registered with a fixed
# Stripe API version, so the messages always have the same shape. The usual local
# setup forwards webhooks with Stripe's command line tool instead, which uses the
# account's default API version, so messages can have a shape production never sends.
#
# This script makes Ghost's webhook URL reachable from the internet through Tailscale,
# nothing else on the machine, and tells Ghost to register that URL with Stripe at
# boot. Ghost removes the registration when it shuts down. The site and Admin stay on
# localhost.
#
# Usage: ./docker/stripe/with-remote-webhooks.sh <command>
# Example: ./docker/stripe/with-remote-webhooks.sh pnpm nx run ghost-monorepo:docker:dev

set -euo pipefail

FUNNEL_PORT=443
GATEWAY_PORT=2368
WEBHOOK_PATH=/members/webhooks/stripe

fail() {
    echo ""
    echo "================================================================================"
    echo "ERROR: $1"
    echo ""
    shift
    for line in "$@"; do
        echo "$line"
    done
    echo "================================================================================"
    echo ""
    exit 1
}

[ "$#" -gt 0 ] || fail "no command given" \
    "Usage: $0 <command>" \
    "Example: $0 pnpm nx run ghost-monorepo:docker:dev"

# The macOS app bundle does not put its CLI on PATH.
TAILSCALE=$(command -v tailscale || true)
if [ -z "$TAILSCALE" ] && [ -x /Applications/Tailscale.app/Contents/MacOS/Tailscale ]; then
    TAILSCALE=/Applications/Tailscale.app/Contents/MacOS/Tailscale
fi
[ -n "$TAILSCALE" ] || fail "tailscale is not installed" \
    "Install it from https://tailscale.com/download and sign in, then re-run."

status=$("$TAILSCALE" status --json 2>/dev/null || true)
read -r backend hostname < <(node -e '
    const status = JSON.parse(process.argv[1] || "{}");
    const name = ((status.Self || {}).DNSName || "").replace(/\.$/, "");
    process.stdout.write(`${status.BackendState || "Unknown"} ${name}\n`);
' "$status")

[ "$backend" = "Running" ] || fail "tailscale is not connected (state: $backend)" \
    "Run 'tailscale up' (or open the Tailscale app and sign in), then re-run."
[ -n "$hostname" ] || fail "this node has no MagicDNS name" \
    "Funnel needs MagicDNS and HTTPS certificates enabled for the tailnet." \
    "See https://tailscale.com/kb/1223/funnel"

if [ "$FUNNEL_PORT" = "443" ]; then
    public_origin="https://${hostname}"
else
    public_origin="https://${hostname}:${FUNNEL_PORT}"
fi
export GHOST_STRIPE_WEBHOOK_URL="${public_origin}${WEBHOOK_PATH}/"

# Something is already published on this port: a funnel left running in the
# background, or another copy of this script. Do not take it over.
if "$TAILSCALE" funnel status --json 2>/dev/null | grep -q "\"${hostname}:${FUNNEL_PORT}\""; then
    fail "tailscale funnel is already serving port ${FUNNEL_PORT}" \
        "If nothing else needs it: tailscale funnel --https=${FUNNEL_PORT} off" \
        "If another pnpm dev:stripe:remote is running, stop that first."
fi

echo "Publishing Ghost's Stripe webhook route at ${GHOST_STRIPE_WEBHOOK_URL} via Tailscale Funnel"
echo "Only that path is reachable from the internet, and only while this command runs."
# Run the funnel as a child process without --bg. Tailscale then keeps the URL public
# only while that process lives, so a crash, a closed terminal or a reboot cannot leave
# it published. Tailscale removes the path from the request before forwarding, so the
# target includes the path again for Ghost to route on.
funnel_err=$(mktemp)
"$TAILSCALE" funnel --https="$FUNNEL_PORT" --set-path "$WEBHOOK_PATH" \
    "http://127.0.0.1:${GATEWAY_PORT}${WEBHOOK_PATH}" >/dev/null 2>"$funnel_err" &
funnel_pid=$!

stop_funnel() {
    kill "$funnel_pid" 2>/dev/null || true
    wait "$funnel_pid" 2>/dev/null || true
    rm -f "$funnel_err"
}
# Bash skips the EXIT trap when a signal kills it, so turn signals into exits.
trap stop_funnel EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

funnel_ready=false
for _ in $(seq 1 20); do
    if "$TAILSCALE" funnel status --json 2>/dev/null | grep -q "\"${hostname}:${FUNNEL_PORT}\""; then
        funnel_ready=true
        break
    fi
    kill -0 "$funnel_pid" 2>/dev/null || break
    sleep 0.5
done
if [ "$funnel_ready" != true ]; then
    grep -v 'client version' "$funnel_err" >&2 || true
    fail "tailscale funnel could not be started" \
        "Funnel must be enabled for your tailnet and this node (Tailscale 1.52 or newer)." \
        "See https://tailscale.com/kb/1223/funnel"
fi

# The `stripe` compose profile starts Stripe's command line forwarder. With it running,
# Ghost would use the forwarder instead of registering its own URL, and every event
# would also arrive a second time in the other shape.
profiles="${COMPOSE_PROFILES:-}"
if [ -z "$profiles" ] && [ -f .env ]; then
    profiles=$(grep -E '^COMPOSE_PROFILES=' .env | tail -n1 | cut -d= -f2- | sed -e 's/[[:space:]]*#.*$//' -e "s/^['\"]//" -e "s/['\"]$//" || true)
fi
if [[ ",${profiles}," == *",stripe,"* ]]; then
    echo "Dropping the 'stripe' compose profile: remote webhooks replace stripe listen."
    profiles=$(echo "$profiles" | tr ',' '\n' | grep -vx 'stripe' | paste -sd, - || true)
fi
export COMPOSE_PROFILES="$profiles"

export DEV_COMPOSE_FILES="${DEV_COMPOSE_FILES:-} -f compose.dev.stripe-remote.yaml"

echo "Ghost registers its webhook endpoint at boot once Stripe is connected in Ghost Admin (Settings > Tiers)."
echo "Open the site and Admin on http://localhost:${GATEWAY_PORT} as usual."
echo "Watch the ghost-dev logs: it warns if Stripe is not connected."

# The wrapped command stops the containers before it returns, and Ghost removes its
# Stripe registration during that stop. The funnel is closed after that, on exit.
"$@"
