# Portal Test Coverage Phase Tracker

## Tracker metadata

- Project: Portal test coverage to enforced 100% on `apps/portal/src/**`
- Repo: `Ghost-portal-test-coverage`
- Start date:
- Target completion date:
- Test lead:
- Engineering owner:
- QA owner:
- Last updated:

## Status legend

- `Not started`
- `In progress`
- `Blocked`
- `Done`
- `Validated`

---

## Phase 1: Baseline and Scope Lock (PR A+B)

- Status: `In progress`
- Owner: `Codex + @peterzimon`
- Branch / PR: `DES-1304/portal-test-coverage`
- Planned start: `2026-03-09`
- Planned end:
- Actual end:

### Implementation checklist

- [x] Add coverage `include` to `src/**/*.{js,jsx,ts,tsx}` in `apps/portal/vite.config.mjs`
- [x] Add coverage `exclude` for non-executable assets
- [x] Keep `text-summary`, `html`, and `cobertura` reporters enabled
- [x] Capture baseline coverage snapshot
- [x] Add non-regression thresholds (temporary baseline lock)

### Testable exit criteria

- [x] `cd apps/portal && yarn test:ci` passes with scoped coverage config
- [x] Coverage report output is stable and includes file-level details
- [x] CI fails on coverage regression vs baseline

### Direction validation gate

- [ ] Scope and exclusions approved
- [ ] Temporary threshold strategy approved
- Approval date:
- Approved by:
- Notes: Baseline snapshot recorded in `portal-tc-phase1-baseline.md`.

---

## Phase 2: Contract Hardening (Theme/Data Attributes)

- Status:
- Owner:
- Branch / PR:
- Planned start:
- Planned end:
- Actual end:

### Implementation checklist

- [ ] Expand tests for `data-members-form` states (`loading`, `success`, `error`)
- [ ] Expand tests for newsletter edge case (`newsletters: []` when none selected)
- [ ] Expand tests for `data-members-signout`
- [ ] Expand tests for cancel/continue subscription contract paths
- [ ] Expand tests for `data-portal` trigger behavior and route/hash entry points

### Testable exit criteria

- [ ] Contract test matrix mapped to all documented `data-members-*` behavior
- [ ] Contract-related modules have no uncovered critical branches
- [ ] No contract regression in repeated local runs

### Direction validation gate

- [ ] Theme contract coverage is sufficient for rebuild safety
- [ ] No major contract gaps deferred without owner and due date
- Approval date:
- Approved by:
- Notes:

---

## Phase 3: Bootstrap and Routing Utilities (PR C+D)

- Status:
- Owner:
- Branch / PR:
- Planned start:
- Planned end:
- Actual end:

### Implementation checklist

- [ ] Add bootstrap tests for `src/index.js` (root insertion, token stripping, render call)
- [ ] Add tests for `src/utils/notifications.js`
- [ ] Add tests for `src/utils/check-mode.js`
- [ ] Add or tighten tests for `src/pages.js` routing helper edge cases

### Testable exit criteria

- [ ] `src/index.js` coverage complete (or documented temporary exception)
- [ ] `notifications.js` coverage complete (or documented temporary exception)
- [ ] `check-mode.js` coverage complete (or documented temporary exception)

### Direction validation gate

- [ ] Bootstrap/query handling behavior is locked and approved
- [ ] Routing/mode detection behavior is locked and approved
- Approval date:
- Approved by:
- Notes:

---

## Phase 4: API Client Branch Closure (PR E)

- Status:
- Owner:
- Branch / PR:
- Planned start:
- Planned end:
- Actual end:

### Implementation checklist

- [ ] Add branch tests for `sendMagicLink` success/failure and content-type variants
- [ ] Add branch tests for `getIntegrityToken` success/failure
- [ ] Add branch tests for checkout/billing session calls
- [ ] Add branch tests for recommendation beacon/click tracking paths
- [ ] Confirm mocking approach (`vi` stubs; selective MSW only where justified)

### Testable exit criteria

- [ ] `src/utils/api.js` reaches target branch/line/function coverage
- [ ] Error branches assert user-visible or state-visible outcomes
- [ ] No real network calls in tests

