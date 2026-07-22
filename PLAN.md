# Automation email click analytics prototype

## Goal

Build a quick, realistic prototype of first-party click tracking for automation emails. The prototype should:

- rewrite links in sent automation emails to Ghost `/r/...` redirects;
- record clicks through the existing `members_click_events` pipeline;
- count each member once per automation email action revision;
- expose aggregate click rate on the existing automation response;
- expose de-duplicated per-destination click counts from a separate endpoint;
- show Clicked metrics on the canvas and sidebar, plus top clicked links;
- respect the existing `email_track_clicks` and `email_track_opens` settings in the UI.

This plan deliberately optimizes for small, reviewable PRs rather than extracting a perfect new subsystem.

## Scope decisions

- **Excluded:** NY-1495 (reset automation analytics data before launch).
- **Excluded:** NY-1442 (members-list copy).
- **Umbrella only:** NY-1384 is complete when its UI child issues are complete; it does not need a duplicate implementation PR.
- Associate redirects with `automation_action_revision_id`, as decided in NY-1479. Do not use the action-level shortcut from `origin/spike_atmns-email-clicks`.
- Create redirects lazily at send time. De-duplicate by `(automation_action_revision_id, to_hash)` and handle concurrent sends with get-or-create plus a duplicate-key retry.
- Use Ghost's first-party click tracking. Do not enable Mailgun click tracking.
- Use `members_click_events` for raw events. Do not add an automation-specific click-events table.
- Snapshot `email_track_clicks` on each `automated_email_recipients` row.
- `clicked_rate = unique members who clicked / emails sent`, aggregated across all revisions for an action, matching the existing sent/opened stats behavior.
- Return aggregate click stats from the existing automation read endpoint, but fetch the per-link list from a separate endpoint.
- Do not implement editing destinations of already-sent automation links.
- Do not backfill or reset pre-prototype automation analytics.
- Track links only in the rendered email content. Wrapper links such as unsubscribe, Portal, and the Powered by Ghost badge remain untouched. Because plaintext is finalized from the rewritten HTML, its visible content links receive the same tracked destinations.

## Dependency order

```text
NY-1487 ──> NY-1491 ──┐
                      ├──> NY-1493 ──> NY-1494 ──> NY-1444 ──> NY-1456
NY-1488 ──────────────┘                              │          NY-1457
                                                    │
NY-1489 ──> NY-1490 ──> NY-1492 ────────────────────┼──> NY-1486 ──> NY-1485
                                                    │
NY-1456 + NY-1457 + NY-1485 ────────────────────────┴──> NY-1466

NY-1384 closes when NY-1456, NY-1457, NY-1485, and NY-1466 are complete.
```

PRs 1–3 are independent schema changes and can be reviewed in parallel, but should merge in the order below so dependent branches have a stable base. PR 4 must follow PR 3. After PR 6, backend aggregation and endpoint work can overlap where their listed dependencies allow it.

## Ordered PR plan

### PR 1 — NY-1487: Add recipient click-tracking fields

**Depends on:** nothing.

**Outcome:** Each automation email recipient records whether click tracking was enabled and the timestamp of their first click.

**Implementation:**

- Generate the migration with `cd ghost/core && pnpm migrate:create add-click-tracking-to-automated-email-recipients`.
- Add `automated_email_recipients.track_clicks` as non-null boolean, default `false`.
- Add `automated_email_recipients.clicked_at` as nullable datetime.
- Mirror both columns in `ghost/core/core/server/data/schema/schema.js`.
- Update the schema integrity hash. Keep the migration idempotent and limited to migration/schema artifacts.

**Verification:**

- Run the generated migration up twice against the target version.
- Run `cd ghost/core && pnpm test:single test/unit/server/data/schema/integrity.test.js`.

### PR 2 — NY-1488: Add the revision click counter

**Depends on:** nothing.

**Outcome:** Each action revision can retain its unique-member click count alongside sent and opened counts.

**Implementation:**

