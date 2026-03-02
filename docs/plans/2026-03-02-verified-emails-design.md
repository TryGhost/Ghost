# Centralized Verified Email Addresses in Ghost

## Problem

Ghost requires email verification when site owners set custom reply-to or sender addresses on managed email hosts. Today this verification logic is duplicated across two services (`NewslettersService` and `SettingsBREADService`) with no shared state. Verifying the same address in one context doesn't carry over to another — users must re-verify for each usage. Adding welcome email sender customization would create a third copy of this logic.

## Solution

Introduce a `verified_emails` table and centralized `EmailVerificationService`. Once an email address is verified, it's available site-wide across all contexts: newsletter sender/reply-to, support address, and welcome email sender/reply-to.

## Scope

- **Managed email hosts only.** Self-hosted sites skip verification entirely and continue using free-text inputs. The `verified_emails` table stays empty on self-hosted instances.
- **Consolidates existing flows.** Newsletter and support address verification migrate to the new service.
- **Enables welcome email customization.** New consumer with zero additional verification code.

## Data Model

### New table: `verified_emails`

| Column | Type | Notes |
|--------|------|-------|
| `id` | string(24) | ObjectID primary key |
| `email` | string(191), unique | The email address |
| `status` | string(50), not null | `'pending'` or `'verified'` |
| `created_at` | dateTime | When first added |
| `updated_at` | dateTime, nullable | When status last changed |

### Changes to existing tables

**`newsletters`** — Add nullable `verified_email_id` FK columns for `sender_email` and `sender_reply_to`. The existing text columns remain and are the source of truth for sending. The FK is set alongside the text value when a verified email is selected, and null when a special value (`'newsletter'`, `'support'`) is used.

**`automated_emails`** — Same pattern. Add nullable `verified_email_id` FK columns for the existing (but currently unused) `sender_email` and `sender_reply_to` columns. These columns will start being used for welcome email customization.

**`settings`** — No schema change. The `members_support_address` key continues as a text value. Usage is checked by text value match (only one key to check). Note: this is a known awkwardness — the support address concept may be adjusted or removed in the future.

### Migration

On upgrade, scan existing custom email addresses in `newsletters.sender_email`, `newsletters.sender_reply_to` (where not `'newsletter'`/`'support'`), and `settings.members_support_address` (where not `'noreply'`). Insert into `verified_emails` with status `'verified'`. Backfill the new FK columns on newsletters.

## Service Layer

### New `EmailVerificationService`

Replaces the duplicate verification logic in `NewslettersService.prepAttrsForEmailVerification` / `sendEmailVerificationMagicLink` and `SettingsBREADService.prepSettingsForEmailVerification` / `sendEmailVerificationMagicLink`.

```
add(email, context?)
  If email already verified: return {verified: true}
  If email pending: resend verification email, return {pending: true}
  Otherwise: insert row as pending, send verification email, return {pending: true}
  Context is optional: {type: 'newsletter'|'setting'|'automated_email', id?, property?, key?}

verify(token)
  Validate token via MagicLink/SingleUseTokenProvider
  Update verified_emails row: status = 'verified'
  If context in token data, apply the value to the target:
    - newsletter: NewsletterModel.edit({[property]: email}, {id}) + set FK
    - setting: SettingsModel.edit({key, value: email})
    - automated_email: AutomatedEmailModel.edit({[property]: email}, {id}) + set FK
  Return {email, context}

list()
  Return all verified_emails rows (pending and verified)

delete(id)
  Check usage across newsletters (via FK), automated_emails (via FK), and settings (by text value)
  If in use: return error with list of contexts using the address
  Otherwise: delete the row

check(email)
  Return whether email exists in verified_emails with status 'verified'
```

### How existing flows change

**Newsletter edit:** Calls `emailVerificationService.check(email)` instead of its own verification logic. If verified, saves directly (text value + FK). If not, does not save the value — frontend handles the "add new" flow via the combobox.

**Settings edit:** Same pattern — `check(email)` replaces `requiresEmailVerification` + its own magic link flow.

**Welcome emails:** New consumer, same pattern as above.

### Token data

Simplified from the current per-context formats. All tokens encode:
```json
{"email": "user@example.com", "context": {"type": "newsletter", "id": "abc123", "property": "sender_reply_to"}}
```
Context is optional — if absent, the token just verifies the address without applying it anywhere.

Uses existing `MagicLink` + `SingleUseTokenProvider` infrastructure. 24-hour token validity.

## API Endpoints

```
GET    /ghost/api/admin/verified-emails/          → list()
POST   /ghost/api/admin/verified-emails/          → add(email, context?)
PUT    /ghost/api/admin/verified-emails/verify/   → verify(token)
DELETE /ghost/api/admin/verified-emails/:id/       → delete(id)
```

Single verification URL pattern: `{adminUrl}#/settings/verified-emails/?verifyEmail={token}`

Replaces the two existing patterns:
- `#/settings/newsletters/?verifyEmail={token}`
- `#/settings/portal/edit?verifyEmail={token}`

## Frontend

### `VerifiedEmailSelect` combobox component

Reusable component used in all contexts on managed email hosts. Self-hosted sites keep existing free-text inputs.

**Contents:**
- Special values at top (context-dependent: "Newsletter address", "Support address", "noreply")
- Divider
- Verified email addresses
- Pending addresses (greyed out, "Pending verification" label)
- Divider
- "Add new email..." action
- "Manage verified emails..." action

**"Add new email..." flow:**
1. Combobox transforms into text input
2. User types email and confirms
3. Calls `POST /verified-emails/` with email + context
4. Toast: "Verification email sent to user@example.com. Your current reply-to address will remain active until verified."
5. Address appears in combobox as pending/greyed out

**"Manage verified emails..." flow:**
Opens a modal listing all verified + pending addresses. Each row shows email, status, and actions:
- Verified + not in use: delete button
- Verified + in use: shows where it's used, no delete
- Pending: resend verification action

### Verification link handling

Single route handler at `#/settings/verified-emails/?verifyEmail={token}`. Calls `PUT /verified-emails/verify/`, shows confirmation based on context returned (e.g., "Newsletter X will now use user@example.com as the reply-to address").

### Where the combobox appears

| Context | Location | Special values |
|---------|----------|----------------|
| Newsletter sender email | Newsletter detail modal | null = use default |
| Newsletter reply-to | Newsletter detail modal | "Newsletter address", "Support address" |
| Support address | Portal settings modal | "noreply" |
| Welcome email sender | Welcome email settings (new) | null = inherit from default newsletter |
| Welcome email reply-to | Welcome email settings (new) | TBD, similar to newsletter |

## Code removed

- `NewslettersService.prepAttrsForEmailVerification()`
- `NewslettersService.sendEmailVerificationMagicLink()`
- `NewslettersService.respondWithEmailVerification()`
- `SettingsBREADService.prepSettingsForEmailVerification()`
- `SettingsBREADService.sendEmailVerificationMagicLink()`
- `SettingsBREADService.requiresEmailVerification()`
- Duplicate email verification templates (`newsletters/emails/verify-email.js`, `settings/emails/verify-email.js`) — replaced by single template in new service
- Separate verification route handlers in newsletters.tsx and portal-modal.tsx — replaced by single handler
