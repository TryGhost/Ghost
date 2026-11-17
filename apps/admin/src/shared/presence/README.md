# Presence

Client side of the editor presence endpoint: who has a post or page open right
now. The editor records the current user on the open document; posts and pages
lists ask about the rows on screen. The server returns other users only, with
ids and a server timestamp; names and avatars come from the staff users list.

## Behaviour

- Polls only while the tab is visible: every 10 seconds after input, every 30
  seconds without, and stops after 30 minutes without input until the next
  input. One request is in flight at a time.
- The editor sends `editing` with every poll; lists send up to 50 visible
  `resources` and never `editing`. Hiding the tab, leaving the route or going
  idle sends `/presence/leave/` for the edited document with `keepalive`.
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
  other staff on the open document as avatars with an overflow count, named
  from the staff users list, which is read only once someone is present. That
  list is one page of the most recently seen staff, so anyone present beyond it
  is read by id in a second request. Users neither request returns are not
  shown. Hovering or focusing the cluster names
  everyone in one sentence, "Alex and Sam have this post open". Below the `sm`
  breakpoint one avatar with a count badge stands for everyone.

## Modules

- `activity-poller.ts` owns cadence, visibility and backoff.
- `use-presence.ts` runs the poller for a set of resources and exposes `active`.
- `use-visible-resources.ts` collects `[data-presence-id]` rows on screen.
- `use-presence-by-resource.ts` groups `active` by resource id for list rows.
- `presence-api.ts` validates responses; requests live in the framework's
  `api/presence` module.
- `present-users.ts` turns active entries into named users, ordered by name
  so the order does not move as heartbeats land.
- `presence-avatars.tsx` renders them.