- Generate the migration with `cd ghost/core && pnpm migrate:create add-email-clicked-count-to-automation-action-revisions`.
- Add nullable unsigned integer `automation_action_revisions.email_clicked_count`, matching `email_opened_count`.
- Mirror the column in `schema.js` and update the integrity hash.
- Do not populate, backfill, or expose the value in this PR.

**Verification:**

- Run the migration twice and the schema integrity test.

### PR 3 — NY-1489: Associate redirects with action revisions

**Depends on:** nothing.

**Outcome:** A redirect can belong to one automation action revision without changing newsletter redirects.

**Implementation:**

- Generate the migration with `cd ghost/core && pnpm migrate:create add-automation-action-revision-to-redirects`.
- Add nullable 24-character `redirects.automation_action_revision_id`.
- Reference `automation_action_revisions.id` with `ON DELETE SET NULL`, matching the durability behavior of `redirects.post_id`.
- Mirror the foreign key in `schema.js` and update the integrity hash.
- Do not change redirect creation or click handling yet.

**Verification:**

- Run the migration twice and the schema integrity test.
- Verify deleting a revision nulls the redirect reference instead of deleting the redirect.

### PR 4 — NY-1490: Add race-safe redirect de-duplication

**Depends on:** PR 3 / NY-1489.

**Outcome:** Concurrent sends of the same revision and destination converge on one redirect.

**Implementation:**

- Generate the migration with `cd ghost/core && pnpm migrate:create add-to-hash-to-redirects`.
- Add nullable 64-character `redirects.to_hash` containing the SHA-256 hex digest of the normalized destination URL.
- Add a unique constraint on `(automation_action_revision_id, to_hash)`.
- Keep both columns nullable so existing newsletter redirects remain valid and multiple `(NULL, NULL)` rows are allowed by MySQL.
- Mirror the column and composite unique constraint in `schema.js`; update the integrity hash.
- Do not add application writes in this migration PR.

**Verification:**

- Run the migration twice and the schema integrity test.
- Add a focused schema/integration assertion that duplicate non-null revision/hash pairs fail while newsletter redirects with null automation fields remain valid.

### PR 5 — NY-1491: Snapshot `track_clicks` when sending

**Depends on:** PR 1 / NY-1487.

**Outcome:** Every persisted automation recipient records the click-tracking setting used for that send.

**Implementation:**

- Add `trackClicks` to `RecordEmailSentOptions` in `automations-repository.ts`.
- In `poll.ts`, read `email_track_clicks` alongside `email_track_opens` for each send.
- Pass the boolean to `recordEmailSent` and persist it as `automated_email_recipients.track_clicks` in the same transaction that inserts the recipient and increments `email_sent_count`.
- Keep this PR limited to the snapshot; link rewriting lands in PR 6.

**Verification:**

- Extend `poll.test.ts` for enabled and disabled settings.
- Extend `automations-repository.test.ts` to assert the persisted snapshot.
- Run the two focused unit test files.

### PR 6 — NY-1492: Rewrite outgoing automation links

**Depends on:** PR 3 / NY-1489, PR 4 / NY-1490, and PR 5 / NY-1491.

**Outcome:** When click tracking is enabled, content links in an automation email point to a stable revision-owned Ghost redirect containing the member UUID.

**Implementation:**

- Extend `link-redirect-repository.js` to:
  - calculate `to_hash` from `url.href` using SHA-256;
  - save `automation_action_revision_id` and `to_hash` for automation redirects;
  - look up a redirect by revision and hash.
- Extend `link-redirects-service.js` with `getOrAddAutomationRedirect(revisionId, destination)`:
  - return an existing redirect when present;
  - otherwise create one;
  - on MySQL or SQLite duplicate-key failure, re-read and return the winning row;
  - rethrow unrelated errors or a duplicate error whose winning row cannot be found.
