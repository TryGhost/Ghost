# BER-3414 Filter Rework PRD

Linear issue: BER-3414  
Team: Berlin Bureau  
Project: Member management and segmentation

## Scope And Boundaries

- [ ] [BER-3414-R001] Confirm in-scope surfaces are only Members list filters and Comments moderation filters.
  - Intent: Replace scattered filter logic with one shared implementation for the two active admin surfaces.
  - Acceptance criteria:
    - Members list and Comments moderation both consume the new abstraction.
    - No remaining active filter logic forks for these two surfaces.

- [ ] [BER-3414-R002] Confirm out-of-scope work is excluded from this delivery.
  - Intent: Keep delivery focused and reduce churn.
  - Acceptance criteria:
    - No Shade component internals are modified as part of BER-3414.
    - No unrelated filter usage outside Members/Comments is migrated in this ticket.

## Product Requirements

- [ ] [BER-3414-R003] Support filter state that includes both picker predicates and non-picker query channels.
  - Intent: Handle both visible filter rows and additional query behavior.
  - Acceptance criteria:
    - Abstraction can represent picker predicates.
    - Abstraction can represent member free-text search as a first-class typed channel.
    - Non-picker channels are explicitly named in the API contract (no ambiguous "extras" naming).

- [ ] [BER-3414-R004] Keep Ember-compatible filter syntax for serialized `filter` output.
  - Intent: Preserve compatibility with existing backend parsing and saved/linked URLs.
  - Acceptance criteria:
    - Generated `filter` strings use existing Ember/NQL syntax.
    - Existing Ember-compatible filter URLs continue to work without translation on the backend.

- [ ] [BER-3414-R005] Make `filter` serialization canonical, sorted, and stable.
  - Intent: Enable safe string equality checks for active state, caching, and query keys.
  - Acceptance criteria:
    - Equivalent predicate sets always produce identical serialized `filter` output.
    - Predicate ordering and value ordering rules are deterministic.
    - Canonicalization behavior is covered by unit tests.

- [x] [BER-3414-R006] Preserve backend query channel reality: members `search` remains separate from NQL `filter`.
  - Intent: Match the actual API contract instead of forcing search into hidden NQL predicates.
  - Acceptance criteria:
    - Members query compilation returns `{filter?: string, search?: string}`.
    - Comments query compilation returns `{filter?: string}`.
    - Combined members `filter + search` behavior is supported and tested.

- [ ] [BER-3414-R007] Keep "clear filters" behavior scoped to picker predicates only.
  - Intent: Prevent destructive clearing of independent search input state.
  - Acceptance criteria:
    - Clear action removes picker predicates.
    - Clear action does not remove member free-text search.
    - UI behavior is consistent in both Members and Comments.

- [ ] [BER-3414-R008] Split active-state semantics explicitly.
  - Intent: Avoid mixing filter button behavior with search behavior.
  - Acceptance criteria:
    - `hasFilters` reflects picker predicates only.
    - `hasSearch` reflects non-picker search only (members).
    - `hasFilterOrSearch` exists for empty-state/query behavior decisions.
    - Filter button placement/appearance is driven by `hasFilters` only.

## Technical Architecture

- [ ] [BER-3414-R009] Implement one shared filter domain module used by both surfaces.
  - Intent: Establish one source of truth for parsing, state updates, and query compilation.
  - Acceptance criteria:
    - Members and Comments import the same core state/reducer/compiler modules.
    - Surface-specific behavior is configured via typed field definitions, not copied logic.

- [ ] [BER-3414-R010] Use typed field definitions and reducer-driven state.
  - Intent: Guarantee valid field/operator/value combinations at compile time.
  - Acceptance criteria:
    - Operator values are typed per field and cannot be arbitrary strings.
    - Value shape is typed per field (single, multi, date, etc.).
    - Reducer actions are typed and validated by tests.

- [ ] [BER-3414-R011] Centralize all NQL conversion in one module.
  - Intent: Avoid duplicated conversion code and drift between surfaces.
  - Acceptance criteria:
    - No per-surface ad hoc NQL string building remains.
    - Parse and serialize logic for NQL lives in one place.
    - Query compilation APIs are explicit about UI state input and query output.

