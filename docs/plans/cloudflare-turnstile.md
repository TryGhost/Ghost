# Cloudflare Turnstile for member signup

Plan for adding Cloudflare Turnstile verification to member signup/signin to prevent spam signups.
Implemented on the `cf-turnstile` branch. Work through the checklist in order; each checked item
should correspond to at least one commit.

## Decisions (made 2026-07-06, do not re-litigate)

1. **Enforcement:** When Turnstile is active, `POST /members/api/send-magic-link` requests without a
   valid token are **rejected** (4xx). The Admin settings UI must carry an explicit warning that
   custom/third-party signup forms posting to the members API will stop working while Turnstile is
   enabled. (Server-to-server integrations that create members via the Admin API are unaffected.)
2. **Embedded (`[data-members-form]`) forms:** Turnstile executes invisibly on submit. The widget
   lives in a hidden, Portal-owned overlay on the main page; the overlay is shown **only if**
   Cloudflare requires interaction (`before-interactive-callback`) and hidden again afterwards.
   Never inject the widget inline into theme markup.
3. **Scope:** All `send-magic-link` email types are protected — `signup`, `subscribe`, **and**
   `signin` — like the previous hCaptcha implementation.
4. **Portal:** Same invisible + modal-overlay pattern as embedded forms. Do not change the layout of
   Portal's signup/signin pages; reveal the widget in an overlay inside the Portal popup only when
   Cloudflare requires interaction.

"Active" means: labs flag enabled **and** both `turnstile_sitekey` and `turnstile_secret_key` are
set. Any of those missing → every code path is a no-op.

## Prior art (important)

Ghost shipped a complete hCaptcha integration in early 2025 and removed it in
**`1091014ae7` — "Cleanup captcha (#23118)"**. That commit is the map of every integration point:
service + middleware, members API wiring, settings, labs flag, public settings exposure,
`ghost_head`, Portal widget, data-attribute forms, admin UI (SpamFilters), and tests (including a
170-line `CaptchaService.test.js`). Read it with `git show 1091014ae7` before starting, and mirror
its structure with Turnstile equivalents. Differences from hCaptcha:

- No SDK/npm dependency needed. Server verification is a single POST to
  `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret`, `response`, and
  `remoteip` — use `externalRequest` (`ghost/core/core/server/lib/request-external.js`).
- Client widget comes from `https://challenges.cloudflare.com/turnstile/v0/api.js` (load with
  `?render=explicit`), driven via `window.turnstile.render/execute/reset`. Hand-roll a thin wrapper;
  do not add `@marsidev/react-turnstile` or similar (Portal is a size-sensitive UMD bundle, and the
  same wrapper must also work outside React for data-attribute forms).
- Use `appearance: 'interaction-only'` + `execution: 'execute'` with
  `before-interactive-callback` / `after-interactive-callback` to implement the
  modal-only-when-needed behaviour.

## Design

### Backend (ghost/core)

- **Labs flag** `turnstile` in `PRIVATE_FEATURES` (`ghost/core/core/shared/labs.js`). Use the
  `add-private-feature-flag` skill (includes the admin-x-settings toggle).
- **Settings** (group `members`), added to
  `ghost/core/core/server/data/schema/default-settings/default-settings.json` **and** a migration
  (use the `create-database-migration` skill; `addSetting()` util; see the old captcha migration
  `2025-03-05-16-36-39-add-captcha-setting.js` for shape):
  - `turnstile_sitekey` (string, null default) — public.
  - `turnstile_secret_key` (string, null default) — private; the key name contains `secret` so the
    settings API auto-redacts it to `••••••••` (`settings-utils.js` `isSecretSetting`).
  - Add both to `EDITABLE_SETTINGS` in
    `ghost/core/core/server/api/endpoints/utils/serializers/input/settings.js`.
  - Expose **only** the sitekey publicly: `ghost/core/core/shared/settings-cache/public.js` and the
    members/public settings serializer (`api/endpoints/settings-public.js`) — mirror what the old
    captcha commit did (in reverse).
- **TurnstileService** at `ghost/core/core/server/services/members/TurnstileService.js`, modeled on
  the removed `CaptchaService.js` (visible in `git show 1091014ae7`):
  - Constructed with `{enabled, secretKey, siteverifyUrl}`; `getMiddleware()` returns a no-op when
    inactive.
  - When active: require `req.body.turnstileToken`; missing → `BadRequestError`. Verify via
    `externalRequest.post(siteverifyUrl, {form: {secret, response, remoteip: req.ip}})`; on
    `success: false` reject with `BadRequestError` using a deliberately sparse message (don't leak
    error codes to clients; log them server-side).
  - `siteverify` URL comes from config `turnstile.siteverifyUrl` with the production default in
    `ghost/core/core/shared/config/defaults.json` (the old captcha had a similar config block).
  - Wired up in `services/members/api.js` / `members-api.js` reading labs + settings, and mounted in
    `ghost/core/core/server/web/members/app.js` on the `send-magic-link` route, after
    `verifyIntegrityToken` and before the brute middleware (failing a bot before it consumes brute
    allowance for a real email). Applies to **all** email types (decision 3).
  - Settings changes must take effect without a restart — read enabled/keys lazily (per-request via
    settingsCache/labs), not once at boot. Check how the old implementation handled this.