- Extend `link-click-tracking-service.js` with a helper that appends `?m=<member UUID>` to the shared redirect URL.
- Thread `{automationActionRevisionId}` from `poll.ts` through `MemberWelcomeEmailService` to `MemberWelcomeEmailRenderer` only when the snapshotted setting is enabled.
- In the renderer's existing `linkReplacer.replace` pass:
  - track `http:` and `https:` content links;
  - skip fragment-only anchors such as `#`;
  - leave invalid and non-web schemes unchanged;
  - continue resolving ordinary relative links against the site URL;
  - avoid touching wrapper/footer links because replacement runs on rendered Lexical content before the wrapper is added.
- Do not pass Mailgun's `track_clicks` option.

**Verification:**

- Repository/service unit tests for lookup, hashing, creation, cache behavior, duplicate-key retry, and unexpected errors.
- Renderer tests for absolute links, relative links, repeated destinations, fragments, non-HTTP schemes, disabled tracking, missing member UUID, HTML, and finalized plaintext.
- Poll tests proving enabled sends receive revision metadata and disabled sends do not.
- A concurrency test proving two simultaneous sends create one redirect.

### PR 7 — NY-1493: Record the recipient's first click

**Depends on:** PR 1 / NY-1487, PR 3 / NY-1489, PR 5 / NY-1491, and PR 6 / NY-1492.

**Outcome:** An automation redirect click stamps the matching tracked recipient row without affecting newsletter clicks.

**Implementation:**

- Add an automations-repository operation receiving `{memberId, redirectId, clickedAt}`.
- Subscribe the automations service to the existing `MemberLinkClickEvent`; keep the existing last-seen subscriber unchanged.
- In one database transaction:
  - resolve the redirect's `automation_action_revision_id`;
  - return without changes for newsletter redirects or missing revisions;
  - lock tracked recipient rows matching the member and revision;
  - return without changes when no tracked recipient exists;
  - set `clicked_at` for matching rows that have not been stamped yet, using the event timestamp;
  - return whether this was the member's first recorded click for that revision so PR 8 can extend the transaction safely.
- If duplicate recipient rows exist for the same member/revision, stamp them together but treat them as one member click.
- Catch and log subscriber failures without breaking the public redirect response.

**Verification:**

- Repository tests for first click, repeat click, untracked recipient, newsletter redirect, unknown member/revision, and duplicate recipient rows.
- Service subscription test proving a `MemberLinkClickEvent` delegates once with its timestamp and IDs.
- Keep the existing `LastSeenAtUpdater` click tests green.

### PR 8 — NY-1494: Increment the unique click counter

**Depends on:** PR 2 / NY-1488 and PR 7 / NY-1493.

**Outcome:** The revision counter increases once when a member first clicks any link in that revision.

**Implementation:**

- Extend the PR 7 transaction so a transition from no clicked recipient row to at least one clicked row increments `automation_action_revisions.email_clicked_count` by one.
- Use `COALESCE(email_clicked_count, 0) + 1`, matching sent/opened aggregation.
- Do not increment for a repeated click, a second link clicked by the same member, duplicate event delivery, an untracked send, or a newsletter redirect.
- Keep recipient stamping and counter increment atomic so they cannot drift on a process failure.

**Verification:**

- Add unit tests for first click, repeated same-link click, different-link click by the same member, two different members, and concurrent duplicate events.
- Assert both `clicked_at` and `email_clicked_count` after each case.

### PR 9 — NY-1444: Expose aggregate click stats

**Depends on:** PR 8 / NY-1494.

**Outcome:** `GET /ghost/api/admin/automations/:id/` returns click count and rate for each send-email action.

**Implementation:**

- Add `email_clicked_count` to `AutomationEmailStats` in the backend and `admin-x-framework` types.
- Extend `loadActionStats` in `database-automations-repository.ts` to sum `email_clicked_count` across all revisions for each action alongside sent/opened counts.
- Return:
  - `email_clicked_count: 0` when no clicks exist;
  - `clicked_rate: null` when nothing has been sent;
  - otherwise `Math.round(email_clicked_count / email_sent_count * 100)`.
- Do not include the per-link list in this response.

**Verification:**