- [ ] [BER-3414-R012] Use explicit naming for UI/query conversions.
  - Intent: Replace ambiguous naming with intent-revealing contracts.
  - Acceptance criteria:
    - Conversion API names clearly indicate direction between UI state and query state.
    - Naming does not use ambiguous "extras"-style terminology.

- [ ] [BER-3414-R013] Expose derived active field metadata for table adaptation.
  - Intent: Support BER-3356 dynamic filtered columns cleanly.
  - Acceptance criteria:
    - Abstraction exposes active fields (and metadata needed by table rendering).
    - Members table can map active filter fields to required dynamic columns.
    - Behavior is covered by integration or component-level tests.

## UX And Behavior Fixes (Current Regressions)

- [ ] [BER-3414-R014] Add `is none of` operator for member label filtering.
  - Intent: Complement existing `is any of` support.
  - Acceptance criteria:
    - Operator is available in UI and typed field definitions.
    - Serialization/parsing handles `is none of` correctly.
    - Query behavior matches expected exclusion semantics.

- [ ] [BER-3414-R015] Allow multiple instances of the same member filter when multiselect is not appropriate.
  - Intent: Enable valid repeated predicates for fields that should support multiple rows.
  - Acceptance criteria:
    - Reducer supports duplicate field predicates where configured.
    - UI can add repeated field rows without clobbering previous rows.
    - Query compilation includes all applicable repeated predicates.

- [ ] [BER-3414-R016] Fix bug where adding a second label (or similar) filter breaks existing filters.
  - Intent: Ensure state operations are additive and stable.
  - Acceptance criteria:
    - Reproduction flow no longer removes/corrupts existing predicates.
    - Regression tests protect against future breakage.

## Compatibility And Migration Policy

- [ ] [BER-3414-R017] Enforce Ember compatibility via tests, not ad hoc runtime patching.
  - Intent: Strong guarantees with minimal ongoing maintenance complexity.
  - Acceptance criteria:
    - Test suite validates parse/serialize behavior against Ember-compatible expectations.
    - No backend translation layer is required for old/new filter dialect mapping.

- [ ] [BER-3414-R018] Keep migration strategy minimal and bold (no long-lived dual abstractions).
  - Intent: Move directly to target architecture without maintaining parallel systems.
  - Acceptance criteria:
    - New abstraction replaces existing Members/Comments filter hooks as source of truth.
    - Any temporary compatibility adapter is narrow, short-lived, and removal-scoped.

## Testing And Verification

- [ ] [BER-3414-R019] Add domain-level tests for parser, serializer, canonicalization, and reducer transitions.
  - Intent: Lock correctness for core logic independent of UI.
  - Acceptance criteria:
    - Round-trip tests cover valid and invalid filter input.
    - Canonical output tests cover ordering and normalization.
    - Reducer action tests cover add/edit/remove/clear and duplicate-row behavior.

- [ ] [BER-3414-R020] Add compatibility tests for members `filter`, members `search`, and combined behavior.
  - Intent: Reflect true backend contract and avoid regressions.
  - Acceptance criteria:
    - Members tests cover `filter`-only, `search`-only, and `filter+search`.
    - Comments tests confirm filter-only behavior remains correct.

- [ ] [BER-3414-R021] Add integration tests for UI semantics and empty state behavior.
  - Intent: Guarantee user-visible behavior stays consistent with product rules.
  - Acceptance criteria:
    - Filter button behavior follows `hasFilters` only.
    - Empty state behavior follows `hasFilterOrSearch`.
    - Clear action behavior matches scoped clearing rules.

## Dependencies And Follow-on Alignment

- [ ] [BER-3414-R022] Ensure implementation unblocks related issues with explicit handoff points.
  - Intent: Sequence work so BER-3346, BER-3357, BER-3355, BER-3356, and BER-3412 can proceed cleanly.
  - Acceptance criteria:
    - BER-3346 (saved filters) can persist canonical serialized query state.
    - BER-3357 (existing member URLs) remains compatible with Ember-style filter syntax and members search param usage.
    - BER-3355 (integration tests) has stable contracts to test against.
    - BER-3356 (dynamic columns) can consume active field metadata.
    - BER-3412 (search debounce) can target the dedicated members search channel without touching predicate logic.
