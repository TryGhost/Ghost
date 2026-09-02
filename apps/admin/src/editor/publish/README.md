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

Only newsletters with `status: 'active'` are selectable; they are ordered by `sortOrder`, and the first is selected by default. `onlyDefaultNewsletter` reports whether there is exactly one, which is what decides whether the flow offers a newsletter picker at all.

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

`setRecipientFilter(null)` is a real choice — "no recipients" — and is distinct from never having chosen.

`fullRecipientFilter` is what the email service receives: the newsletter's own audience filter (subscribed to that newsletter, email not disabled, plus paid-only for a paid newsletter), AND-ed with the recipient filter when there is one. It is `null` while no newsletter is selected.

## Whether the post emails

`willEmail` requires a selected newsletter and email that is not disabled — without those there is nothing to send and nothing to send it with. Given both, it is true when either holds:

- the type is not `publish`, a recipient filter is set, the post is still a draft, and it has no email record; or
- the post is a draft whose email record failed. A failed send is retried regardless of the selected type or filter.

`willEmailImmediately` is `willEmail` on an unscheduled post — the flow's confirmation copy and any post-save email polling hang off it.

## Scheduling

Times are ISO 8601 strings with milliseconds zeroed, because the API stores seconds and a non-zero millisecond value can fail validation when a scheduled post is updated.

- `minScheduledAt` is five seconds ahead of now and is recomputed on every read; it is the floor the picker enforces.
- `scheduledAt` starts at that floor.
- `setIsScheduled(true)` snaps a time that is earlier than ten minutes ahead of now forward to exactly that default; calling it with no argument toggles.
- `setScheduledAt()` zeroes milliseconds and clamps anything before the floor up to it. An unparseable date is ignored.
- `resetPastScheduledAt()` turns scheduling off when the chosen time has fallen into the past. It leaves the stale time in place: re-enabling scheduling snaps it forward to the default, so the stale value is never offered.

## Producing a save command

`toDispatch()` returns the status command for the current options, shaped exactly as the save engine accepts it:

| Options     | Command                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| Unscheduled | `{kind: 'publish', options}` — no publish time, so the post keeps the one it has                       |
| Scheduled   | `{kind: 'schedule', options}` with `publishedAt` set to the scheduled time                             |
| Not a draft | `null` — publishing and scheduling are draft-only transitions, and `canPublish` reports the same thing |

Email extras ride on the command only when `willEmail` is true: `emailOnly` (true only for `send`), the selected newsletter's slug, and the recipient filter as `emailSegment`. An empty filter sends the newsletter with no segment. `toRevertDispatch()` returns `{kind: 'revert'}` for any status; the engine derives the rest of that transition (clearing the publish time only when unscheduling, and always clearing `emailOnly`).

The machine never mutates a post, so it needs no snapshot-and-rollback around a failed save: the save engine builds each request from its own snapshot and adopts the acknowledged status only once the server confirms it. A failed publish leaves both the post and these options exactly as they were, ready to dispatch again.

## Limits

`checkLimits()` runs the two host checks concurrently and returns — and stores — a typed result. It clears any result from a previous run first.

The sending check awaits `refreshSettings()` before anything else, so a hold applied since the editor opened is seen; a failed refresh rejects `checkLimits()`. It then evaluates the email limit, skipping it for authors and contributors, who cannot read email counts. A rejection becomes a `sending-limit` block carrying the host's message. Only if the limit passes is the verification hold read, so a site under its email limit still surfaces a hold; a hold without host-specific copy uses the default message.

The publishing check runs for admins only, since nobody else can read the member count. A rejection becomes a `host-limit` block with the host's message split into `parts`, where the segment marked `upgrade` is the phrase to render as an upgrade link. The message is returned as data, never as markup.

Both blocks feed the state directly. An email block disables the email publish types and re-applies the initial-type rules, so the selection falls back to `publish`; that demotion also applies to a type the user picked before the block landed, since a block that arrives late must not leave an unsendable type selected.

## Dirty state and reset

`isDirty` compares the publish type, scheduling, newsletter and recipient filter against the values the machine started with; selecting the value that was already there is not a change. The scheduled time counts only while scheduling is on or the user has actually chosen a time, so turning scheduling on and back off leaves the state clean.

`reset()` restores every option and re-arms the automatic type fallback that `setPublishType()` disables. It takes a fresh scheduled time from the current clock, since the floor the machine was created with may itself have passed.
