# Editor engine

The pure-TypeScript core of the React post editor: the save engine (`save-engine.ts`), the change tracker (`change-tracker.ts` + `lexical-compare.ts`), and the slug machine (`slug-machine.ts`). None of them import React or the network; every side effect goes through an injected port, and the editor's wiring hook composes the three. This file states the intended behavior for a maintainer who has not read the design spec; the modules' tests pin it.

## Save engine

Replaces the Ember editor's three ember-concurrency modifiers (an `enqueue` group, a `drop` autosave, a `restartable` debounce) and the ad-hoc branches of the `lexical-editor` controller with one single-flight queue over typed save commands.

### Intents

| Intent                            | Trigger                                                              | Debounce                            | `save_revision` | Changes status?                                                                                                                           |
| --------------------------------- | -------------------------------------------------------------------- | ----------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `autosave`                        | body change; a new post's first edit fires immediately               | 3s restartable (none for new posts) | no              | never; drafts only, pinned to `draft`                                                                                                     |
| `timed`                           | armed by an autosave dispatch, fires after 60s of continuous editing | 60s cycle                           | no              | never; drafts only                                                                                                                        |
| `field`                           | title blur, excerpt blur, feature-image change                       | none                                | no              | never; drafts only. On a published/scheduled/sent post it is dropped with reason `not-draft`: the sidebar stages those edits until Update |
| `explicit`                        | Cmd-S / Save / Update                                                | none                                | yes             | never; preserves the current status (a past-scheduled post saves as `scheduled`, the server owns that transition)                         |
| `leave`                           | navigating away from a dirty draft with unrevisioned changes         | none                                | yes             | never; preserves the current status                                                                                                       |
| `publish` / `schedule` / `revert` | the publish flow                                                     | none                                | no              | the only status-changing commands; each carries an explicit target                                                                        |

### Commands

`dispatch(kind, options?)` captures an immutable `SaveCommand` (`{kind, target?, requiresRevision, requiresReconfirmation}`) at dispatch time. Status commands derive their `target` from the source transition when captured and never re-derive it from a later snapshot, so a response resync cannot turn a queued schedule into a publish:

| Command                          | Target                                                                   |
| -------------------------------- | ------------------------------------------------------------------------ |
| `publish`                        | `published`; keeps the post's publish time unless `publishedAt` is given |
| `schedule`                       | `scheduled` at the given time                                            |
| `revert` from `scheduled`        | `draft`, publish time cleared, `emailOnly: false`                        |
| `revert` from `published`/`sent` | `draft`, publish time kept as history, `emailOnly: false`                |

Email extras (`newsletter`, `emailSegment`, `emailOnly`) ride on exactly that command's request. A failed status command is disarmed: nothing retains its target, the publish flow dispatches a fresh command. Publish times are serialized with zeroed milliseconds.

### Queue semantics

One save in flight, one pending slot. A command arriving while idle runs immediately (after its debounce); one arriving during a save lands in the pending slot and coalesces: priority `publish`/`schedule`/`revert` > `explicit` > `leave` > `field` > `timed` > `autosave`, the winner's kind executes, every waiter keeps its own command, `requiresRevision` ORs across the slot, and the payload is rebuilt from the current post at execution, so coalescing never loses newer content. A later status command supersedes only the earlier status command; its riders stay with the winner. A new autosave restarts the debounce; an explicit cancels it and carries its waiters. The pending slot exists because Ember's `drop` autosave starved: autosaves fired during an in-flight create were silently lost.

Every dispatch settles with a typed `SaveCompletion`:

| Completion                       | Meaning                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `saved` (`result`, `executedAs`) | the save that carried this command's content landed; `executedAs` names the kind that ran |
| `failed` (`error`, `executedAs`) | typed error; content stays dirty                                                          |
| `dropped` (`reason`)             | `not-draft`, `clean`, `suppressed`, `conflict`, `halted`, `disposed`                      |
| `superseded` (`by`)              | a later status command replaced this one before it ran                                    |
| `needs-retry`                    | re-auth interrupted a status-changing command; the publish flow re-confirms               |

### Lifecycle

`capture → prepare → execute → reconcile → drain`, all inside the single-flight unit:

1. **Prepare** awaits pending manual slug work (`slug.settled()`), re-reads the snapshot, substitutes `(Untitled)` for a blank or whitespace title, asks `slug.fromTitle()` for every draft save and whenever the post has no slug (the machine answers `generated` or `unchanged`; after an `unchanged` answer the slug current at that moment is sent), resolves the target, then hands the `SaveRequest` to the adapter's `prepare()` to build and validate the candidate. IO starts only after prepare settles; a rejected prepare is a typed failure with no request sent.
2. **Execute** is IO only and returns a typed `SaveOutcome`; its `AbortSignal` is aborted on `dispose()`, and a response arriving after dispose is never reconciled.
3. **Reconcile** is awaited before the pending slot drains and must not throw: adopt the acknowledged id, status and `updated_at` first, keep edits made after `prepared.snapshot.version`, resync server-normalized values only where the local value did not change in flight.
4. **Drain** starts the pending slot only when nothing is in flight.

Reconcile-before-drain is a hard ordering contract because Core enforces optimistic concurrency on posts: `@tryghost/bookshelf-collision` (registered in `models/base/bookshelf.js`) rejects any post update whose `updated_at` differs from the server's, when a meaningful field changed, with `UPDATE_COLLISION`. A queued save built from the pre-response snapshot would manufacture exactly the false "someone else is editing" collision Ember users hit today. The persisted snapshot type therefore requires `updatedAt` alongside `id`.

### Errors and states

| Error kind                      | State                                                                                                                                                                     | Exit                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `session-invalid`               | `reauth-pending`; queue frozen, later commands coalesce into the pending slot, content untouched                                                                          | `reauthSucceeded()` / `reauthAbandoned()`                                    |
| `not-found` with an id          | `halted` (deleted elsewhere); every queued command dropped `halted`, content kept for copy-out                                                                            | none                                                                         |
| `not-found` without an id       | `crashed` (corrupt new-post state)                                                                                                                                        | none                                                                         |
| `conflict` (`UPDATE_COLLISION`) | `conflict`; timers and the pending slot dropped `conflict`, background saves refused while the snapshot still carries the rejected `updated_at`, content intact and dirty | an explicit save, or adopting a fresh baseline (reload) which lifts the halt |
| `validation`                    | `error`; background saves suppressed until the snapshot version moves                                                                                                     | next edit, or an explicit save                                               |
| `host-limit`                    | `error`; suppression as for validation, but only when the failing save was itself a draft save (a publish limit never halts autosave)                                     | next edit, or an explicit save                                               |
| `transport` / `unknown`         | `error`, no suppression                                                                                                                                                   | next save                                                                    |

`error` and `conflict` persist until a save actually starts; timers arming or a dropped save do not clear them. Other states: `idle`, `debouncing`, `saving`, `pending-coalesced`, `disposed`.

### Re-auth

