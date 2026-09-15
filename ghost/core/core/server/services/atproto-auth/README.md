# ATProto Auth — Ghost Member Login via Bluesky

This service implements ATProto OAuth 2.0 (with PKCE + DPoP) so Ghost site members can sign in using their Bluesky or any AT Protocol identity.

## Configuration

Add to your Ghost config file (`config.production.json`):

```json
{
  "atproto": {
    "enabled": true,
    "exclusive": false
  }
}
```

| Key | Type | Default | Description |
|---|---|---|---|
| `atproto.enabled` | boolean | `false` | Allow Bluesky login alongside normal magic-link login |
| `atproto.exclusive` | boolean | `false` | When `true`, disables the magic-link endpoints entirely; all member login must go through ATProto |
| `atproto.plcDirectory` | string | `"https://plc.directory"` | Override the PLC directory URL (useful for testing) |

## How it works

### Login flow

```
User enters handle → Ghost resolves DID → Ghost finds PDS
  → Pushed Authorization Request (PAR) to PDS AS
  → Browser redirects to PDS authorization screen
  → User authenticates with Bluesky
  → PDS redirects back to Ghost /members/atproto/callback
  → Ghost verifies state, exchanges code for tokens
  → Ghost creates/links member, sets session cookie
  → User lands on site as authenticated member
```

### Security design

- **PKCE (S256)**: code verifier never leaves the server; replay of authorization codes is prevented.
- **DPoP**: each token exchange uses a per-flow P-256 keypair; tokens are bound to the key.
- **State binding**: state is a 256-bit random ID stored in the DB; single-use (consumed on callback).
- **Issuer verification**: the `iss` parameter in the callback is checked against the PDS used at authorize-time, preventing [mix-up attacks](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-4.4).
- **DID binding**: the `sub` claim in the returned token is verified against the DID resolved from the user's handle, preventing DID substitution.
- **State TTL**: state rows expire after 10 minutes; pending-email rows expire after 15 minutes.
- **Same-origin redirects**: the `redirect` parameter is validated against the site URL before use.

### Email-required flow

Bluesky accounts may not have a verified email. When the PDS returns a token with no `email_verified: true` claim, Ghost:

1. Stores the verified DID in `atproto_pending_email` (15-minute TTL).
2. Redirects to `/members/atproto/needs-email?pending=<id>`.
3. Portal renders a handle-input → email-collection screen.
4. User submits email; Ghost sends a magic link.
5. After the user clicks the magic link, `/members/atproto/complete-signup` links the DID to the new member account.

## Route reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/.well-known/oauth-client-metadata` | ATProto client metadata (required by spec) |
| `GET` | `/members/atproto/authorize` | Start the OAuth flow; param: `handle`, `redirect` |
| `GET` | `/members/atproto/callback` | Authorization server callback |
| `GET` | `/members/atproto/needs-email` | Landing page after email-required redirect |
| `POST` | `/members/atproto/needs-email` | Submit email for email-required flow |
| `GET` | `/members/atproto/complete-signup` | Finalize DID linkage after magic-link click |

## Database tables

| Table | Purpose | TTL |
|---|---|---|
| `atproto_oauth_states` | PKCE + DPoP state for in-flight flows | 10 min |
| `atproto_pending_email` | Verified DID awaiting email confirmation | 15 min |
| `members.atproto_did` | Persistent DID linked to a member | Permanent |

## Public settings

These are surfaced via the Content API `/ghost/api/content/site/` so Portal can adapt its UI:

| Key | Type | Description |
|---|---|---|
| `atproto_login_enabled` | boolean | ATProto login is available |
| `atproto_login_exclusive` | boolean | Magic-link login is disabled |

## Service files

```
ghost/core/core/server/services/atproto-auth/
  index.js              Service entry point; call init() at boot
  AtprotoAuthService.js Main orchestrator
  OAuthStateStore.js    DB-backed state store (single-use, TTL-enforced)
  DPopHelper.js         DPoP proof generation (P-256 / ES256)
  PkceHelper.js         PKCE code verifier + S256 challenge
  DidResolver.js        Handle → DID → PDS resolution

ghost/core/core/server/web/atproto/
  app.js                Express router with all ATProto routes
```

## Running tests

```sh
# Unit tests (fast, no DB or network)
cd ghost/core && pnpm vitest run test/unit/server/services/atproto-auth/

# E2E tests (full boot, real DB, nock-mocked external HTTP)
cd ghost/core && pnpm test:e2e -- --grep "ATProto"
```
