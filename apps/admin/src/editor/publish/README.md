# Publish options

`createPublishOptions()` is the state machine behind the editor's publish flow: it holds the choices a user makes in that flow (publish type, schedule, newsletter, recipients) and turns them into the save command that changes a post's status.

It is pure TypeScript. It imports no React and performs no network calls; every input is plain data supplied by the caller, and the only asynchronous work goes through injected limit ports. Every transition is synchronous and caller-driven, so there is no subscription: call a transition, then read `getState()`.

## Inputs

| Input    | Contents                                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `post`   | `status`, `isPage`, `visibility`, `tiers`, the persisted `newsletter` slug and `emailSegment`, and the post's `email` record when one exists |
| `site`   | `membersEnabled`, `mailgunConfigured`, `editorDefaultEmailRecipients` and its filter, `memberCount`, and the full `newsletters` list         |
| `user`   | `isAdmin` and `isAuthorOrContributor`, which decide whether each limit is evaluated                                                          |
| `limits` | Optional ports for the sending and publishing limit checks                                                                                   |
| `now`    | Optional clock, injected for tests                                                                                                           |

Inputs are read once, at creation: the machine is built after the data it needs has loaded, and replaced rather than updated when the post changes.

`memberCount` is read for admins only, because nobody else can browse members. A count of `null` — not read, or not readable — counts as "has members" so email is never disabled for the wrong reason.

Only newsletters with `status: 'active'` are selectable; they are ordered by `sortOrder`. The post's persisted active newsletter is selected initially when it is present, otherwise the first active newsletter is the default. A failed-email retry also retains its persisted newsletter even when it is no longer selectable. `onlyDefaultNewsletter` reports whether there is exactly one active newsletter, which is what decides whether the flow offers a newsletter picker at all.

## Publish types

Three types:

| Value          | Label             | Effect                                       |
| -------------- | ----------------- | -------------------------------------------- |
| `publish+send` | Publish and email | Publishes and emails the selected recipients |
| `publish`      | Publish only      | Publishes without emailing                   |
| `send`         | Email only        | Emails without listing the post publicly     |

`willPublish` is every type but `send`; `willOnlyEmail` is only `send`.

The initial type is `publish+send`, narrowed in order:

1. `publish` when email is unavailable or disabled.
2. `publish` when the site's default recipients are "usually nobody" (a `filter` default with no filter). Recipients still follow post visibility, so turning email on is a single click.
3. `send` for a post that has already been sent, whatever the two rules above decided.

`setPublishType()` does not validate, so `availablePublishTypes` is what tells the UI which types to offer:

| State             | `availablePublishTypes`           |
| ----------------- | --------------------------------- |
| Email available   | `publish+send`, `publish`, `send` |
| Email disabled    | `publish`                         |
| Email unavailable | `publish`                         |

Selecting a type that is not on offer never produces an email: the post-emails rules below gate on availability, not on the selection alone.

## Email availability

Two separate states, because they have different UI consequences.

**Unavailable** hides the type picker entirely. `emailUnavailableReason` names the first reason that applies:

| Reason                 | Condition                                                    |
| ---------------------- | ------------------------------------------------------------ |
| `page`                 | The post is a page                                           |
| `already-emailed`      | The post already has an email record, including a failed one |
| `disabled-in-settings` | Default recipients are `disabled`, or members are turned off |

**Disabled** shows the picker with the two email types disabled. `emailDisabledReason` names the first reason that applies:

| Reason               | Condition                                           |
| -------------------- | --------------------------------------------------- |
| `no-mailgun`         | No bulk email provider is configured                |
| `no-members`         | The member count is exactly `0`                     |
| `no-newsletter`      | No newsletter is selected, so no email can be built |
| `sending-limit`      | The host's email limit would be exceeded            |
| `email-verification` | Sending is on hold while the account is in review   |

The last two are set by `checkLimits()`.

## Recipients

`recipientFilter` is the member filter the email targets. Until the user picks one it is the post's own `emailSegment` (only when the post also carries a newsletter), otherwise the site default:

| Default recipients setting                 | Filter                            |
| ------------------------------------------ | --------------------------------- |
| `disabled`                                 | none                              |
| `filter` with a filter                     | that filter                       |
| `filter` with no filter ("usually nobody") | follows post visibility, as below |
| `visibility`                               | follows post visibility           |

