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
- Gated by the `editorPresencePolling` Labs flag. A 401, 403 or 404 stops
  polling for the session, so an older backend without the endpoint costs one
  request. Other failures back off exponentially up to 60 seconds and clear
  what is shown.
- Indicators are a second flag, `editorPresence`. The editor header shows the
  other staff on the open document, and posts and pages list rows show who has
  that row open, as avatars with an overflow count named from the staff users
  list, which is read only once someone is present. Users missing from that
  list are not shown. Hovering or focusing the cluster names everyone in one
  sentence, "Alex and Sam have this post open", the same in the editor and the
  lists. Below the `sm` breakpoint one avatar with a count badge stands for
  everyone.

## Modules

- `activity-poller.ts` owns cadence, visibility and backoff.
- `use-presence.ts` runs the poller for a set of resources and exposes `active`.
- `use-visible-resources.ts` collects `[data-presence-id]` rows on screen.
- `use-presence-by-resource.ts` groups `active` by resource id for list rows.
- `presence-api.ts` validates responses; requests live in the framework's
  `api/presence` module.
- `present-users.ts` turns active entries into named, ordered users.
- `presence-avatars.tsx` renders them.
