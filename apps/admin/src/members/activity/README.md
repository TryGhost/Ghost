# Member activity

The React Activity screen serves `/members-activity` when the private
`membersActivityReact` flag is enabled. The existing Ember screen remains the
fallback. See [feature flags](../../../../../docs/practices/feature-flags.md) for
enabling a private flag or using a browser-session override.

The URL preserves the existing `member` and comma-separated `excludedEvents`
parameters. Global activity links to a member's activity; the member header
links to their profile. Event filters retain the payment/donation/gift grouping
and the restrictions controlled by newsletter, comment, and click-tracking
settings. Delivery/open/spam/bounce events are available only in the
member-specific view. Welcome email events remain available in the global view.

Event descriptions share the five-event member detail feed's parser. A full-page
presentation wrapper restores monetary details and cleans tracked click URLs
without changing the member detail feed.
Email previews prefer the event's stored HTML and subject. They request a
post-based preview only when stored content is unavailable and a post identity
is present. Preview documents are sandboxed and their links are inert.

## Pagination

The full feed uses `useBrowseMemberActivityFeed` from `admin-x-framework`.
It works with the existing events endpoint and requires no new server capability.
Requests are bounded to 50 events. Before requesting older timestamps, the
loader finishes any events at the previous page's final timestamp by querying
each event type with its own ID cursor. This avoids losing events at a page
boundary, including newsletter events that share a recipient ID across types.

The timeline is newest first. Additional events at a full-page timestamp are
appended in per-type ID order; incidental ordering within that same timestamp
can differ from the Ember feed. A failed request leaves the previous cursor
intact so Retry resumes without dropping events. Changing filters starts a
separate query and cancels further work for the previous filter.

## Validation

The colocated acceptance tests cover the React page against a fake API. The
framework pagination tests cover large timestamp collisions, mixed event types,
older response shapes, cancellation, and retries. Browser E2E tests in
`e2e/tests/admin/members/activity-navigation.test.ts` exercise both flag states;
`activity-pagination.test.ts` checks a timestamp collision against a real API.

Default enablement and deletion of the Ember implementation are separate rollout
steps after validation.
