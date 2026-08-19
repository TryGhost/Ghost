# Machine payments

Accept pay-per-request access to paid-members markdown (`.md`) URLs from AI agents via Stripe [Machine Payments](https://docs.stripe.com/payments/machine).

## Product fences (v1)

- **Protocol:** Machine Payments Protocol (MPP) — Tempo USDC + Shared Payment Tokens (card / Link Agent Wallet). x402 (Base USDC via ExactEvmScheme) is a second adapter behind the same payment-authorization boundary; agents that don't speak it ignore it. Neither rail changes membership.
- **Access model:** One-shot unlock of markdown bytes for that request. No member session, tier grant, or change to `content-gating` / Portal.
- **Surface:** Explicit `.md` URLs only. Accept-header markdown stays public-only. HTML theme views and the Content API stay membership-gated.
- **Pricing:** Site-wide amount. SPT charges use the configured fiat currency (Stripe card minimum applies). Tempo charges USDC using the same minor-unit amount; publishers should treat the crypto rail as USDC, not as on-chain publisher currency.
- **Eligibility:** `visibility: paid`, or `visibility: tiers` where every related tier is paid. Free-members-only (`visibility: members`) is out of scope.
- **Enablement:** Labs `machinePayments` + `llms_enabled` + `machine_payments_enabled` + Stripe connected.

## Publisher prerequisites

- Stripe Connect (or direct keys) on the site.
- For SPT / cards: US or Canada legal entity; Stripe business profile (`networkId` / profile id) configured.
- For Tempo stablecoin: Stablecoins and Crypto payment method approved in Stripe. Not available for NY businesses; other countries may need Stripe to enable access.
- For x402 (Base USDC): Stablecoins and Crypto payment method approved in Stripe (Base deposit address, same as other crypto rails).
- `llms.txt` must remain enabled — agent discovery and `.md` routes depend on it.

## x402 configuration

Defaults target **Base mainnet** (`eip155:8453`) with real USDC settlement via the public [xpay facilitator](https://facilitator.xpay.sh) (no account or API key). Override `machinePayments.x402.facilitatorUrl` for a different provider — e.g. [Coinbase CDP](https://docs.cdp.coinbase.com/x402/docs/quickstart-sellers) for managed compliance screening (requires API keys; not wired in Ghost yet).

Supported values are validated at boot:

- `network`: `eip155:8453` (Base mainnet) or `eip155:84532` (Base Sepolia)
- `stripeNetwork`: `base`
- `facilitatorUrl`: HTTPS URL; mainnet cannot use the x402.org testnet facilitator

Invalid x402 config disables the rail at boot (MPP continues to work).

For local development against the x402.org testnet facilitator, override in `config.local.json`:

```json
{
  "machinePayments": {
    "x402": {
      "network": "eip155:84532",
      "facilitatorUrl": "https://x402.org/facilitator"
    }
  }
}
```

To use a different mainnet facilitator:

```json
{
  "machinePayments": {
    "x402": {
      "facilitatorUrl": "https://your-mainnet-facilitator.example/facilitator"
    }
  }
}
```

If x402 challenges are missing from 402 responses while MPP works, check Ghost logs for x402 warnings (network/facilitator mismatch is the usual cause).

## Architecture boundary

Membership and content gating stay frozen. Adapters only implement `canHandle` / `challenge` / `fulfill`. The orchestrator loads full post HTML and writes `machine_payment_events` only after a successful `fulfill`.
