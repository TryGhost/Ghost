# Ember → React Admin Migration — Final Audit Report

Generated 2026-06-11. Consolidates per-screen source audits and live visual audits.
Findings deduplicated (live-confirmed phrasing preferred), deviations documented in
`DEVIATIONS.md` excluded, and items verified as already fixed by the final hardening
pass excluded (verified against current source, see "Excluded findings" at the end).

## Re-baseline (2026-06-12) — read this before working the queue

Verified against current source after commits `8fa1429804`, `83e5738cc1`, `8ddf64034d`:

- **All 10 High findings are fixed** (verified per item, not just per commit message).
- **Tag detail M1 + Member detail M1** (silent edit loss via the shared unsaved-changes
  blocker — the "honorable mention" at the bottom) — **fixed** in `8fa1429804`
  (`use-unsaved-changes-blocker.ts` now blocks until in-flight saves settle). Off the queue.
- **Editor M12 is now PARTIAL:** member counts are fetched fresh on open (`8ddf64034d`)
  and shown in the recipients selector; still missing from the options summary line,
  confirm-step copy, and the post-status header.
- **PSM M6 is now PARTIAL:** X/Facebook description placeholder fallbacks are ported;
  only the canonical-URL placeholder (preview-URL fallback) remains.

**Scope decisions (user, 2026-06-12):**

1. **Full Ember parity is the goal.** Previously documented deviations with expired
   preconditions AND the editor's slice-scope "known accepted gaps" are re-promoted to
   work items — see the "Re-promoted deviations" section in `DEVIATIONS.md` for the
   authoritative list. This supersedes most of the "Excluded findings — documented
   deliberate deviations" list at the bottom of this report: those items are back in
   scope (except the sign-off keeps below).
2. **"Record for sign-off" findings where React improves on Ember are kept as-is**
   and dropped from the queue, recorded in `DEVIATIONS.md` ("Pending user sign-off")
   for later review: Tag L11, Member L21, Members-activity L5 / L15 / L19 (+ the
   capitalization half of L13), Restore M3 / L6.

## Summary

| Screen | High | Medium | Low | Total |
|---|---|---|---|---|
| Editor core + publish/preview flows | 6 | 10 | 13 | 29 |
| Posts/pages list | 0 | 11 | 16 | 27 |
| Member detail/new | 0 | 4 | 17 | 21 |
| Members activity | 0 | 2 | 17 | 19 |
| Site/Pro/Explore/Migrate wrappers | 0 | 9 | 10 | 19 |
| Tag detail/new | 0 | 4 | 14 | 18 |
| Auth screens (signin/2FA/reset/signup/setup/signout) | 2 | 5 | 7 | 14 |
| Editor settings sidebar (PSM) | 2 | 7 | 5 | 14 |
| Restore posts + local revisions | 0 | 3 | 3 | 6 |
| Home/dashboard redirects | 0 | 0 | 2 | 2 |
| **Total** | **10** | **55** | **104** | **169** |

---

## Editor core + publish/preview flows

### High

1. **[High / correctness] Post slug permanently truncated to the first 2–3 characters of the title.**
   The editor auto-creates the post after the first keystrokes and generates the slug from that
   partial title, never regenerating when the title is completed. Live-reproduced twice
   ('audit-probe-react-draft' → slug `au`; 'audit-probe-slug-check' → slug `aud`); existing damage
   in dev DB ('The new post' → slug `t`). Ember regenerates from the full title on blur until the
   slug is customized. Every new React-created post ships a broken URL.
   *Fix:* regenerate the slug on title blur while the slug is still title-derived (Ember's
   `generateSlug` semantics), not only at first save.

2. **[High / correctness] Title input displays the literal "(Untitled)" after the first autosave of an untitled post.**
   `startSave` writes `DEFAULT_TITLE` into `titleScratch` when blank
   (`apps/admin/src/editor/state/editor-machine.ts:502`) and the screen renders `titleScratch`
   directly (`apps/admin/src/editor/editor-screen.tsx:218`); first body keystroke triggers a 0ms
   autosave, so the field fills with "(Untitled)" and further typing appends to it. Ember maps
   '(Untitled)' back to '' for display.
   *Fix:* port the display mapping (render '' when titleScratch === DEFAULT_TITLE) or keep the
   default out of the scratch and only inject it into the save payload.

3. **[High / parity] Feature image not rendered in the canvas; existing images invisible while editing; no alt/caption editing.**
   Live-confirmed: a post with `feature_image` set shows nothing above the title; the PSM has only
   upload/remove. `PostSnapshot`/`SavePayload` model only `feature_image` — no
   `feature_image_alt`/`feature_image_caption` anywhere (existing values preserved by omission).
   Ember renders the image above the title with caption field and Alt toggle. (Unsplash omission is
   a documented deviation; the invisibility and alt/caption loss are not.)
   `apps/admin/src/editor/editor-screen.tsx` / `settings-menu.tsx:372`.
   *Fix:* render the feature image (with caption/alt inputs) in the canvas; add alt/caption to the
   machine snapshot and save payload.

4. **[High / parity] Contributors see Publish/Update/Unpublish instead of Ember's Preview + Save.**
   `PublishManagement` (`apps/admin/src/editor/publish/publish-management.tsx:88`) has no role
   check; a contributor can open the publish flow and the confirm 403s server-side. The explicit
   contributor Save button is gone (and Cmd+S is missing too), leaving only the 3s autosave.
   *Fix:* branch on `isContributor` like Ember's publish-buttons.hbs (Preview + Save task button).

5. **[High / parity] Publish flow has no email-recipients selector — audience cannot be changed.**
   `OptionsStep` (`apps/admin/src/editor/publish/publish-flow-modal.tsx:213`) renders only the
   newsletter select; `setRecipientFilter` (`publish-options.ts:326`) is exported but unused. Users
   cannot narrow a send to e.g. paid members only.
   *Fix:* port `GhMembersRecipientSelect` (all/free/paid/segment) wired to `setRecipientFilter`.

