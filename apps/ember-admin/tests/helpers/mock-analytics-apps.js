// The analytics/posts admin-x apps (stats, posts) were migrated into the React
// Ghost Admin app, so Ember no longer loads them as standalone AdminXApps and
// there is nothing to mock. Kept as no-ops so existing callers stay valid.
export function mockAnalyticsApps() {}

export function cleanupMockAnalyticsApps() {}