Following visibility maps a public or members-only post to everyone (`status:free,status:-free`), a paid post to `status:-free`, and a tiers-restricted post to its tier segments (`tier:<slug>` joined by commas, or no filter when it has no tiers). Any other visibility value is used verbatim as the filter.

`setRecipientFilter(null)` is a real choice — "no recipients" — and is distinct from never having chosen. `missingRecipients` reports it while an email type is selected and email is on offer: Email only then cannot continue, and Publish and email publishes without an email. The options step says which under the recipients row, and the confirm step says the post won't be sent as a newsletter.

Core represents the special segments as `all` and `none`. Inputs and explicit selections normalize those API sentinels to the editor's expanded everyone filter and `null`. A segment that is a bare tier id, which Core rejects, is rewritten to `tier_id:<id>`; the recipient picker shows and toggles it as that tier's `tier:<slug>` option.

`fullRecipientFilter` is what the email service receives: the newsletter's own audience filter (subscribed to that newsletter, email not disabled, plus paid-only for a paid newsletter), AND-ed with the recipient filter when there is one. It is `null` while no newsletter is selected.

## Whether the post emails

`willEmail` requires a selected newsletter and email that is not disabled. Fresh emails must also be available; a failed-email draft is the only unavailable state allowed through because it retries an existing email. Given those prerequisites, it is true when either holds:

- the type is not `publish`, a recipient filter is set, the post is still a draft, and it has no email record; or
- the post is a draft whose email record failed. A failed send is retried regardless of the selected type or filter.

`willEmailImmediately` is `willEmail` on an unscheduled post — the flow's confirmation copy and the post-save hand-off to analytics hang off it.

## Scheduling

Times are ISO 8601 strings with milliseconds zeroed, for the reason given under [the engine's commands](../engine/README.md#commands).

- `minScheduledAt` is five seconds ahead of now and is recomputed on every read; it is the floor the picker enforces.
- `scheduledAt` starts at that floor.
- `setIsScheduled(true)` snaps a time that is earlier than ten minutes ahead of now forward to exactly that default; calling it with no argument toggles.
- `setScheduledAt()` zeroes milliseconds and clamps anything before the floor up to it. An unparseable date is ignored.
- The date and time fields commit at minute granularity, so a time the writer chooses carries no seconds of its own; an untouched default still carries the floor's.
- `resetPastScheduledAt()` turns scheduling off when the chosen time has fallen into the past. It leaves the stale time in place: re-enabling scheduling snaps it forward to the default, so the stale value is never offered.

## Producing a save command

`toDispatch()` returns the status command for the current options, shaped exactly as the save engine accepts it:

| Options                                | Command                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Unscheduled                            | `{kind: 'publish', options}` — no publish time, so the post keeps the one it has                       |
| Scheduled                              | `{kind: 'schedule', options}` with `publishedAt` set to the scheduled time                             |
| Not a draft                            | `null` — publishing and scheduling are draft-only transitions, and `canPublish` reports the same thing |
| Email-only without an executable email | `null` — an invalid email choice must never fall through to a public publish                           |

Email extras ride on the command only when `willEmail` is true: `emailOnly` (true only for `send`), the selected newsletter's slug, and the recipient filter as `emailSegment`. Failed-email retries omit the newsletter and segment overrides so Core validates and retries the durable email against the values it was created with. `toRevertDispatch()` returns `{kind: 'revert'}` for any status; the engine derives the rest of that transition (clearing the publish time only when unscheduling, and always clearing `emailOnly`).

The machine never mutates a post, so it needs no snapshot-and-rollback around a failed save: the save engine builds each request from its own snapshot and adopts the acknowledged status only once the server confirms it. A failed publish leaves both the post and these options exactly as they were, ready to dispatch again.

## Limits

`checkLimits()` runs the two host checks concurrently and returns — and stores — a typed result. It clears any result from a previous run first. Both checks settle before it returns or rethrows a settings-refresh failure, so a slower publishing block cannot land after the options step becomes ready.

The sending check awaits `refreshSettings()` before anything else, so a hold applied since the editor opened is seen; a failed refresh rejects `checkLimits()`. It then evaluates the email limit, skipping it for authors and contributors, who cannot read email counts. A rejection becomes a `sending-limit` block carrying the host's message. Only if the limit passes is the verification hold read, so a site under its email limit still surfaces a hold; a hold without host-specific copy uses the default message.

The publishing check runs for admins only, since nobody else can read the member count. A rejection becomes a `host-limit` block with the host's message split into `parts`, where the segment marked `upgrade` is the phrase to render as an upgrade link. The message is returned as data, never as markup.

A port that could not check its limit at all — the count read failed — rejects with a `LimitCheckError` naming the limit instead. That is not a block: it rejects `checkLimits()` once both checks have settled, as a failed settings refresh does, so the flow says it couldn't check and offers Try again rather than presenting a failed count as a reached limit.

Both blocks feed the state directly. An email block disables the email publish types and re-applies the initial-type rules, so the selection falls back to `publish`; that demotion also applies to a type the user picked before the block landed, since a block that arrives late must not leave an unsendable type selected.

The editor supplies the ports through `usePublishLimits()`, which backs them with the framework's limiter and the editor's settings and config reads. Only a `HostLimitError` from the limiter is a reached limit; any other rejection becomes a `LimitCheckError`. The limiter counts a failed member read as zero members, which passes, so the members port also reads the member-count query's state after the check and fails closed when that read failed during it. The limiter loads only the two limits the flow checks (`members` and `emails` under the host's `hostSettings.limits`), so opening the editor never reads the staff lists the other limits count. `refreshSettings` refetches the site settings and rejects when that read fails; `checkSendingLimit` asks the limiter whether one more send would exceed the monthly `emails` limit, counting the recipients of every email created since the period started; `checkPublishingLimit` asks whether the site is already over its `members` limit; and `getEmailVerification` reads `email_verification_required` from the refreshed settings, with the host's `hostSettings.emailVerification.emailSendingDisabledMessage` as its copy. A site without a limit configured, or one whose limiter has not loaded, passes every check. The ports read the latest hook values each time they run, so the machine can capture them once at creation.