6. **[High / visual] Title textarea capped at `max-width:500px` while the body canvas is 740px.**
   Measured at 1440×900: title box w=500, body w=740 (Ember: both 740, max-width none). 23-char
   titles wrap to two lines; title and body visibly misaligned. Ember also scales the title to 36px
   at 600px viewports; React keeps 48px.
   `apps/admin/src/editor/editor-screen.tsx`.
   *Fix:* remove the 500px cap (match body column) and port the responsive title scale.

### Medium

7. **[Medium / correctness] Navigating from an open post to `#/editor/post` (new post) shows stale content from the previous post.**
   Title, body and PSM values (including Post URL) of the previous post remain; only a full reload
   produces a clean editor. *Fix:* reset editor machine state when the route param transitions
   saved-id → new.

8. **[Medium / parity] No re-authenticate flow when the session expires mid-edit.**
   `toSaveError` (`apps/admin/src/editor/use-editor.ts:93`) maps 401 to a generic 'Saving failed';
   Ember opened ReAuthenticateModal and retried the save. *Fix:* detect 401, prompt sign-in, retry.

9. **[Medium / parity] Ctrl/Cmd+S manual-save shortcut missing.**
   No keydown handler exists (`apps/admin/src/editor/editor-screen.tsx:128`). Published/scheduled
   posts only save via the Update button. (Cmd+P/Cmd+Shift+P are documented gaps; Cmd+S is not.)
   *Fix:* register cmd/ctrl+S → blur active input + manual save.

10. **[Medium / parity] Inline excerpt (subtitle) under the title missing — `editorExcerpt` public-beta flag ignored.**
    Sites with the flag on get the excerpt under the title in Ember (with validation, TK, keyboard
    nav); the React canvas has title + Koenig only, and the PSM ExcerptField renders unconditionally
    (`editor-screen.tsx:211`, `settings-menu.tsx:334`). *Fix:* honor the flag — render the canvas
    excerpt field and hide the PSM one when enabled.

11. **[Medium / correctness] Explicit/leave saves never send `save_revision=1` — forced post revisions lost.**
    `performSave` (`use-editor.ts:304`) and `useEditEditorPost`
    (`admin-x-framework/src/api/editor.ts:203`) have no save_revision support, so post-history
    restore points become sparser. *Fix:* add the query flag for explicit and leave saves.

12. **[Medium / parity] Recipient/member counts missing throughout publish + update flows.**
    No member counts in options summary, confirm copy, newsletter dropdown, already-sent rows, or
    update flow (`publish-flow-modal.tsx:336`). *Fix:* port the members-count-fetcher equivalents
    via existing member count APIs.

13. **[Medium / parity] Preview/publish modal headers missing quick-switch and share controls.**
    Live-confirmed: no Share dropdown (Copy preview link / Open in new tab — the standard way to
    share drafts), no Publish button in preview, no Preview button in the publish flow, no
    contributor Save (`preview-modal.tsx:174`, `publish-flow-modal.tsx`). (Send-test-email and
    editable subject are documented gaps.) *Fix:* port the header buttons; preview↔publish swap
    without remount.

14. **[Medium / parity] Post-status header loses email/send states.**
    No 'Published — View post' link to the live URL (live-confirmed), no 'sent to N members'
    counts, no failed-newsletter Retry/View-details affordance, schedule countdown static without
    counts (`apps/admin/src/editor/publish/post-status.tsx:33`). (Send-failure *polling* is a
    documented gap; the static retry entry points and the link are not.) *Fix:* port
    gh-editor-post-status branches.

15. **[Medium / parity] Title/editor focus & input behaviors missing.**
    Enter-at-top paragraph insertion, Tab/Arrow navigation title↔body, paste newline-stripping in
    title, new-post title autofocus, ArrowUp-to-title, click-below-content focus, file drag-drop
    onto the pane (`editor-screen.tsx:128`). *Fix:* port gh-koenig-editor-lexical handlers.

16. **[Medium / parity] Schedule picker is two bare text inputs — no calendar, no timezone label, no icon.**
    Live-confirmed: focusing the date input opens nothing; no 'UTC'/site-timezone hint anywhere.
    Ember has calendar dropdown with min-date dimming + timezone suffix. *Fix:* add a date-picker
    popover and timezone suffix to the schedule fields.

### Low

