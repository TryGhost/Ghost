# Presence

Client side of the editor presence endpoint: who has a post or page open right
now. The editor records the current user on the open document; posts and pages
lists ask about the rows on screen. The server returns other users only, with
ids and a server timestamp; names and avatars come from the staff users list.

## Behaviour

- Polls only while the tab is visible, unless the editor asks for the lease
  below: every 10 seconds after input, every 30
  seconds without, and stops after 30 minutes without input until the next
  input. One request is in flight at a time.
- The editor sends `editing` with every poll; lists send up to 50 visible
  `resources` and never `editing`. Hiding the tab, leaving the route, going
  idle, or closing or reloading the page sends `/presence/leave/` for the
  edited document with `keepalive`.
- The editor names its tab with a random id per page load, sent with `editing`
  and with leave, so two tabs of one user on the same document do not clear
  each other.
- Entries expire locally 60 seconds after their server timestamp, matching the
  server's active window. Rows outside the current poll keep their entries until
  then so scrolling does not blink.
- Gated by the `editorPresencePolling` Labs flag. A 404, or a 403 that is not
  an expired session, means the endpoint is not there: polling pauses and asks
  again every five minutes while the tab is in use. An older backend therefore
  costs one request per mount and one per five minutes, and a flag that reaches
  a server process late is picked up without a reload.
- Other failures, an expired session included, back off exponentially up to 60
  seconds and clear what is shown. Polling resumes by itself once the editor's
  re-authentication dialog succeeds.
- Indicators are a second flag, `editorPresence`. The editor header shows the
  other staff on the open document, and posts and pages list rows show who has
  that row open, as avatars with an overflow count named from the staff users
  list, which is read only once someone is present. That list is one page of
  the most recently seen staff, so anyone present beyond it is read by id in a
  second request. Users neither request returns are not shown. Hovering or
  focusing the cluster names everyone in one sentence, "Alex and Sam have this
  post open", the same in the editor and the lists. Below the `sm` breakpoint
  one avatar with a count badge stands for everyone.

In the editor, the lease holder leads the row, including the current user once
this tab holds the lease. Avatars always overlap with the holder in front,
including groups of two. The current user appears as a viewer whenever another person is present,
unless their editing avatar already represents them, and is named "You" in its
label and the row's tooltip. A lone viewer has no avatar.
Viewers are dimmed while the document
is held, with a separate opaque white backing behind each avatar so overlapping
photos cannot blend. List rows keep their existing overlap and full opacity.

## The lease

With `lease`, `usePresence` also follows the lease on the document the editor
has open and reports it: `pending` until the server answers, `free` while
nobody holds the document, the holder and whether it is this tab, or `null`
when there is no lease to obey.

- A poll only watches, which holds nothing, until the caller says it
  `wantsLease`. From then, and for as long as the tab holds the lease, every
  poll asks to hold. The first of those is sent at once, not with the poll
  that was due. A tab that neither holds the lease nor wants it goes back to
  watching, which gives up the lease if it had it.
- `takeOver()` makes the next poll, sent at once, ask to take the lease.
- The tab keeps polling at the 30-second cadence while it is hidden and does
  not send a leave, so switching tabs does not give the document away. The
  30-minute idle stop still applies and still sends the leave, and so does
  closing or reloading the page, on `pagehide`. A tab that dies without that
  event, a crash or a browser killed in the background, keeps the lease until
  the lease window passes without a poll from it, or until another tab takes
  over.
- An answer is kept through failing polls for a minute, then dropped. A first
  answer that has not come within five seconds is treated the same way. In
  both cases the lease reads `null` and the editor is open for editing: a
  broken presence endpoint never holds a document shut.
- A server that answers 422 to the lease field does not know it. The poll is
  sent again without it, and the lease reads `null` until the editor is opened
  again, through idleness too.
- When polling stops for idleness the lease has been given up, so the lease
  reads `pending` until the next answer.
- The server tells a tab it lost the lease only at that tab's next poll. Tabs
  of one browser on the same site also tell each other, over a
  `BroadcastChannel`. A tab that has taken the lease over says `taken`; every
  tab on that document then polls at once; and the tab that held the lease
  answers `heard` once its own poll says it no longer does, which the taker's
  lease then carries as `heard: true`. Nothing depends on it: in a browser
  without the channel, or between browsers, the tabs learn from their polls.

What the editor does with the lease is described in the
[editor README](../../editor/README.md#the-lease).

## Modules

- `activity-poller.ts` owns cadence, visibility and backoff.
- `lease-channel.ts` carries a takeover between the tabs of one browser.
- `use-presence.ts` runs the poller for a set of resources and exposes `active`.
- `use-visible-resources.ts` collects `[data-presence-id]` rows on screen.
- `use-presence-by-resource.ts` groups `active` by resource id for list rows.
- `presence-api.ts` validates responses; requests live in the framework's
  `api/presence` module.
- `present-users.ts` turns active entries into named users, ordered by name
  so the order does not move as heartbeats land.
- `use-present-users.ts` reads the staff those entries name.
- `presence-avatars.tsx` renders them.