### Script injection (ghost_head)

In `getMembersHelper()` (`ghost/core/core/frontend/helpers/ghost_head.js`), when the members script
is being injected **and** Turnstile is active:

- Inject `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>`
  (this is the main-page copy used by data-attribute forms).
- Add `data-turnstile-sitekey` to the Portal script tag attributes (via the existing `attributes`
  object → `getDataAttributes()`).

The sitekey is also available to Portal via the public settings it already fetches
(`/members/api/settings/`) — use whichever is simpler inside Portal, but keep the data attribute so
`data-attributes.js` can operate before/independently of the settings fetch.

### Portal + embedded forms (apps/portal)

- **Shared helper** `apps/portal/src/utils/turnstile.js`: given a document + sitekey, lazily loads
  the api.js script into that document if `window.turnstile` is absent, renders a widget
  (`appearance: 'interaction-only'`, `execution: 'execute'`) into an overlay container it creates,
  and exposes `getToken(): Promise<string>` that executes the widget, shows the overlay on
  `before-interactive-callback`, hides it on `after-interactive-callback`/completion, and resets the
  widget after each use (tokens are single-use — a failed submit must get a fresh token on retry).
- **Portal popup:** Portal renders inside an iframe (`srcDoc`), so the widget must be created in the
  iframe's own document (the old hCaptcha component also lived inside the popup — see
  `PopupModal.js` in the cleanup diff). Overlay is styled by Portal, shown over the popup content.
  Hook into the signup **and signin** submit paths (`actions.js` `signup`/`signin` →
  `api.member.sendMagicLink()` in `apps/portal/src/utils/api.js`), passing `turnstileToken` in the
  request body when Turnstile is active. Helpers `hasTurnstileEnabled({site})` /
  `getTurnstileSitekey({site})` in `utils/helpers.js` mirror the removed captcha helpers.
  - ⚠️ **Spike first:** verify a Turnstile widget actually renders inside Portal's `srcDoc` iframe
    (it inherits the parent origin, so domain validation should pass — but confirm early). If it
    doesn't work, fall back to rendering in the parent page via the existing
    `window.parent.postMessage` channel, and record that in this doc.
- **Data-attribute forms:** in `apps/portal/src/data-attributes.js` `formSubmitHandler()`, when
  Turnstile is active, await `getToken()` (main-page document/overlay) between fetching the
  integrity token and posting to `send-magic-link`, and include `turnstileToken` in `reqBody`. The
  old hCaptcha version of this file (in the cleanup diff) shows the exact seams; replace its inline
  widget with the overlay helper.
- Surface verification failures through the existing error elements (`[data-members-error]` /
  Portal notifications). Any new user-facing strings go through Portal's `t()` and
  `ghost/i18n/locales/en/portal.json` with `context.json` descriptions; run
  `pnpm --filter @tryghost/i18n translate`.

### Admin settings UI (apps/admin-x-settings)

Extend the existing **Spam filters** group
(`apps/admin-x-settings/src/components/settings/advanced/spam-filters.tsx`) — this is where the old
captcha UI lived (`SpamFilters.tsx` in the cleanup diff). Behind the `turnstile` labs flag:

- `TextField` for sitekey, `TextField` (password-style) for secret key, using `useSettingGroup()`.
- Validation: both set or both blank.
- Static callout/warning: enabling Turnstile blocks signups from custom or third-party forms that
  post to the members API directly (decision 1), and — for the embed builder / `signup-form` app —
  any external embedding domains must be added to the widget's domain allowlist in the Cloudflare
  dashboard.
- Add search keywords ("turnstile", "captcha", "spam", "bot").

### Embeddable signup-form app (apps/signup-form) — follow-up phase

The `signup-form` embed runs on **external** sites, so it's effectively a third-party form: with
enforcement on, embeds break unless the site owner allowlists the embedding domains for their
Turnstile widget. Phase 6 adds the same invisible+overlay flow inside the signup-form iframe (it
already fetches an integrity token in `form-page.tsx`), passing the sitekey through the embed
config. The Admin warning copy (above) covers the gap until then. If Phase 6 turns out to be
low-value, keeping just the warning is acceptable — flag it for a human decision rather than
silently dropping it.

## Testing

