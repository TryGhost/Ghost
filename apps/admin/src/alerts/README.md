# Alerts

Full-width bars at the top of Admin for messages that must stay visible until
someone closes them: failed saves, billing problems, and notices sent by the
server. Short-lived feedback belongs in a toast (`toast` from `sonner`)
instead.

## Pieces

- `createAlertsStore()` holds the visible alerts. The app creates one store per
  mount and passes it to everything that reads or writes alerts.
  - `show()` adds an alert and returns its id.
  - `close(id)` is the user closing an alert; it removes the alert and runs its
    `onClose`.
  - `remove(predicate)` clears alerts programmatically and never runs
    `onClose`.
- `AdminAlerts` renders the store into the `#admin-alerts` element, the first
  row of the page grid (see `index.html` and `index.css`), so alerts push the
  whole shell down. It renders nothing when that element is missing.
- `useServerNotifications()` loads `/notifications/` for staff who can read
  them and shows each custom notice once per page load, keeping the last one
  per location. Closing a notice deletes it, which marks it seen for that
  user; programmatic removal does not.

## Message text

Alert messages are `RichText`: a plain string is escaped, and `{html}` renders
as markup. Use `{html}` only for trusted, app- or server-authored content.
