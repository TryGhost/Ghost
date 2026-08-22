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

## Casper configuration

Casper is an optional third rail, **off by default**. It speaks the same x402 `exact` scheme over the [Casper Network](https://casper.network), settling in **wCSPR** — a CEP-18 token — through `transfer_with_authorization` calls authorized by EIP-712 typed-data signatures and relayed by the [cspr.cloud facilitator](https://x402-facilitator.cspr.cloud).

Unlike the Base rail, the recipient address cannot be minted by Stripe (Stripe issues no Casper deposit addresses), so the publisher must configure `payTo` explicitly. The settlement asset is a CEP-18 **contract package hash** (64 hex characters), not an `0x` EVM contract address, so `asset` is required too.

Supported values are validated at boot:

- `enabled`: `false` by default; the rail is only registered when this is `true`
- `network`: `casper:casper` (mainnet) or `casper:casper-test` (testnet)
- `facilitatorUrl`: HTTPS URL, defaults to `https://x402-facilitator.cspr.cloud`
- `payTo`: the publisher's Casper account address that receives wCSPR
- `asset`: the 64-character wCSPR CEP-18 contract package hash for the chosen network

Invalid or incomplete Casper config disables the rail at boot with a warning; the x402 (Base) and MPP rails continue to work untouched.

```json
{
  "machinePayments": {
    "casper": {
      "enabled": true,
      "network": "casper:casper",
      "payTo": "<your-casper-account-address>",
      "asset": "<wcspr-cep18-contract-package-hash>"
    }
  }
}
```

For local development against Casper testnet:

```json
{
  "machinePayments": {
    "casper": {
      "enabled": true,
      "network": "casper:casper-test",
      "payTo": "<your-testnet-casper-account-address>",
      "asset": "<testnet-wcspr-cep18-contract-package-hash>"
    }
  }
}
```

Agents that don't speak Casper simply ignore the extra `accepts` entry and pay over an existing rail.

## Architecture boundary

Membership and content gating stay frozen. Adapters only implement `canHandle` / `challenge` / `fulfill`. The orchestrator loads full post HTML and writes `machine_payment_events` only after a successful `fulfill`.