Cloudflare publishes dummy keys that work on any domain including localhost
(https://developers.cloudflare.com/turnstile/troubleshooting/testing/):

| Key | Value | Behaviour |
|---|---|---|
| sitekey | `1x00000000000000000000AA` | visible, always passes |
| sitekey | `2x00000000000000000000AB` | visible, always fails |
| sitekey | `1x00000000000000000000BB` | invisible, always passes |
| sitekey | `2x00000000000000000000BB` | invisible, always fails |
| sitekey | `3x00000000000000000000FF` | visible, forces interactive challenge |
| secret | `1x0000000000000000000000000000000AA` | always passes validation |
| secret | `2x0000000000000000000000000000000AA` | always fails validation |
| secret | `3x0000000000000000000000000000000AA` | yields "token already spent" |

Dummy sitekeys mint tokens of the form `XXXX.DUMMY.TOKEN.XXXX`; dummy secrets only accept dummy
tokens.

- **Unit (ghost/core):** `TurnstileService` — no-op when disabled, missing token, siteverify
  success/failure/network error, sparse client-facing errors. Template: the removed
  `CaptchaService.test.js` (170 lines, in the cleanup diff).
- **E2E API (ghost/core):** extend `test/e2e-api/members/send-magic-link.test.js` — with flag +
  keys set: missing token → 4xx, nock-mocked siteverify success → 201 + email sent, siteverify
  failure → 4xx + no email; signin path also enforced; flag off / keys unset → current behaviour
  (regression). Mock `challenges.cloudflare.com` with nock via the e2e-framework mock manager.
- **ghost_head unit tests:** script tag + `data-turnstile-sitekey` present when active, absent when
  flag off or keys missing (snapshot tests in `test/unit/frontend/helpers/ghost-head.test.js`).
- **Portal (vitest):** mock `window.turnstile`; signup and signin flows include `turnstileToken` in
  the `send-magic-link` body when enabled and omit it when disabled; overlay shows/hides around
  `before/after-interactive` callbacks; data-attribute form test in
  `test/data-attributes.test.jsx`. The removed hCaptcha tests in `SignupFlow.test.js` /
  `SigninFlow.test.js` / `data-attributes.test.js` (cleanup diff) show the shape.
- **Browser E2E (e2e/, stretch):** Playwright test with the real api.js and forced-interactive
  sitekey `3x00000000000000000000FF` to exercise the overlay, and `1x00000000000000000000BB` for
  the invisible happy path. Requires egress to `challenges.cloudflare.com` (the suite has egress
  monitoring) — if that's not permitted in CI, skip this and rely on the mocked layers.

## Checklist

Work top to bottom. Each item = at least one commit (use the `commit` skill for messages; this is
non-user-facing until the flag GA's, so no emoji prefixes).

### Phase 0 — scaffolding
- [ ] Read `git show 1091014ae7` end to end; note any integration points this plan missed and update this doc
- [ ] Labs flag `turnstile` (use `add-private-feature-flag` skill)
- [ ] Settings `turnstile_sitekey` + `turnstile_secret_key`: default-settings.json, migration (use `create-database-migration` skill), `EDITABLE_SETTINGS`, public exposure of sitekey only; integrity/exporter test snapshots updated

### Phase 1 — backend verification
- [ ] `TurnstileService` + unit tests
- [ ] Config default `turnstile.siteverifyUrl` in defaults.json
- [ ] Mount middleware on `send-magic-link` (all email types); e2e API tests with nock (success / failure / missing token / disabled regression / signin path)

### Phase 2 — script injection
- [ ] `ghost_head`: conditionally inject api.js script + `data-turnstile-sitekey` attribute; unit/snapshot tests

### Phase 3 — Portal + embedded forms
- [ ] Spike: confirm Turnstile widget renders inside Portal's srcDoc iframe with a real test sitekey; record result here
- [ ] `utils/turnstile.js` overlay helper (+ helpers.js `hasTurnstileEnabled`/`getTurnstileSitekey`)
- [ ] Portal signup + signin flows send `turnstileToken`; overlay-on-interaction inside popup; vitest coverage
- [ ] `data-attributes.js` flow with main-page overlay; vitest coverage
- [ ] i18n: new portal strings + `pnpm --filter @tryghost/i18n translate`

### Phase 4 — Admin UI
- [ ] Turnstile fields + third-party-forms warning in Spam filters group (behind flag); admin-x-settings tests

### Phase 5 — verification passes
- [ ] Full test sweep: `ghost/core` unit + affected e2e-api suites, portal tests, admin-x-settings tests, lint, i18n translate check
- [ ] Manual smoke with `pnpm dev` + CF test keys (invisible pass, forced-interactive overlay, always-fail secret) on Portal, data-attribute form, and signin; record results here

### Phase 6 — follow-ups (need human sign-off before starting)
- [ ] signup-form embed app support (domain-allowlist caveat above)
- [ ] Browser E2E in `e2e/` with real test sitekeys (egress permitting)

## Progress log

_Append dated notes here as work proceeds: what landed, what was learned (esp. the iframe spike),
anything that diverged from the plan and why._