### Direction validation gate

- [ ] API test strategy is maintainable and approved
- [ ] Network mocking approach approved for remaining phases
- Approval date:
- Approved by:
- Notes:

---

## Phase 5: Action and App Core Branch Closure (PR F+G)

- Status:
- Owner:
- Branch / PR:
- Planned start:
- Planned end:
- Actual end:

### Implementation checklist

- [ ] Close remaining branches in `src/actions.js`
- [ ] Close remaining branches in `src/app.js`
- [ ] Cover key error/catch paths and side-effect branches
- [ ] Add targeted integration tests only where unit-level invocation is insufficient

### Testable exit criteria

- [ ] `src/actions.js` reaches target coverage
- [ ] `src/app.js` reaches target coverage
- [ ] Repeated runs show stable pass rate (low/no flake)

### Direction validation gate

- [ ] Test style remains behavior-focused and maintainable
- [ ] No high-risk untested paths remain in app controller logic
- Approval date:
- Approved by:
- Notes:

---

## Phase 6: Critical E2E Flow Assurance

- Status:
- Owner:
- Branch / PR:
- Planned start:
- Planned end:
- Actual end:

### Implementation checklist

- [ ] Validate auth critical path (signin/signup/magic link, OTC where applicable)
- [ ] Validate paid conversion critical path (plan click to checkout)
- [ ] Validate billing management path (manage billing / update billing)
- [ ] Validate cancellation and continuation flows (including retention-offer behavior)
- [ ] Align internal PR vs nightly execution lanes

### Testable exit criteria

- [ ] Critical flow suite passes in trusted Stripe-enabled environment
- [ ] Fork-safe behavior is documented (where secrets are unavailable)
- [ ] Failures provide actionable artifacts (Playwright report/trace)

### Direction validation gate

- [ ] Critical revenue/auth journeys are sufficiently protected
- [ ] Release confidence for core flows is approved
- Approval date:
- Approved by:
- Notes:

---

## Phase 7: Final Enforcement Flip (PR H)

- Status:
- Owner:
- Branch / PR:
- Planned start:
- Planned end:
- Actual end:

### Implementation checklist

- [ ] Remove temporary coverage exemptions
- [ ] Enable `coverage.thresholds.100 = true`
- [ ] Enable `coverage.thresholds.perFile = true`
- [ ] Ensure CI merge gate blocks any coverage shortfall

### Testable exit criteria

- [ ] Full suite passes with strict thresholds enabled
- [ ] Intentional uncovered-line proof test demonstrates gate enforcement
- [ ] No unresolved exemption tracking issues remain

### Direction validation gate

- [ ] Team agrees strict enforcement is now sustainable
- [ ] Policy approved for handling emergency temporary exceptions
- Approval date:
- Approved by:
- Notes:

---

## Phase 8: Sustainment and Governance

- Status:
- Owner:
- Branch / PR:
- Planned start:
- Planned end:
- Actual end:

### Implementation checklist

- [ ] Define flaky test SLA and quarantine policy
- [ ] Define ownership map for Portal test suites
- [ ] Define release gate checklist and rollback playbook
- [ ] Ensure coverage + E2E artifacts are visible and reviewable in CI

### Testable exit criteria

- [ ] Flake rate is tracked and under agreed threshold
- [ ] Open quarantines have owners and due dates
- [ ] Release/no-release decision framework is in active use

### Direction validation gate

- [ ] Long-term operating model approved
- [ ] Ongoing maintenance ownership approved
- Approval date:
- Approved by:
- Notes:

---

## Phase completion packet template (use at end of every phase)

### Phase summary

- Phase:
- Status:
- PR(s):
- Owner:
- Date completed:

### Evidence

- Coverage delta (before/after):
- Commands run:
- CI links / artifacts:
- New tests added (files):

### Risks and exceptions

- Temporary exemptions added:
- Known flaky tests:
- Deferred items (with owner/date):

### Go / No-Go decision

- Decision:
- Rationale:
- Approved by:
- Approval date:
