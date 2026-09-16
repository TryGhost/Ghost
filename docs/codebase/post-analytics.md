# Post Analytics

Ghost provides post analytics for web traffic, member growth, newsletter opens,
and link clicks. Summary information appears in the posts list, with more detail
on each post's analytics page.

Web traffic comes from Ghost's Tinybird integration. Member and revenue
attribution comes from Ghost's event data. Newsletter analytics uses the local
email, recipient, redirect, and click-event tables.

## Click tracking

Click tracking counts the unique members who clicked a link in an email. It does
not combine a link across different posts and does not track clicks on the web
version of a post.

Clicks are stored in `members_click_events`. Each event refers to a row in
`redirects`, which contains the destination. Multiple events can be recorded
when one member clicks the same link more than once, but analytics count that
member once.

When an email is prepared, `LinkClickTrackingService` replaces a link with a
Ghost redirect. A request to `/r/{redirectId}?m={memberUuid}` records the event
and redirects the member to the destination.

The implementation lives in
[`services/link-tracking/`](../../ghost/core/core/server/services/link-tracking/).

Click tracking can be disabled in Admin or with the `email_track_clicks`
setting.

## Email analytics

Ghost uses Mailgun's Events API to collect newsletter delivery, open, and
failure data. Aggregates are stored on `emails`, with recipient-level data in
`email_recipients`.

“Sent” and “delivered” are different. Sent means Ghost processed the email
batch. Delivered means Ghost received a delivery event from Mailgun.

The email analytics job polls Mailgun regularly. It fetches recent events first,
then uses a delayed missing-events pass because Mailgun events do not always
arrive in order. Progress is stored so the job can continue from its previous
position.

Email analytics can be disabled with `emailAnalytics.enabled`. The service and
its scheduled jobs live in
[`services/email-analytics/`](../../ghost/core/core/server/services/email-analytics/).

The endpoints that combine web, member, and newsletter figures use
[`posts-stats-service.js`](../../ghost/core/core/server/services/stats/posts-stats-service.js).
