# Machine payments

Accept pay-per-request access to paid-members markdown (`.md`) URLs from AI agents via Stripe [Machine Payments](https://docs.stripe.com/payments/machine).

## Product fences (v1)

- **Protocol:** Machine Payments Protocol (MPP) only in v1 — Tempo USDC + Shared Payment Tokens (card / Link Agent Wallet). Additional adapters (e.g. x402) may land later behind the same payment-authorization boundary; they are not shipping here and do not change membership.
- **Access model:** One-shot unlock of markdown bytes for that request. No member session, tier grant, or change to `content-gating` / Portal.
- **Surface:** Explicit `.md` URLs only. Accept-header markdown stays public-only. HTML theme views and the Content API stay membership-gated.
- **Pricing:** Site-wide amount. SPT charges use the configured fiat currency (Stripe card minimum applies). Tempo charges USDC using the same minor-unit amount; publishers should treat the crypto rail as USDC, not as on-chain publisher currency.
- **Eligibility:** `visibility: paid`, or `visibility: tiers` where every related tier is paid. Free-members-only (`visibility: members`) is out of scope.
- **Enablement:** Labs `machinePayments` + `llms_enabled` + `machine_payments_enabled` + Stripe connected.

## Publisher prerequisites

- Stripe Connect (or direct keys) on the site.
- For SPT / cards: US or Canada legal entity; Stripe business profile (`networkId` / profile id) configured.
- For Tempo stablecoin: Stablecoins and Crypto payment method approved in Stripe. Not available for NY businesses; other countries may need Stripe to enable access.
- `llms.txt` must remain enabled — agent discovery and `.md` routes depend on it.

## Architecture boundary

Membership and content gating stay frozen. Adapters only implement `canHandle` / `challenge` / `fulfill`. The orchestrator loads full post HTML and writes `machine_payment_events` only after a successful `fulfill`.
