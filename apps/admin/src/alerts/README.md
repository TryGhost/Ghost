# Alerts

Full-width bars at the top of Admin for messages that must stay visible until
someone closes them. Today they come from server notices, from failed API
requests, and from the Ember host in `ember-bridge`; the store is only reachable
from `App`. Short-lived
feedback belongs in a toast (`toast` from `sonner`) instead.

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
  them and shows custom notices, one per location: the one the server lists
  last. Each shows once per page load. Closing a notice deletes it, which
  marks it seen for that user; programmatic removal does not.
- `useUpgradeStatusAlerts()` shows an error alert when a Ghost API request fails
  because Ghost was upgraded since the page loaded, or is still under
  maintenance after the request's retries. Each shows at most once per page
  load. The alerts use Ember's keys, so an alert from either side replaces the
  other's instead of stacking.

## Message text

Alert messages are `RichText`: a plain string is escaped, and `{html}` renders
as markup. Use `{html}` only for trusted, app- or server-authored content.
