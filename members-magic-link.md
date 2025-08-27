# Members Magic Link Authentication Flow

This document explains how SingleUseToken is used and how magic link tokens are converted to member sessions in Ghost.

## SingleUseToken Usage Flow

**SingleUseToken** is used as the storage mechanism for magic link tokens through the following components:

1. **SingleUseToken Model** ([single-use-token.js](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/models/single-use-token.js#L25)) - Basic Bookshelf model with `tokens` table
2. **SingleUseTokenProvider** ([SingleUseTokenProvider.js](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/members/SingleUseTokenProvider.js#L56)) - Service layer for token creation/validation
3. **MagicLink Service** ([MagicLink.js](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/lib/magic-link/MagicLink.js#L70)) - Orchestrates email sending with tokens

## Magic Link to Session Conversion Flow

When a magic link is clicked, here's the complete flow:

### 1. **Token Creation** 
- `SingleUseTokenProvider.create()` stores token data in database ([SingleUseTokenProvider.js:28](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/members/SingleUseTokenProvider.js#L28))
- Token has 24-hour validity (`MAGIC_LINK_TOKEN_VALIDITY = 24 * 60 * 60 * 1000`) and max 7 uses ([api.js:24-26](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/members/api.js#L24-L26))

### 2. **Token Validation & Session Creation**
When magic link is accessed, the middleware `createSessionFromMagicLink()` handles it ([middleware.js:327](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/members/middleware.js#L327)):

- **Extract token** from URL query parameter (`token=`)
- **Validate token** via `membersService.ssr.exchangeTokenForSession()` ([members-ssr.js:222](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/members/members-ssr.js#L222))
- **Get member data** via `_getMemberDataFromToken()` → `getMemberDataFromMagicLinkToken()` ([members-api.js:241](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/members/members-api/members-api.js#L241))

### 3. **Member Creation or Login**
In `getMemberDataFromMagicLinkToken()` ([members-api.js:241-281](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/members/members-api/members-api.js#L241-L281)):

- If member exists: Log signin event and return member data
- If member doesn't exist and token type allows signup: Create new member, log signin event
- Returns member identity data

### 4. **Session Cookie Creation**
Back in `exchangeTokenForSession()` ([members-ssr.js:257](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/members/members-ssr.js#L257)):
- Sets session cookie with member's `transient_id` 
- Session cookie is signed, HTTP-only, and lasts 6 months

### 5. **Redirect Handling**
Finally, `createSessionFromMagicLink()` redirects the user ([middleware.js:357-416](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/members/middleware.js#L357-L416)):
- Tier welcome pages for signups
- Original referrer URL with `success=true` 
- Homepage with `success=true` as fallback

The **SingleUseToken** acts as the bridge between the emailed magic link and the authenticated member session, providing secure, time-limited, and usage-limited authentication tokens.

## Key Components

- **Token Storage**: `SingleUseToken` model stores tokens in database with usage tracking
- **Token Provider**: `SingleUseTokenProvider` handles creation, validation, and expiry logic
- **Magic Link Service**: Orchestrates email generation and token embedding
- **Session Management**: `MembersSSR` handles cookie-based session persistence
- **Authentication Middleware**: Routes and validates incoming magic link requests

## Security Features

- **Time-limited**: Tokens expire after 24 hours
- **Usage-limited**: Maximum 7 uses per token
- **Signed cookies**: Session cookies are cryptographically signed
- **HTTP-only**: Session cookies cannot be accessed via JavaScript
- **Transient ID rotation**: Member sessions can be invalidated by cycling transient IDs