## Dirty state and reset

`isDirty` compares the publish type, scheduling, newsletter and recipient filter against the values the machine started with; selecting the value that was already there is not a change. The scheduled time counts only while scheduling is on or the user has actually chosen a time, so turning scheduling on and back off leaves the state clean.

`reset()` restores every option and re-arms the automatic type fallback that `setPublishType()` disables. It takes a fresh scheduled time from the current clock, since the floor the machine was created with may itself have passed.

# Publish flow

`PublishFlowModal` is the screen that machine drives. It renders the three steps of Ghost's publish flow — options, confirm, complete — plus the email-failure step, over a fullscreen Shade dialog.

It is self-contained: the caller supplies the post projection, the site and user inputs, the site timezone and a `dispatch` function, and gets back a flow that publishes. The caller passes the save engine's `dispatch` unchanged; the modal never touches the engine, the editor session or the router. An optional `requestReauth` asks the writer to sign in again and resolves true once they have; the editor passes the session's own, so the flow's reads and requests share the save's sign-in dialog. `usePublishInputs()` assembles the site and user inputs from the API for callers that have no better source.

The stateful journey is keyed by post id. If a mounted caller replaces the post, the gates, options machine, limits readiness, failures and completion state all start again for the new post.

## Opening the flow

The flow opens at its email-failure step for a published or sent post whose email failed, and at the options step for anything else. `initialEmailError()` is that test, exported so a caller can tell whether opening the flow leads to a retry. A caller must not open the flow before `usePublishInputs()` reports the inputs ready: the machine is built from them once.

## Steps

The flow is a four-way branch, taken in this order:

| Condition                           | Step                         |
| ----------------------------------- | ---------------------------- |
| An email failed                     | `CompleteWithEmailErrorStep` |
| The publish landed                  | `CompleteStep`               |
| The user asked for the final review | `ConfirmStep`                |
| Otherwise                           | `OptionsStep`                |

`OptionsStep` is an accordion of the three settings — publish type, email recipients, publish time — with at most one section open, plus the read-only row describing a send the post already had, which is hidden while the site has newsletters or members turned off. While `willEmail` holds, the publish type row carries the email size warning when the post's email is estimated at 100kB or more; the estimate is the editor's, described in [the editor README](../README.md#email-size). Its continue button waits for `checkLimits()`, since a block landing late demotes the publish type and the user must not carry a stale choice into the review. `ConfirmStep` captures the publish intent on entry, so the copy on the button and in the sentence cannot change while the save is in flight. `CompleteStep` shows the post as a bookmark card and, for a schedule, offers the revert.

## Gates

Two interstitials can stand in front of the flow. A post with unresolved TK markers gets the TK reminder; a post whose public preview has no effect gets the public-preview warning, but only behind the `paywallImprovements` flag. They never stack: a TK count suppresses the preview warning. `getPublicPreviewWarning()` is the pure predicate behind the second one, and reads the editor's unsaved body when the caller passes it.

## Publishing

Confirming runs `onBeforePublish` (the editor's pre-save cleanup), dispatches the command from `toDispatch()`, and branches on the [completion](../engine/README.md#queue-semantics) the engine returns:

| Completion              | Result                                                                  |
| ----------------------- | ----------------------------------------------------------------------- |
| `saved`                 | Completes, after the hand-off hold for an immediate send                |
| `needs-retry`           | Back to confirm with a note, not an error; the user confirms again      |
| `failed` (`conflict`)   | The collision message, in place                                         |
| `failed` (`host-limit`) | The host's message, with the upgrade phrase rendered as a link          |
| `failed` (`validation`) | The validation message, in place                                        |
| `failed` (`not-found`)  | The post was deleted, so it can't be published                          |
| `dropped` (`halted`)    | The post may have been deleted or be out of reach; reloading won't help |
| `dropped`/`superseded`  | The post is no longer publishable from here; reload the editor          |

A pre-publish save or dispatch that rejects is read by `describeRejectedAction()`: a refusal Core sent (a 4xx) shows Core's reason, and a 5xx, a response with no reason or the transport's summary of the request shows the fallback, "An unexpected error occurred, please try again." unless the caller names its own. A rejection carrying a `CompletionFailureError` keeps its structured copy, host-limit link included. The update flow renders its failures the same way.

While the publish request itself is in flight, Close and Escape do nothing: closing then would abandon the outcome unseen, a publish that lands never navigating and one that fails never saying so. The request settles on its own, and closing works again once it has.

A schedule is checked against the clock twice, since the chosen time can pass while the flow sits open or while `onBeforePublish` waits on a sign-in: at the click, before anything is saved, and again before the command is dispatched. A scheduled time that has fallen below `minScheduledAt` is refused in place and the user goes back to choose another. The second refusal can leave the draft saved by `onBeforePublish`, but never publishes or schedules it. Scheduling stays on: switching it off would turn the confirmed schedule into an immediate publish.

No completion closes the modal or navigates. Successful completion writes the celebration handoff (`ghost-last-published-post` or `ghost-last-scheduled-post`), and calls `onCompleted` so the caller can navigate; where the user lands is the caller's decision, not this component's. The editor sets `showCompletion={false}` to keep the current step pending until navigation unmounts it, avoiding a flash of the fallback completion screen while the destination loads. Other callers show the completion screen by default.

## Sending

A publish that emails immediately is not done when the save acknowledges: the email is submitted asynchronously, which takes minutes on a large site. The flow does not wait for it. `useMinimumDuration` keeps the confirm button in its running state for at least `MIN_EMAIL_HANDOFF_LENGTH` (1.5 seconds) from the click, so the hand-off to analytics is not instant: once the save is acknowledged the flow holds for whatever remains, and a slower save hands off as soon as it lands. A torn-down flow releases the hold and completes nothing. The caller is told the post has an email, so it can route to post analytics, which reports the send's progress and any failure. Closing the flow marks every pending pre-save, save and retry continuation as abandoned, so none can complete the post journey after the caller closes it.

## Retrying a failed email

The email-error step offers the retry only when Core says the failed send is retryable, labelled "Send remaining emails" when the stored error says it was partially sent and "Retry sending email" otherwise. When that eligibility cannot be read, or the flow does not know the email's id, the step says it could not check and offers "Check retry availability", which reads it again (reloading the post first when the id is unknown). A retry Core refuses shows Core's reason, with a host limit's upgrade phrase linked. A retry Core accepts is handed off the same way as a publish: the retry button keeps its running state for at least `MIN_EMAIL_HANDOFF_LENGTH` from the click, then the flow completes with an email, so the caller routes to post analytics.

## Reporting

`reportPublishFailure()` reports to Sentry the unexpected failures the flow shows: a limit that could not be checked, a publish-input or retry-eligibility read that failed (the post reload behind "Check retry availability" included), a retry request that failed, a dispatch or pre-publish save that rejected, an Unpublish or Unschedule dispatch that rejected, and a publish with no command to dispatch. A pre-publish save that settled as failed is left to the session, which reports failed saves itself. It leaves out what `reportSaveFailure()` leaves out of saves, by the same `isExpectedSaveError()` rule: a validation refusal, a host limit, a writer who lost access, an expired session and a lost connection. A missing post, a collision, any other 4xx and a 5xx are reported.

## Requests

Every request the flow makes passes the editor's shared request options, which opt out of the transport's session-expiry redirect: the two it issues directly (the post reload behind "Check retry availability" and the published-post count), the settings, config, newsletter, tier, label and recipient-count reads behind its hooks, the member and email counts the limit ports read through the limiter, and the email retry, which carries the same flag on its mutation payload. An expired session is left to surface where the user is — as an uncounted audience or an error on the email-error step.

Where the writer cannot go on without the request, an expired session (a 401, or the 403 "Authorization failed" Core answers for a session it no longer accepts) asks them to sign in through `requestReauth` instead of repeating a request that can only fail again: a limit check, the retry-eligibility read and the email retry each run again once they are back. Each runs again once per sign-in: a session gone again straight after the writer signed in fails rather than asking again, so the writer is never asked in a loop. Abandoning the sign-in, or that second failure, says the session expired, and the step's own "Try again", "Check retry availability" or retry asks once more. An eligibility read asks once per failure: background reads that fail the same way do not ask again until a read succeeds or the writer checks again. The editor does the same for the publish inputs: a read that finds the session gone opens the sign-in dialog once and reads again, a later background read that fails the same way leaves the error and its Retry, and Retry asks again; Publish opens once the inputs have loaded. The sign-in dialog sits over the publish flow, so a limit check that finds the session gone with the flow open resumes once the writer signs in there.

Flow-owned queries also disable the global error handler. `usePublishInputs()` returns its query or validation error plus a retry callback instead of leaving callers with an unexplained permanent loading state.

## Counting the audience

Recipient counts come from the framework's members-count hook, and the flow reads them wherever it states an audience: the options step, the confirm and complete steps, each recipient segment, and the update flow's description of a scheduled send.

An audience that could not be counted is not an audience of none: the hook resolves a failed request to `null`, never to `0`. Where the flow states a count in a sentence it drops to descriptive copy ("all members"); the segment checkboxes, which have nothing to say without a number, render no count at all. A 401 on the tier or label queries is quieter still — those segments simply do not appear in the recipient picker, leaving the free/paid split, and that is not surfaced to the user.

## Update flow

`UpdateFlowModal` is the counterpart for a post that is already published, scheduled or sent. It describes what happened and offers the one action available at that point: reverting to a draft, dispatched as `toRevertDispatch()`. An email-only post that is not scheduled offers nothing, since its email cannot be taken back, and its flow is headed "Sent".

It reads the newsletter from the post rather than from the options machine, because the machine only ever exposes a selectable newsletter: a post sent to a since-archived one would be described against the site's default instead.

Its email copy also follows the persisted post rather than the draft-only machine. A scheduled post will email when it has a newsletter and no email record yet; a published or sent post counts as emailed only when it is a post with a non-failed email. A scheduled post with an existing email describes that record separately as a previous send.

That reading depends on what the caller supplies. `newsletterName` and `newsletterStatus` need a post read that includes the newsletter relation, and the earlier-send sentence needs `emailCreatedAt`; the editor's read carries both. A caller whose read omits them gets copy that degrades rather than lying — the newsletter goes unnamed, and the sentence drops its date.
