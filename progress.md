# Member Detail React migration — progress log

Working branch: `zimo/member-details-react-spike`
Plan: `~/.claude/plans/i-want-to-work-clever-lynx.md`
Cadence: red→green TDD, narrow vertical slices, quality checks + browser check + adversarial sub-agent review + Codex (highest effort) second opinion at the end of each slice, commit as I go.

Dev stack is live: `apps/admin` vite dev server on :5174 (base `/__admin-dev__`) proxied through `localhost:2368/ghost`, importing `@tryghost/posts` from source → my changes hot-reload in the browser.

---

## Phase 1 — Framework hooks ✅ (done before goal set)
Added 7 hooks + types to `apps/admin-x-framework/src/api/members.ts` (`useEditMember`, `useDeleteMember`, `getMemberSigninUrl`, `useMemberLogout`, `useEditMemberSubscription`, `useRemoveMemberEmailSuppression`, `useMemberActivityFeed`) with 11 unit tests. 447/447 package tests pass, lint clean, 0 new tsc errors. Not yet committed (committing in Phase 2 slices).

---

## Phase 2 — Read-only detail scaffold (in progress)

Slices:
- **2.1** Route flip + pipeline tracer: `./member-detail` export, minimal `member-detail.tsx` (title + back link + loading/not-found), remove `/members/:member_id` from EMBER_ROUTES + register React route. Seam under test (unit): `deriveMemberDetailBackPath(search)`.
- **2.2** Read-only sidebar (avatar, geolocation, created/last-seen, email open rate, attribution, Stripe customer link). Seams: `parseGeolocation`, display helpers.
- **2.3** Read-only subscriptions + newsletters display (no actions yet).

### Deviations from plan
- **D1 (corrected):** Initially flipped `/members/:member_id` to React in Phase 2, then **reverted** — flipping early breaks the whole `e2e/tests/admin/members-legacy` suite (impersonation/commenting/etc.), which is precisely why the plan sequences the flip last. Instead the WIP React screen is mounted on a **temporary preview route** `/members/preview/:member_id` (child of `membersRoute`, shares the `canManageMembers` guard). Ember keeps `/members/:member_id`; existing e2e stays green. Phase 8 renames the preview route to `:member_id`, removes the EMBER_ROUTES entry, and rewires nav.
- **D2:** Detail renders *within* admin chrome (sidebar visible), matching Ember + the members list, instead of the plan's `hideAdminSidebar` full-screen style. Reversible via the route handle.
- **Browser verification mechanism:** live-browser checks against the dev stack need an authenticated session; the auto-mode guardrail (correctly) blocks materializing the admin session secret to forge a cookie, and no Chrome extension is connected. So browser verification uses the **Playwright e2e harness in dev mode** (auto-detects the :5174 dev server, provisions its own isolated Ghost + owner, reflects my HMR'd source). This doubles as the "favor e2e" requirement.

### Tooling notes
- **Codex integration unavailable:** the local `@openai/codex` install is corrupted — its vendored native binary is missing (`ENOENT .../vendor/aarch64-apple-darwin/codex/codex`), and the plugin's companion runtime reports it's not set up. Genuine attempts made (codex-rescue agent + direct binary). Using an **adversarial general-purpose sub-agent review** as the second opinion each slice instead. Needs `npm i -g @openai/codex` + `/codex:setup` to restore.

### Log
- **slice 2.1:** TDD `deriveMemberDetailBackPath` (6 unit tests, red→green); minimal read-only `member-detail.tsx` (title + back link + not-found); `./member-detail` export; temp preview route `/members/preview/:member_id`.
  - Quality: unit 6/6, eslint clean, new files 0 tsc errors.
  - **Browser (e2e, dev mode, real headless Chromium): 4/4 PASS** — member name renders on the React screen; back link returns to `/members`. Confirms the new package export resolves live + temp route + `data-test-link="members-back"` contract.
  - **Adversarial review (sub-agent):** validated the slice. Confirmed the `deriveMemberDetailBackPath` open-redirect angle is **safe** (prefix guard mirrors Ember; rejects the only exploitable vectors `//host` + `https://host`; internal false-positives stay same-origin under the hash router). Actioned findings: fixed a real cosmetic bug (`truncate` on the `<h1>` needed `min-w-0` to work in the flex header); added `enabled: !!memberId` guard on `getMember`; added 2 characterization tests (protocol-relative rejection + intentional Ember-parity prefix behaviour) → nav tests now 8/8. Non-blocking notes logged for cutover: hardcoded English strings (i18n TODO), 404-vs-transient-error conflation.
  - **Codex second opinion:** unavailable (corrupted install, see Tooling notes).
  - **Committed.**