17. **[Low / parity] Update button not disabled when there are no unsaved changes** — clicking on a clean post fires a real PUT bumping `updated_at` (`publish-management.tsx:109`). *Fix:* `disabled={!hasUnsavedChanges}`.
18. **[Low / parity] No 'Post updated' notification with View-on-site link after explicit saves of published posts** (`publish-management.tsx:59`). *Fix:* success toast with action link.
19. **[Low / parity] Sent-only posts cannot open the update-flow info modal** — status text not clickable; `UpdateFlowModal`'s isSentOnly branch unreachable (`post-status.tsx:35`). *Fix:* make 'Sent' status a button.
20. **[Low / correctness] Stale `pendingSlugRef` can silently override a user-typed slug** — not cleared by `updateSlug` or on SAVE_FAILED, so a title-blur slug generation (or a failed save's leftover) wins over a later explicit PSM slug edit (`use-editor.ts:288`). *Fix:* clear/invalidate pendingSlugRef in `updateSlug` and on SAVE_FAILED.
21. **[Low / correctness] A manual save queued behind a failing background autosave is silently dropped** (`editor-machine.ts:735` discards `save.queued`). *Fix:* run the queued manual save after a failed autosave.
22. **[Low / parity] Publish-flow and preview selections reset every reopen** — schedule date, publish type, preview tab/size/segment live inside the modal components (`publish-flow-modal.tsx:383`, `preview-modal.tsx:70`). *Fix:* hoist state to PublishManagement.
23. **[Low / parity] HostLimitError on save shows only a status string — no upgrade modal, no publish-disabled state** (`use-editor.ts:99`). (Email host-limit checks are documented; the save-time upgrade modal is not.) *Fix:* open an upgrade dialog linking to #/pro.
24. **[Low / correctness] Any post-load error renders 'Post not found.'** — 500/offline mislabeled with no retry (`editor-screen.tsx:236`). *Fix:* branch 404 vs other errors.
25. **[Low / parity] Email clip-size (>100kB) warning missing from publish-flow options and editor footer** (`publish-flow-modal.tsx:156`). Documented only for the email preview pane. *Fix:* port EmailSizeWarning to both slots.
26. **[Low / parity] Editor footer help/documentation link lost** — no footer at all; word count is a documented gap but the docs entry point is not (the global nav is also hidden in the editor). *Fix:* restore a footer help link.
27. **[Low / visual] 'Saving...' indicator flashes** — Ember holds it ~3s minimum; React showed 'Saved' within 2.5s of the last keystroke. *Fix:* minimum display hold.
28. **[Low / visual] Mobile web-preview bezel differs** — large dark gray-900 frame, bottom clipped at 900px height, vs Ember's small centered white phone frame.
29. **[Low / visual] Publish confirm button lacks the pulse-green animation; flow chrome differs slightly** (no boxed Close/Preview, content 56px lower). Gradient/typography otherwise match.

---

## Posts/pages list

### Medium

1. **[Medium / parity] Authors lose the Visibility and Tag filters.**
   React collapses all three filters behind one `isAuthorOrContributor` flag
   (`apps/posts/src/views/posts/components/posts-filters.tsx:169`); Ember hid visibility/tag only
   from Contributors. An Author cannot filter their own posts by access or tag.
   *Fix:* split the gating (`isContributor` for visibility/tag, `isAuthorOrContributor` for author).

2. **[Medium / parity] Newsletter clicks metric missing from list rows.**
   No click-rate metric or `showEmailClickAnalytics` gating in `PostsListItemAnalytics`
   (`posts-list-item-analytics.tsx:45`); sites with click-tracking-only fall back to 'sent'.
   *Fix:* port the clicks metric + gating and the tooltip row.

3. **[Medium / parity] Row analytics CTA/metrics ignore Ember's role and availability gating.**
   `showAnalyticsCta` is true for every published/sent row regardless of role or enabled analytics
   sources (`posts-list-item.tsx:132`): editors/contributors get admin-only analytics links,
   contributors lose the external 'View post' affordance, all-analytics-disabled sites get a CTA to
   an empty page, opens render for contributors. *Fix:* port `hasAnalyticsPage` semantics
   (isPost && isAdmin && any-analytics-source) with the contributor view-post / editor-pencil fallbacks.

4. **[Medium / correctness] Cmd/Ctrl+A not blocked while the context menu is open.**
   `modalOpen` excludes `contextMenu` (`posts-list.tsx:144`); select-all inverts the selection under
   the open menu — Feature/Unfeature then apply to every matching post with no confirm.
   *Fix:* include `contextMenu` in the guard (freeze selection while open).

5. **[Medium / correctness] `SLUG_PATTERN` rejects legal Ghost slugs (underscores, unicode), silently dropping the tag/author filter.**
   `/^[a-z0-9-]+$/i` in `posts-query-params.ts:19` nulls valid params; selecting `my_tag` shows ALL
   posts with the dropdown snapped back to 'All tags'. Also drops Ember's red 'Unknown tag' state.
   *Fix:* escape/quote the value for NQL (like the tag search code) instead of rejecting.

6. **[Medium / parity] Pages list loses all analytics metrics.**
   `webAnalyticsEnabled = !isPages && ...`, `analytics = isPages ? undefined : ...`
   (`posts-list.tsx:98`); live-confirmed pages rows show only the edit pencil where Ember shows
   visitors and new-members counts. *Fix:* enable the same batch stats for pages as Ember's pages route.

7. **[Medium / visual] Active filters have no visual indication.**
   Live-confirmed: Ember turns active filter triggers green (`gh-contentfilter-selected`); React
   triggers look identical active or not (`posts-filter-dropdowns.tsx`). *Fix:* add an active-state
   treatment to non-default triggers.

8. **[Medium / parity] 'Posts → ViewName' breadcrumb with reset link lost.**
   Live-confirmed: React replaces the title with the view/filter name, no one-click back to the
   unfiltered list (Ember's 'Posts' crumb reset all query params). *Fix:* restore the breadcrumb
   with a reset link (`posts-list.tsx:264`).

9. **[Medium / parity] Rich metrics hover tooltip reduced to a `title` attribute.**
   Live-confirmed: Ember pops 'New members / Free 3 / Paid 2' card on hover; React has a native
   delayed tooltip with no breakdown (`posts-list-item.tsx`). *Fix:* shade Tooltip with the breakdown rows.

10. **[Medium / visual] Context menu items lost their icons** (link/star/tag/lock/duplicate/trash) and the separator before red Delete. Item set/wording otherwise at parity. *Fix:* add Lucide icons + separator.

11. **[Medium / correctness] Context menu clamp detaches the menu from the cursor near screen edges.**
    Fixed constants (`innerWidth-200`/`innerHeight-320`) placed the menu ~290px above / ~160px left
    of a bottom-corner right-click. *Fix:* clamp against measured menu size.

### Low

12. **[Low / parity] Featured filter collapses to one published_at-ordered query** instead of Ember's scheduled→drafts→published grouped sections; drafts sort unpredictably (`posts-query-params.ts:88`).
13. **[Low / parity] Infinite scroll replaced by manual per-section 'Load more' buttons** (`posts-list.tsx:376`); >30 drafts requires clicking through pages; buttons appear mid-list (not live-exercisable on dev data).
14. **[Low / parity] No scroll-to-top when filters change** (`posts-list.tsx:122`) — user can be left mid/past-end of the new result set.
15. **[Low / parity] Selection lifecycle differences** — outside clicks don't clear the selection, right-click temp selection persists after menu close, and shift-click smears native text selection (Ember preventDefault'ed on mousedown) (`posts-list.tsx:176`, `posts-list-item.tsx:134`).
16. **[Low / correctness] 'Post link copied' toast shows success even when the Clipboard API is unavailable** (http admin) (`posts-list.tsx:207`). *Fix:* execCommand fallback + only toast on success.
17. **[Low / parity] Notification/empty-state/heading copy diverges** — bulk toasts lose counts, 'reverted to a draft' → 'unpublished', contributor heading no longer '{blogTitle} posts', 'Show all posts' also clears order, add-tag modal disables instead of validating (`posts-list.tsx:212`). Breaks copy-asserting shared e2e.
18. **[Low / parity] Status line hover detail lost** — scheduled publish time/recipient segment and 'sent to N members' not visible anywhere on rows (`posts-list-item.tsx:52`).
19. **[Low / parity] Tag filter dropdown capped at first 100 tags; unmatched selected tag shows its raw slug** (`posts-filters.tsx:82`).
20. **[Low / correctness] Analytics counts never re-fetched while mounted** — `fetchedUuids` refs live for the component lifetime; failed batches never retried (`use-posts-analytics.ts:25`).
21. **[Low / visual] Selected row highlight gray (bg-accent) vs Ember lavender** — nearly indistinguishable from hover (`posts-list-item.tsx:153`).
22. **[Low / visual] Status colors hardcode light-mode hexes with no `dark:` variants** — dark mode will show Ember's light palette (`posts-list-item.tsx:61`).
23. **[Low / visual] Loading state: centered spinner replaces skeleton placeholder rows** (`posts-list.tsx:317`); on slow APIs stale rows sit under new filter labels with no fetching indicator.
24. **[Low / visual] Empty states: generic FileText icon + new copy replace Ember's illustrations and green CTA** (`posts-list.tsx:334`).
25. **[Low / visual] Featured star 14px amber vs Ember 11px black** (`posts-list-item.tsx:176`).
26. **[Low / visual] Header layout: filters inline with the title** (Ember: second right-aligned row); layout shifts when a view is active.
27. **[Low / visual] Member count '+5' vs Ember '5'; Save-as-view/Edit-view are labeled buttons vs Ember icon-only; New-view modal default swatch + missing X differ.**

---

## Member detail/new

### Medium

1. **[Medium / correctness] Navigating away during an in-flight save silently loses edits and suppresses the failure toast.**
   Blocker passes while `isSubmitting` (`apps/posts/src/components/unsaved-changes/use-unsaved-changes-blocker.ts:37`)
   and onSubmit's catch is guarded by `unmountedRef` (`member-detail-form.tsx:182`): Cmd+S + click
   backlink + server 422 → edits gone, zero feedback. Ember awaited `saveTask.last` and re-prompted.
   Same root defect as Tag detail/new #1 — fix once in the shared blocker.
   *Fix:* block while submitting and resolve after settle; fire the error toast regardless of unmount.

2. **[Medium / parity] Subscription detail box renders only `sub.offer` instead of the full `offer_redemptions` history.**
   Retention offers invisible (`member-subscriptions.tsx:88`); `MemberSubscription` type has no
   `offer_redemptions`. Support staff can't see why a payment is discounted.
   *Fix:* add the field to the framework type and render all redemptions like Ember.

3. **[Medium / visual] Note character counter has no over-limit styling (and no green used-count).**
   Live-confirmed at 510 chars: plain muted text, no red/bold flip (`member-detail-form.tsx`).
   *Fix:* port the green/red bold count states.

4. **[Medium / visual] Save button lacks spinner / green-success / red-retry states.**
   Live-confirmed: text-only 'Save'→'Saved', black throughout. *Fix:* shared task-button treatment
   (spinner + success/failure states) — also applies to Tag detail.

### Low

5. **[Low / parity] Subscription attribution rows (Source, Page link) dropped** — `attribution.referrerSource` computed but unused (`member-subscriptions.tsx:87`, `subscription-data.ts:259`).
6. **[Low / parity] Label edit affordance (pencil → rename modal) missing from the labels input** (`member-labels-input.tsx`); workaround exists in the members list.
7. **[Low / parity] Analytics breadcrumb never rendered even when `?post=` is present** (`member-detail-form.tsx:343`) — goes beyond the documented full-page-load degradation.
8. **[Low / correctness] Any first-load failure renders the '404 Page not found' screen** — 500/network presented as 404 with no retry (`member-detail.tsx:80`).
9. **[Low / parity] Browser tab title no longer reflects the member name** — shell-wide `document.title` gap (also auth + embed screens). *Fix:* a shared title hook in apps/admin.
10. **[Low / parity] Custom complimentary-expiry date accepts typed past dates** — `min` is picker-only (`add-tier-dialog.tsx:141`). *Fix:* validate `>= today` in `isValidCustomExpiryDate`.
11. **[Low / visual] Newsletter toggle checked state green vs Ember black** (`newsletter-preferences.tsx`).
12. **[Low / parity] New-member screen omits the Subscriptions section Ember shows.**
13. **[Low / visual] 'No subscriptions' empty state drops the illustration.**
14. **[Low / visual] Activity feed empty state drops illustration and 'Activity' heading.**
15. **[Low / visual] Subscription card always expanded — no 'Details ▸' disclosure; price box/badge styling differ.**
16. **[Low / visual] Activity feed: relative time stacked under text (not right-aligned); 'View all member activity' link green vs dark.**
17. **[Low / visual] Add-tier dialog: yellow warning text, black confirm (Ember green), boxed tier rows, no X close** (`add-tier-dialog.tsx:105`).
18. **[Low / visual] Impersonate dialog drops the large member avatar; left-aligned layout, no X close.**
19. **[Low / visual] Name/email header: smaller truncated single line vs larger wrapped heading** — long names/emails clipped (`member-details-sidebar.tsx:76`).
20. **[Low / visual] Labels input: no chevron, no dropdown on click (only after typing)** (`member-labels-input.tsx`).
21. **[Low / visual] Engagement email counts use thousands separators (Ember raw)** (`member-details-sidebar.tsx:142`) — arguably an improvement; record for sign-off.

---

## Members activity

### Medium

1. **[Medium / visual] Content canvas 120px narrower than Ember at wide viewports (1104 vs 1224px).**
   The shell's `max-w-page` (1200px) wrapper caps the screen before the page's own
   `max-w-[1320px]` applies (`members-activity.tsx:146`). *Fix:* let full-width screens opt out of
   the shell cap.

2. **[Medium / parity] Sticky table header lost.**
   Ember pins Member/Event/Time via sticky `th` in a scrolling container; React's plain table
   scrolls the header away on long lists (`activity-table.tsx`). *Fix:* sticky thead.

### Low

3. **[Low / parity] Clicking a member row silently clears the active event-type filter** — row link drops `excludedEvents` (`activity-table.tsx:36`). *Fix:* carry current search params.
4. **[Low / parity] Member filter selection uses history replace — Back skips the unfiltered list** (`members-activity.tsx:124`); inconsistent with `handleChangeExcludedEvents` which pushes.
5. **[Low / parity] Member context card renders even with zero matching events / during load** (`members-activity.tsx:167`) — Ember hid it; record for sign-off.
6. **[Low / parity] Member search redesigned (button + popover) without arrow-key/Enter selection** — keyboard users Tab through up to 20 options; selected-state label 'All members ✕' loses Ember's green 'Clear member ×' (`member-filter.tsx:17`).
7. **[Low / correctness] Events cursor anchored once per mount** — filter/member changes reuse the mount-time cursor, so events created after mount never appear (`use-member-events.ts:41`). *Fix:* re-anchor on filter changes like Ember's fetcher.
8. **[Low / correctness] Unauthorized users fire settings/newsletters/member-events requests (403s, possible toasts) before the permission redirect** (`members-activity.tsx:58`). *Fix:* gate hooks on `canManageMembers` (enabled flag or inner component).
9. **[Low / correctness] Rapidly toggling event-type filters loses updates** — each toggle computes from a stale URL snapshot; clicking several in quick succession kept only the last (`member-event-types.ts:53`). *Fix:* functional update from latest params.
10. **[Low / visual] 'Filter events' active state: only the icon turns green** (Ember: icon + label + tint).
11. **[Low / visual] Event icons: 16px Lucide in gray circles, monochrome — signup's green accent lost.**
12. **[Low / visual] Row density/typography differs** — 65px rows / 32px avatars / sentence-case gray headers vs 84px / 36px / uppercase dark headers.
13. **[Low / visual] Linked post/comment titles dark medium-weight (Ember gray + capitalize)** — emphasis flipped; capitalize-fix arguably an improvement.
14. **[Low / visual] '(Paid $9/month)' parenthetical lighter/regular vs Ember darker/medium.**
15. **[Low / visual] Member context card bordered/rounded vs Ember borderless full-width** — record for sign-off.
16. **[Low / visual] Filter-events toggles green when on (Ember black); popover chrome differs.**
17. **[Low / visual] Filtered-empty state loses the cursor illustration.**
18. **[Low / parity] Clicked-link URL hover marquee not ported** (source-verified; no click events in dev data) — React truncates with a title attribute.
19. **[Low / parity] Pagination affordance differs by design** (visible Load more + sentinel vs invisible scroll trigger + spinner) — deliberate fallback, record for sign-off (`members-activity.tsx:176`).

---

## Site/Pro/Explore/Migrate wrappers

### Medium

1. **[Medium / parity] Pro: BMA load-failure error state and timeout/retry monitor not ported — infinite spinner on load failure.**
   No equivalent of Ember's 10s monitor + retry + 'We couldn't load your Ghost(Pro) settings' error
   (`pro-screen.tsx:204`). *Fix:* port the load monitor + error state.

2. **[Medium / parity] Pro: subscription-update side effects missing** — local `forceUpgrade=false` clear, overdue/exceeded grace-period alerts, limit-service reload (`pro-screen.tsx:142`). Concrete failure: an owner who pays in force-upgrade keeps getting bounced to /pro until the backend catches up. *Fix:* port `_handleSubscriptionUpdate` side effects (at minimum the local forceUpgrade clear).

3. **[Medium / parity] Pro: `?action=checkout` routeUpdate postMessage flow not ported** — URL-only concatenation at mount; navigating to `#/pro?action=checkout` while already on /pro does nothing (`pro-screen.tsx:69`). Entry points still exist (publish-limit modal, exceeded-members alert). *Fix:* post the routeUpdate message and react to query changes.

4. **[Medium / parity] Explore: legacy `?new=true` → /explore/connect redirect not ported** — the cross-version entry ghost.org links to lands on the plain iframe (`explore-screen.tsx:31`).

5. **[Medium / parity] Explore: iframe-initiated `/explore/submit` interception not ported** — no credentials hand-off, no connect fallback; the Explore submit page loads without site credentials (`explore-screen.tsx:96`).

6. **[Medium / parity] /explore/connect: Ghost orb logo missing** (live-confirmed; Ember renders a 100px pink orb above the heading) (`explore-screen.tsx:213`).

7. **[Medium / visual] /explore/connect: whole screen visibly restyled** — heading 28px vs 36px, no white card on gradient background, smaller bullets/check icons, auto-width CTA vs full-width black large button (`explore-screen.tsx:204`). Reads as a different design, not a port.

8. **[Medium / visual] /explore iframe covers the sidebar** — React `fixed inset-0 z-50` vs Ember's content-pane-only overlay; sidebar + alerts row no longer visible/clickable on the main explore screen (`explore-screen.tsx:127`).

9. **[Medium / visual] Pro/Explore/Migrate overlays hardcode `bg-white`** — Ember used dark-mode-aware `var(--main-bg-color)`; dark-mode users get white screens/flashes (`pro-screen.tsx:211`, `explore-screen.tsx:127`, `migrate-screen.tsx:142`). *Fix:* `bg-background`.

### Low

10. **[Low / correctness] Explore: search/query params dropped when reloading a deep link** — src built from path only, `?q=` lost (`explore-screen.tsx:44`).
11. **[Low / correctness] Pro: any identities-API failure converted into a null token** — owner silently treated as non-owner on transient 500s (`pro-screen.tsx:124`). *Fix:* only null for NoPermissionError; surface other failures.
12. **[Low / parity] Migrate: init-failure recovery missing** — when the self-serve-migration integration is absent, no 'Error initialising migration' alert/close (the race itself was fixed; the missing-integration case still ends in a broken iframe) (`migrate-screen.tsx:78`).
13. **[Low / parity] Site: re-clicking the 'View site' nav item no longer resets the iframe to the homepage** — same-hash anchor clicks fire no navigation, so `location.key` never changes; in-code comment overstates the behavior (`site-screen.tsx:10`).
14. **[Low / parity] Document titles ('Site', 'Ghost(Pro)', 'Explore') not set** — shell-wide `document.title` gap (see Member detail #9).
15. **[Low / visual] /explore/connect API URL line styled 12px muted vs Ember's intended 23px `.explore-api`** (React at least shows the host — Ember's line rendered empty due to a controller bug) (`explore-screen.tsx:215`).
16. **[Low / visual] /migrate close control smaller and tighter to the corner than Ember's** (`migrate-screen.tsx:143`).
17. **[Low / parity] /site iframe drops `allowtransparency="true"`** — themes with transparent bodies composite against white (`site-screen.tsx:32`); geometry otherwise pixel-identical.
18. **[Low / correctness] /pro loading spinner relies on Ember's global `.gh-loading-spinner` CSS** — becomes an invisible div once the Ember bundle is removed (`pro-screen.tsx:223`). *Fix:* shade-native spinner.
19. **[Low / process] DEVIATIONS.md has no embedScreensX slice section** — this slice's deliberate deviations exist only as code comments (`DEVIATIONS.md:340`), which is why several findings above count as undocumented.

---

## Tag detail/new

### Medium

1. **[Medium / correctness] Navigating away during an in-flight save loses edits silently (no dialog, no error toast).**
   Blocker predicate `dirtyNow && !submittingNow` (`use-unsaved-changes-blocker.ts:37`) plus the
   `unmountedRef` guard in onSubmit (`tag-details-form.tsx:118`) — Cmd+S + click Tags backlink +
   422 → edits gone with zero feedback. Shared root with Member detail #1.
   *Fix:* block while submitting and settle; toast regardless of unmount (sonner is global).

2. **[Medium / correctness] URL preview broken: frozen at stale `tag.url` for existing tags, missing entirely for new tags.**
   Live-confirmed: existing tag showed `http://localhost:2368/404/` (the API's stale URL) and
   editing the slug never updated it; on /tags/new no preview rendered at all (siteUrl fallback
   never had a value, so the `{tagUrl && ...}` guard hides it). Ember computes
   `host/tag/{slug}/` live on every keystroke (`tag-details-form.tsx:67`, `:279`). The SERP preview
   URL shows the same wrong value.
   *Fix:* compute the preview live from site URL + current slug (scheme-stripped), as Ember did.

3. **[Medium / correctness] After save the form remounts: all expanded accordion sections collapse and scroll resets.**
   Live-confirmed on plain saves (and slug-change saves additionally flash a full-screen spinner via
   the fresh query key, `tag-details.tsx:45`). Ember kept all sections open
   (`tag-details-form.tsx:110`). *Fix:* reset form values in place / seed the new slug's query cache
   instead of remounting.

4. **[Medium / visual] X/Facebook previews are generic bordered cards; Ember rendered full network mockups** (logos, skeleton text, engagement rows) (`components/seo-previews.tsx`). *Fix:* port the network-styled preview cards (shared with the PSM previews follow-up).

### Low

5. **[Low / parity] No per-field blur validation** — errors only after save; Ember validated on blur (`tag-details-form.tsx:60`). *Fix:* `mode: 'onTouched'`.
6. **[Low / correctness] Visibility recomputed from name on every save** — API-created internal tags (non-# name) silently demoted to public by any unrelated edit (`tag-form-schema.ts:94`). *Fix:* only send visibility when the name changed.
7. **[Low / parity] Enter in any single-line input submits/saves the form** — implicit submission via the `type="submit"` Save button; Ember was a no-op (`tag-details-form.tsx:192`).
8. **[Low / parity] Description/meta/social fields saved with leading/trailing whitespace** — zod only trims name/slug/canonicalUrl (`tag-form-schema.ts:12`); also shifts the 500/300-char limit edge.
9. **[Low / parity] Delete confirmation: Enter no longer confirms (focus on Cancel), no 'Deleted' success state, no X close, centered vs top-anchored** (`delete-tag-dialog.tsx:22`).
10. **[Low / parity] Image upload failures show a generic 'Failed to upload image'** — Ember surfaced the server's validation message; `apiErrorMessage` already exists in the form (`image-upload-field.tsx:31`).
11. **[Low / parity] View button hidden on the new-tag screen** — Ember always rendered it (its link was broken for unsaved tags, so likely an improvement; record for sign-off) (`tag-details-form.tsx:184`).
12. **[Low / parity] Social card preview description drops the site meta-description fallback** (`tag-expandable-sections.tsx:201`).
13. **[Low / parity+visual] Character counters count UTF-16 code units (emoji double-counted) and stay muted gray** — Ember counted code points and showed bold green under / bold red over (`char-countdown.tsx:6`). React over-limit red is normal weight.
14. **[Low / visual] SERP preview lost the Google mockup (logo + search bar); description truncation 157 vs 149 chars** (`seo-previews.tsx:17`).
15. **[Low / visual] Color field: swatch right + '#'-in-value vs Ember swatch left + static '#' prefix + bare hex.**
16. **[Low / parity] Breadcrumb title no longer live-updates while typing the name** (`tag-details.tsx`).
17. **[Low / visual] Save button text-only 'Saving...'→'Saved'** — no spinner or check icon (shared task-button gap, see Member detail #4) (`tag-details-form.tsx:161`).
18. **[Low / parity] Image upload areas: dashed click-to-upload box, no upload progress bar** — visual treatment differs from Ember's solid panel + raised button (Unsplash/drag-and-drop are documented deviations; progress bar and treatment are not) (`image-upload-field.tsx`).

---

## Auth screens (signin/2FA/reset/signup/setup/signout)

### High

1. **[High / parity] Setup completion never starts the onboarding checklist — new owners skip onboarding entirely.**
   `setup.tsx:82` calls `reloadAdmin('/setup/onboarding?...')` without Ember's
   `onboarding.startChecklist()`; OnboardingRoute then sees `checklistState='pending'` and bounces
   to /analytics. Every fresh self-hosted install with authX on misses the checklist.
   *Fix:* PUT users/me accessibility (startChecklist equivalent) after `createSession`, before reload.

2. **[High / visual] React auth screens are a substantially smaller/denser layout than Ember's gh-flow.**
   Measured: 440px vs 500px column, 36px vs 59px inputs, 28px vs 41px heading, 32px vs 52px submit,
   vertically centered vs top-anchored — the flow reads ~35% smaller on every signin
   (`auth-layout.tsx:12`). *Fix:* scale AuthLayout to gh-flow metrics (or get explicit design sign-off).

### Medium

3. **[Medium / parity] Site icon / Ghost orb branding missing from all auth screens.**
   Live-confirmed on signin/reset; templates also show it on signin-verify/signup and the orb on
   setup. AuthLayout has no icon slot (`auth-layout.tsx:14`). The publication's branding disappears
   from the login page. *Fix:* add an icon slot fed from the public site payload.

4. **[Medium / parity] Per-field validation collapsed into one generic flow message; no red field borders.**
   Live-confirmed: Ember outlines invalid inputs red and shows specific inline messages
   ('Password must be at least 10 characters long.', 'Please enter a site title.', etc.); React
   shows a single generic sentence with no indication which field is wrong
   (`signup.tsx:59`, `setup.tsx:54`). *Fix:* per-field errors + error borders (blur validation).

5. **[Medium / visual] Signin submit button loses the site accent color** — Ember renders it in `accent_color` (also verify/signup); React uses the default near-black Button (`signin.tsx:146`).

6. **[Medium / parity] No loading indicators on any async auth action** — Ember shows spinners/running text everywhere; React only disables buttons with static labels (`signin.tsx:146`, etc.). No progress feedback on slow networks.

7. **[Medium / visual] 'Forgot?' (and 2FA 'Resend') moved from inside the input's right edge to above the input** (`signin.tsx:120`, `signin-verify.tsx:85`).

### Low

8. **[Low / parity] Password-reset success notification dropped** — user lands in the admin with zero confirmation (`reset.tsx:42`).
9. **[Low / parity] Autofocus lost on reset (new-password) and setup (site-title)** (`reset.tsx:52`, `setup.tsx:93`).
10. **[Low / parity] Browser tab titles ('Sign In'/'Setup'/'Sign Out') not set** — shell-wide gap (see Member detail #9) (`auth-routes.tsx:1`).
11. **[Low / correctness] /setup renders a permanent blank page if the setup-status request fails** — `isError` never branched (`setup.tsx:39`). *Fix:* error state with retry.
12. **[Low / correctness] Setup retry after failed post-setup session creation re-POSTs /authentication/setup and dead-ends** — Ember-equivalent (pre-existing hole); recovery path (/signin) undiscoverable (`setup.tsx:60`). Informational.
13. **[Low / visual] Password-reset-required state loses the gh-auth-email card + icon** (`signin.tsx:95`).
14. **[Low / visual] Reset fade-in animation and setup's white main background not reproduced** (`reset.tsx`).

---

## Editor settings sidebar (PSM)

### High

1. **[High / correctness] Blurring an untouched publish date/time field writes `published_at` to a never-published draft (and truncates seconds on published posts).**
   Live-confirmed: focus + Tab on a draft set `published_at` null → now and bumped `updated_at`;
   on published posts the HH:mm round-trip rebuilds with :00 seconds, so a spurious PUT rewrites
   published_at up to 59s earlier (`settings-menu.tsx:166`). Ember compared at minute precision and
   left null drafts untouched.
   *Fix:* treat blur-with-unchanged-display as a no-op for null published_at; compare at minute
   precision for the changed check.

2. **[High / correctness+visual] Wide/full Koenig cards overflow the viewport and slide under the open 419px panel.**
   `--editor-sidebar-width`/`--kg-breakout-adjustment` never set; measured full-width card bleeding
   210px off-screen and ~211px under the panel (Ember sets the var to 420px and cards fit)
   (`editor-screen.tsx:246`). *Fix:* set/reset the CSS vars when the panel opens/closes.

### Medium

3. **[Medium / correctness] 'Specific tiers' with zero tiers only deferred at the PSM commit — autosave, Cmd+S and leave-saves still send `visibility:'tiers', tiers:[]`.**
   The documented deviation covers the PSM-triggered save only; background saves carry the invalid
   state to the server (generic save-error toast, or a post locked to zero tiers)
   (`settings-menu.tsx:618`, `use-editor.ts:274`). *Fix:* short-circuit/strip the visibility change
   on all save paths while tiers is empty.

4. **[Medium / parity] Post URL field: no 'View post ↗'/'Preview ↗' link, no rendered URL preview line, no link icon.**
   Live-confirmed: zero `<a>` elements in the panel even on a published post; saves carry `url` so
   the data is available (`settings-menu.tsx:72`). *Fix:* port the URL section links + GhUrlPreview line.

5. **[Medium / parity] Publish date is two bare text inputs — no calendar datepicker, no icon, no UTC suffix.**
   Live-confirmed: focusing opens nothing; Ember opens a calendar (today highlighted, future
   disabled) with a 'UTC' suffix (`settings-menu.tsx:214`). *Fix:* date-picker popover + timezone suffix.

6. **[Medium / parity] Social description and canonical URL placeholders lose their fallbacks.**
   Live-confirmed: X description placeholder empty (Ember: auto-excerpt truncated to 150);
   canonical URL placeholder empty (Ember: preview URL). DEVIATIONS claims fallback chains are
   ported, so this is a defect, not a deviation; the chain also omits `post.excerpt` and skips
   Ember's 150/40-char truncation (`settings-menu.tsx:1032`). *Fix:* restore the fallback chains.

7. **[Medium / correctness] Character countdown counts UTF-16 units — emoji count double** (single 😀 = "You've used 2"; Ember = 1). Affects all meta/social counters. *Fix:* `Array.from(value).length` (same fix as Tag detail #13).

8. **[Medium / visual] Internal #tags and selected tokens render as identical gray badges** — Ember styles internal tags black, tags/authors pink with x buttons, tiers black; the private-tag distinction is lost.

9. **[Medium / parity] Delete confirmation omits the post title and the X close** — Ember bolds the title in the copy; trigger row also loses the red outline + trash icon.

### Low

10. **[Low / parity] Tags and authors cannot be reordered** — primary tag/author are positional; machine treats reorders as dirty but no UI can produce one (`settings-menu.tsx:535`). *Fix:* drag-sortable tokens.
11. **[Low / parity] Keyboard shortcuts reference subview missing** — in-app shortcut documentation lost (`settings-menu.tsx:1200`).
12. **[Low / correctness] Failed PSM auto-saves keep the optimistic UI value instead of rolling back** — e.g. featured toggle stays flipped offline (Ember rollbackAttributes). Document or revert-on-error (`settings-menu.tsx:513`).
13. **[Low / visual] Countdown colors/weights differ from Ember's palette** (green-600/600 vs #30CF43/700, etc.).
14. **[Low / visual] Tag/author/tier pickers: narrow left-anchored Command popover, 'Add a tag' placeholder, black focus ring vs power-select full-width/green focus; featured row loses the star icon.**

---

## Restore posts + local revisions

### Medium

1. **[Medium / parity] 'Title' / 'Created' list header row not ported** (live-confirmed; Ember renders uppercase column labels above the rows) (`apps/admin/src/restore/restore-screen.tsx:120`). *Fix:* add the header row.
2. **[Medium / visual] Empty state placement/styling differs** — centered, muted, pushed down (mt-16) vs Ember's left-aligned bold dark heading directly under the description. (The suspected missing illustration was refuted: the `revision-placeholder` asset doesn't exist in Ember either.) (`restore-screen.tsx:151`).
3. **[Medium / visual] Page header dramatically larger** — 28px/700 bordered h2 + p-12 vs Ember's compact 15px/600 title; may intentionally match other React screens — needs sign-off (`restore-screen.tsx:109`).

### Low

4. **[Low / visual] Timestamp format inserts a comma before the time ('Jun 11, 2026, 10:10') and is smaller/muted vs Ember's dark fixed-width cell** (`restore-screen.tsx:7`).
5. **[Low / visual] Long titles/excerpts CSS-truncate to one line (Ember wrapped); titles 19px vs 15px** (`restore-screen.tsx:124`).
6. **[Low / parity] Restore-in-progress affordance differs** — React shows 'Restoring...' and disables all rows; Ember's running state was near-invisible and allowed concurrent restores. React is the better UX — record as deliberate in DEVIATIONS (`restore-screen.tsx:141`).

---

## Home/dashboard redirects

1. **[Low / correctness] StrictMode double-fires `startChecklist`: two PUT /users/:id/ on `?firstStart=true` (dev only)** — the `cancelled` flag only guards `navigate()` (`apps/admin/src/home-redirect.tsx:38`). *Fix:* check cancelled/ref before the mutation or make it idempotent.
2. **[Low / parity] Checklist-start failure silently swallowed** — `.catch(console.error)` then navigate; a transient PUT failure makes a Ghost(Pro) owner permanently miss onboarding with no error or retry (`home-redirect.tsx:38`). Deliberate-looking but undocumented — add to DEVIATIONS or surface an error.

---

## Excluded findings (deduplicated out — documented deviations or verified already fixed)

**Verified fixed by the final hardening pass** (checked against current source):
- Migrate initialData race — replies now queued until config/settings/integrations load (`migrate-screen.tsx`).
- Local-revision pending write cancelled on unmount — `destroy()` now calls `flushPending()` (`local-revisions.ts:246`).
- React revisions omitting `authors` — revision payload now includes authors (`use-editor.ts:446`).
- Pro `ownerUser: null` for non-owners — owner now fetched via `role:Owner` (`pro-screen.tsx:138`).

**Documented deliberate deviations (DEVIATIONS.md):**
- Tag/PSM Unsplash + drag-and-drop image uploads; tag/PSM accordion subviews ("approved pattern"); PSM SERP/X/Facebook previews inside subviews; PSM social image plain uploads.
- Auth: signup invite email read-only; signin button keeping its label (no red Retry state); flow-notification error rendering.
- Editor: word count + TK counts; Cmd+P/Cmd+Shift+P; post-history modal (PSM entry); send-test-email + editable subject in email preview; email-preview clip warning; 409-as-toast.
- Restore: success navigates to the editor (no toast); Ember's false-success toast on failed restore (pre-existing Ember bug, React improves on it).

---

## Top-10 priority fixes (across all screens)

1. **Editor — slug truncated to first 2–3 chars of the title** (High/correctness): every new React post ships a broken URL; regenerate the slug on title blur while title-derived.
2. **PSM — blur writes `published_at` to never-published drafts / rewrites seconds on published posts** (High/correctness, live-reproduced): silent data mutation from merely tabbing through the panel (`settings-menu.tsx:166`).
3. **Editor — literal "(Untitled)" injected into the title field after first autosave** (High/correctness): pollutes the title every untitled post; map DEFAULT_TITLE back to '' for display (`editor-machine.ts:502`).
4. **Auth — setup never starts the onboarding checklist** (High/parity): every fresh self-hosted install skips onboarding; call startChecklist before `reloadAdmin` (`setup.tsx:82`).
5. **Editor — publish flow has no email-recipients selector** (High/parity): audience cannot be narrowed; wire `setRecipientFilter` to a ported recipients select (`publish-flow-modal.tsx:213`).
6. **Editor/PSM — feature image invisible in the canvas, no alt/caption editing** (High/parity): authors can't see or annotate the hero image; add alt/caption to the machine + render in canvas.
7. **PSM — wide/full Koenig cards overflow under the open settings panel** (High/visual+correctness, measured): set `--editor-sidebar-width`/`--kg-breakout-adjustment` like Ember (`editor-screen.tsx:246`).
8. **Editor — contributors see Publish/Update/Unpublish instead of Preview + Save** (High/parity): permission-violating flow ending in server 403s; port the contributor branch (`publish-management.tsx:88`).
9. **Editor — title capped at 500px while the body is 740px** (High/visual, measured): premature wrapping + misalignment on every desktop edit (`editor-screen.tsx`).
10. **Auth — wholesale visual scale regression on all auth screens** (High/visual, measured ~35% smaller, plus missing site-icon branding and accent-color button as part of the same surface): align AuthLayout with gh-flow metrics or obtain design sign-off (`auth-layout.tsx`).

**Honorable mention (shared medium root cause):** the unsaved-changes blocker lets navigation
through while a save is in flight and the unmount guard suppresses the failure toast — silent edit
loss on both Tag and Member detail (`use-unsaved-changes-blocker.ts:37`); one fix covers two screens.