- Repository tests for multiple revisions, zero sends, zero clicks, and normal rounding.
- Update Admin API e2e snapshots and add an assertion covering aggregate click stats.
- Run `cd ghost/core && pnpm test:single test/e2e-api/admin/automations.test.js`.

### PR 10 — NY-1486: Add the per-link click-count endpoint

**Depends on:** PR 3 / NY-1489 and PR 6 / NY-1492. It can be developed in parallel with PRs 7–9 once redirects are being created.

**Outcome:** Admin can fetch a sorted, de-duplicated list of destinations and unique member click counts for one automation action.

**API contract:**

```http
GET /ghost/api/admin/automations/:automation_id/actions/:action_id/links/

200 OK
{
  "automation_action_links": [
    {"url": "https://example.com/pricing", "clicked_count": 12}
  ]
}
```

**Implementation:**

- Add a focused `automation-action-links.js` Admin API controller and export it from the endpoint index.
- Add the route to Admin `routes.js`, protected by Admin API auth and automation read permissions.
- Add an automations repository/API method that:
  - verifies the non-deleted action belongs to the requested automation;
  - joins redirects through `automation_action_revisions` to the action;
  - left-joins `members_click_events` so unclicked destinations appear with zero;
  - groups by normalized `redirects.to`, de-duplicating the same destination across revisions;
  - counts distinct `member_id` per destination;
  - orders by count descending, then URL ascending for deterministic ties.
- Return 404 when either the automation/action pairing is invalid.
- Add an `AutomationActionLink` type and `useBrowseAutomationActionLinks` query hook in `admin-x-framework`.

**Verification:**

- Admin API e2e tests for permissions, invalid automation/action pairs, duplicate destinations across revisions, duplicate clicks by one member, zero-click links, sorting, and empty results.
- Repository unit tests for the same aggregation semantics.
- Run the focused Admin API test and `pnpm --filter @tryghost/admin-x-framework test:unit`.

### PR 11 — NY-1456: Show Clicked on the canvas node

**Depends on:** PR 9 / NY-1444.

**Outcome:** Each send-email node shows Sent, Opened, and Clicked values matching the approved prototype.

**Implementation:**

- Enable the Clicked cell in `EmailStepStatsFooter` in `apps/admin/src/automations/components/canvas/nodes.tsx`.
- Render `formatRate(stats.clicked_rate)` so zero sends display `--` and tracked zero clicks display `0%`.
- Preserve the existing behavior when an action has no stats or automation analytics is disabled.

**Verification:**

- Extend `apps/admin/src/automations/editor.test.tsx` for populated, zero-send, and missing-stat cases.
- Run `pnpm --filter @tryghost/admin test:unit -- src/automations/editor.test.tsx` and Admin typecheck.

### PR 12 — NY-1457: Show Clicked in the email-performance sidebar

**Depends on:** PR 9 / NY-1444.

**Outcome:** The sidebar shows a Clicked KPI and the third teal chart ring, without yet adding the links table.

**Implementation:**

- Enable the Clicked KPI in `email-performance-section.tsx`.
- Show `clicked_rate` normally and `email_clicked_count` on KPI hover, matching Opened.
- Pass click rate into `EmailPerformanceChart` and render the existing teal ring definition.
- Keep the top-clicked-links area out of this PR so NY-1485 remains independently reviewable.

**Verification:**

- Add editor tests for the KPI percentage, hover count, chart label, zero sends, and zero clicks.
- Run the focused Admin test and typecheck.

### PR 13 — NY-1485: Add the top clicked links table

**Depends on:** PR 10 / NY-1486 and PR 12 / NY-1457.

**Outcome:** Opening a send-email sidebar fetches and displays up to ten top destinations with unique-member counts.

**Implementation:**

- Thread automation and action IDs into the sidebar performance section.
- Call `useBrowseAutomationActionLinks` only while the send-email sidebar is open and link data is relevant.
- Render a Shade `DataList` below the chart with:
  - destination URL, stripped of `http(s)://` for display but linked to the full URL;
  - absolute unique-member count;
  - percentage of the action's unique clicking members;
  - a proportional bar;
  - a maximum of ten rows.