`reauthSucceeded()` inspects every waiter in both the frozen and the pending slot and judges each by its resolved effect against the current post: a command whose target would change the status resolves `needs-retry` and never auto-fires (Ember's post-re-auth retry is a no-op; the real contract is "no content loss"); everything else re-enters through the normal enqueue path with its own intent, so a frozen explicit rider re-runs while the publish it coalesced into does not. Content a disarmed status command would have carried resumes through the autosave path; if the snapshot cannot be read at that point the debounce is re-armed so the retry surfaces a failure instead of abandoning content. `reauthAbandoned()` settles every waiter with the session error and moves to `error`; the shell decides on a sign-in redirect, the queue never dangles.

### Leave

`leaveRequested()` returns `proceed` or `confirm` and loops until nothing is in flight, pending, or armed with dirty content, re-reading the post after every wait: `saving` is never safe to leave. Save-on-leave (with a revision) fires at most once per attempt, only for a dirty draft with unrevisioned changes or an armed autosave, never on a stale baseline, never while frozen or halted. A post still dirty afterwards asks for confirmation. Concurrent calls share one decision; a decision that outlives the engine resolves `proceed`.

### Subscriptions

`subscribe()` suits `useSyncExternalStore`: emissions are deduplicated, listeners receive the emitted value, a throwing `onStateChange` port or subscriber is reported through `onListenerError` without interrupting the save, and a nested transition ends the outer pass so no listener sees an out-of-order state.

## Change tracker

`change-tracker.ts` + `lexical-compare.ts`. Answers one question for the editor: does the live post differ from what is persisted, and why. Pure, React-free; the hidden second Koenig instance stays — the tracker consumes its serialization as the baseline.

### State model

Three documents: **saved** (last persisted state, from load/refetch/ack), **baseline** (the hidden instance's post-load serialization — the document after Lexical's load-time transforms), **live** (the visible editor). Body verdict: dirty ⇔ live differs from saved **and** from baseline. Baseline readiness is separate from its value: `pending` (not reported yet), `ready` (a known document; `null`, `''`, and an empty root are all known-empty), `failed`. A live edit while pending is dirty (`BASELINE_PENDING`, fail closed); a failed baseline falls back to live-vs-saved (`BASELINE_FAILED`) and never disables body protection. Title, ordered tag names, and the editable attributes contribute their own dirty bits. Reason codes mirror Ember's (`POST_HAS_ERROR`, `POST_TAGS_DIVERGED`, `POST_TITLE_DIVERGED`, `SCRATCH_DIVERGED_FROM_SECONDARY`, `NEW_POST_HAS_CHANGED_ATTRIBUTES`, `POST_HAS_DIRTY_ATTRIBUTES`) plus `BASELINE_PENDING`, `BASELINE_FAILED`, `LEXICAL_PARSE_FAILED` (malformed or structurally invalid Lexical is dirty, never a thrown route blocker).

### API (id-first; events for another post are dropped)

| Method                                                           | Meaning                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `load(postId, post)`                                             | Reset for a post; `postId` is `null` for a new post until the create acks                                                                                                                                                                                                                                                                                                 |
| `setSaved(postId, post)`                                         | Query refetch only. Never re-baselines. Dropped entirely if its `updated_at` is older than the held one                                                                                                                                                                                                                                                                   |
| `saveAcknowledged(postId, submitted, acknowledged)`              | Mutation response, from the engine's reconcile port. Three-way rebase per key: base = submitted value (or previous saved when omitted); live still equal to base adopts the server value, otherwise the later edit wins. Always adopts `acknowledged.updated_at`; re-baselines to the acknowledged body. A create ack passes the created id — the projection carries none |
| `setBaseline(postId, lexical)` / `baselineFailed(postId, error)` | The hidden instance's report                                                                                                                                                                                                                                                                                                                                              |
| `setLive(postId, patch)`                                         | Patch semantics; `updated_at` in a patch is ignored                                                                                                                                                                                                                                                                                                                       |
| `revisionRestored(postId, projection)`                           | After the restore save acks: adopts body, title, custom excerpt, feature image + alt + caption into saved and live atomically; baseline goes pending until the hidden instance re-reports                                                                                                                                                                                 |
| `markSaveError()` / `clearSaveError()`                           | A failed save keeps the post dirty until an acknowledged save                                                                                                                                                                                                                                                                                                             |
| `verdict({includeDiff?})`                                        | `{dirty, reasons[, diff]}`                                                                                                                                                                                                                                                                                                                                                |
| `hasChangedSinceRevision(latest)`                                | The server's revision projection (body, title, custom excerpt, feature image), body compared semantically                                                                                                                                                                                                                                                                 |
| `dispose()`                                                      | Inert thereafter                                                                                                                                                                                                                                                                                                                                                          |

After a create ack promotes `null → id`, `null` is accepted as an alias on `setLive`/`setBaseline`/`baselineFailed` until the next `load()`/`dispose()`, so keystrokes between the ack and the caller's id swap are not dropped. While the id is still `null`, an ack for an id this tracker has already held is refused (a stale completion from a previous post).

### Normalization

Element-node `direction` is stripped recursively before compare (Lexical's reconciler infers it per environment). Site URLs are normalized to relative **only on known URL-bearing node properties** (the same map the server's URL transforms use: link `url`, image/gallery/audio/video/file sources, bookmark url + icon/thumbnail, button/header/email-cta urls, product image, embed url), tolerant of trailing-slash and subdirectory site URLs; prose, code, html, markdown, captions, and opaque card payloads are never rewritten, so a deleted literal site URL stays dirty. Snapshots are cloned at ingress; tags compare as ordered name arrays.

## Slug machine

`slug-machine.ts`. Tracks whether the slug follows the title (`derived`), was edited by hand (`custom`, sticky for the session), or is frozen for blank/`(Untitled)` titles; a saved title ending in `(Copy)` is an exception to custom detection, so a duplicated post's slug regenerates on its first rename. Details land with the machine.

## Contracts between modules

- **Engine → tracker.** The engine's `reconcile(prepared, result)` port calls `tracker.saveAcknowledged(postId, submitted = prepared.snapshot, acknowledged = the full post the server returned)`; `execute` therefore returns the full acknowledged post as its `R`, and `SaveResult.id` is the id a create ack promotes the tracker to.
- **Engine ← tracker.** The engine's `SaveSnapshot` is a structural superset of the tracker's `EditablePostProjection` (id, `updatedAt`, status, publish time, title, slug, dirty bits, version); the wiring hook builds it from the tracker's verdict plus post metadata.
- **Engine ← slug machine.** `SlugPort` is an adapter over the machine: `settled()` awaits the machine's latest submission chain (not its `pending` flag, which drops at the emit before the deferred submission starts); `fromTitle(title, postId, signal)` runs `titleCommitted` and resolves the settled proposal as `{slug, source: 'generated' | 'unchanged'}`.
- **Prepared object.** `prepared` is handed unchanged from `prepare` through `reconcile`; it is a plain structural superset of the `SaveRequest` (no brand), and `prepared.snapshot` is the complete post as read at execution time.

## Invariants

| Invariant                                                                                                                     | Pinned in                                                     |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A background command (`autosave`/`timed`/`field`) can never change status, publish, or send email                             | `save-engine.test.ts` "invariant 1"                           |
| No two saves are in flight; payloads are built at execution; coalescing never loses the newest content                        | "invariant 2", "lifecycle"                                    |
| Session expiry during a save loses nothing: re-auth completes, the save lands, content is present                             | "invariant 3", "re-auth outcomes"                             |
| Save-on-leave fires at most once per attempt and only for dirty drafts                                                        | "invariant 4", "leave outcomes"                               |
| Loading any post, including old-schema fixtures, is a clean verdict until the user edits                                      | `change-tracker.test.ts` fixture corpus                       |
| A failed save leaves the post dirty and recoverable; no error path discards the payload                                       | "invariant 6", "collisions"                                   |
| Explicit and leave saves set `save_revision`; background saves do not; publish does not force one (coalescing ORs)            | "invariant 7"                                                 |
| A published/scheduled/sent post's persisted state changes only via explicit Update, publish-flow commands, delete, or restore | "invariant 1", "commands"                                     |
| Slug generation never overwrites a custom slug and never applies a stale proposal                                             | `slug-machine.test.ts`; "prepare stage" for the port contract |
| Scheduled saves serialize with zeroed milliseconds and preserve the publish time unless the user changed it                   | "invariant 10", `deriveTarget`                                |

## Deliberate Ember deltas

- Pending-slot coalescing instead of `drop`-task starvation: autosaves during an in-flight create are carried, not lost.
- Leaving a post that is still dirty after the leave save asks for confirmation instead of proceeding.
- Sidebar edits on published/scheduled/sent posts are staged until Update; nothing persists immediately.
- An explicit save on a past-scheduled post preserves `scheduled` and lets the server own the transition (Ember guessed `published`/`draft`).
- `UPDATE_COLLISION` is a typed `conflict` state with a retry affordance, not a generic error.
- After re-auth, publish/schedule/revert resolve `needs-retry` and safe saves re-run; Ember's retry was a no-op.
- A manually edited slug stays custom for the session; a server-deduplicated slug keeps following the title.
- Recursive `direction` strip before compare (Ember: top level only).
- A query refetch never re-baselines; only an acknowledged save does.
- Structural site-URL normalization on known URL-bearing node props (Ember: none on the dirty check).
- Fail closed on malformed Lexical (Ember threw and the route blocker failed open).
- Explicitly clearing a non-empty body is dirty.
- The leave-modal diff humanizer actually runs (Ember's read a nonexistent field and threw).

## What the caller owns

### Save engine

- A no-redirect request mode: the framework transport redirects on 401 (`apps/admin-x-framework/src/utils/api/fetch-api.ts`); the editor adapter must instead throw `SessionExpiredError` so the engine can enter `reauth-pending`.
- Mapping API failures to `SaveError` kinds in `execute` (401 → `session-invalid`, 404 → `not-found`, `UPDATE_COLLISION` → `conflict`, 422 → `validation`, host-limit errors → `host-limit`, unreachable → `transport`).
- Past-scheduled detection for the UI (Ember's `pastScheduledTime`); the engine only preserves the status.
- Replacing the URL from new → edit as a state-driven effect after the create ack, with the editor screen keyed on the editing-session instance so the switch does not remount the editor.
- The `SlugPort` adapter over the slug machine (`settled` = latest submission chain, `fromTitle` = `titleCommitted` → settled proposal), including pre-slugifying the raw title before the generator request.
- `(Untitled)` substitution is the engine's prepare duty; the title input never shows it.

### Change tracker

- A fresh tracker per editing session, including a new one for each new-post session.
- Query data goes to `setSaved`, mutation responses to `saveAcknowledged`; never the reverse.
- `revisionRestored` only after the restore save acks.
- Pass the execution-time snapshot (`prepared.snapshot`) as `submitted`.

### Slug machine

- Wiring duties land with the machine.