- Provide explicit loading, request-error, no-sends, and no-links states. A zero-click link still appears with `0`.
- Keep the API response out of the automation read payload.

**Verification:**

- Mock the separate query in `editor.test.tsx` and cover populated, loading, error, no-sends, no-links, zero-click, and ten-row truncation cases.
- Assert the endpoint is not requested for a closed or non-email sidebar.
- Run the focused Admin test and typecheck.

### PR 14 — NY-1466: Respect open/click tracking settings in the UI

**Depends on:** PR 11 / NY-1456, PR 12 / NY-1457, and PR 13 / NY-1485.

**Outcome:** The editor only displays analytics that the site has enabled, without deleting or hiding the underlying server data.

**Implementation:**

- Read `emailTrackOpens` and `emailTrackClicks` from the existing Admin app context.
- Canvas node:
  - always show Sent;
  - show Opened only when open tracking is enabled;
  - show Clicked only when click tracking is enabled;
  - adjust the footer grid to one, two, or three visible columns.
- Sidebar:
  - apply the same visibility rules to KPIs and chart rings;
  - hide the top-links section and skip its query when click tracking is disabled;
  - retain a useful Sent-only layout when both settings are disabled.
- Do not mutate or filter stats in the backend.

**Verification:**

- Add table-driven editor tests for all four open/click setting combinations.
- Assert both canvas and sidebar visibility, chart rings, grid layout, and whether the links query runs.
- Run the focused Admin test and typecheck.

### Close-out — NY-1384: Create email open/click tracking UI

**Depends on:** PRs 11–14.

NY-1384 is the umbrella issue represented by its canvas, sidebar, links-table, and setting-visibility children. Do not raise another code PR. Once those children are merged, perform the integrated acceptance pass below and close NY-1384 with links to the four UI PRs.

## Integrated acceptance pass

After all scoped PRs are combined:

1. Enable `automationAnalytics`, `email_track_opens`, and `email_track_clicks`.
2. Create an active automation email containing:
   - two different HTTP destinations;
   - the same destination twice;
   - a relative site link;
   - a fragment-only link;
   - a non-HTTP link such as `mailto:`.
3. Trigger sends to two members concurrently.
4. Verify one redirect exists per `(revision, destination hash)`, repeated destinations share it, and excluded links remain unchanged.
5. Verify both HTML and plaintext contain working tracked content URLs with the correct member UUID.
6. Click one link twice and another link once as member A; click one link as member B.
7. Verify:
   - raw click events are retained;
   - each recipient has one earliest `clicked_at`;
   - the revision counter is `2`, not the raw event count;
   - the automation response reports the expected click count/rate;
   - the links endpoint counts distinct members and de-duplicates destinations;
   - last-seen behavior still works through the existing event subscriber.
8. Verify the canvas, sidebar KPI/ring, and top-links table match the API.
9. Turn click tracking off and verify new sends are not rewritten, `track_clicks` is snapshotted as false, Clicked UI disappears, and existing data remains stored.
10. Run:
    - `cd ghost/core && pnpm test:unit`
    - `cd ghost/core && pnpm test:single test/e2e-api/admin/automations.test.js`
    - the new automation-action-links Admin API e2e test
    - `pnpm --filter @tryghost/admin-x-framework test:unit`
    - `pnpm --filter @tryghost/admin test:unit -- src/automations/editor.test.tsx`
    - `pnpm --filter @tryghost/admin typecheck`

## Prototype risks accepted for now

- Click counters are incrementally maintained rather than recomputed on every automation read; the atomic first-click transaction is the guard against drift.
- Redirects are revision-scoped, so editing an action creates a new redirect set and historical counts remain attributable to the old revision.
- The per-link endpoint queries raw events on demand. Pagination/caching can follow if real datasets show it is needed.
- Destination editing is deliberately unsupported. If added later, `to` and `to_hash` must be updated together.
- No launch reset, backfill, or historical reconstruction is included in this prototype.
