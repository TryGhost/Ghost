import { fakeAdminEndpoint } from './worker';
import { fakePosts } from './resources';
import { fakeAdminStats } from './stats';
import { fakeTinybirdPipe } from './tinybird';

const pagination = { page: 1, limit: 1, pages: 1, total: 0, next: null, prev: null };

/**
 * Where the site's history starts, for All time: the first published page and
 * first member lookups Analytics makes when it opens, and the first-visit
 * pipe. Empty by default; the first published post comes from fakePosts.
 */
export function fakeSiteHistoryStart({
  firstPage,
  firstMember,
  firstVisit = null,
}: { firstPage?: string; firstMember?: string; firstVisit?: string | null } = {}): void {
  fakeAdminEndpoint(
    'GET',
    /^\/pages\/\?limit=1&filter=status%3Apublished&order=published_at\+asc/,
    {
      pages: firstPage ? [{ id: 'first-page', published_at: firstPage }] : [],
      meta: { pagination },
    },
  );
  fakeAdminEndpoint('GET', /^\/members\/\?limit=1&order=created_at\+asc/, {
    members: firstMember ? [{ id: 'first-member', created_at: firstMember }] : [],
    meta: { pagination },
  });
  fakeTinybirdPipe('api_first_visit', [{ first_visit: firstVisit }]);
}

/**
 * A server that answers a single day's history by the hour. Without this,
 * member_count fakes answer by day, like servers from before hourly history,
 * and Analytics leaves single days out of its member, revenue and
 * subscriber views.
 */
export function fakeHourlyHistory(): void {
  const totals = { paid: 0, free: 0, comped: 0, gift: 0 };
  fakeAdminEndpoint('GET', /^\/stats\/member_count\/\?.*interval=hour/, {
    stats: [],
    meta: { totals, interval: 'hour', start: totals },
  });
}

/** Empty request graph for mounting the Analytics overview. */
export function fakeAnalyticsOverview(): void {
  fakeAdminStats.memberCount();
  fakeAdminStats.mrr();
  fakeAdminStats.subscriptions();
  fakeAdminStats.topPostViews();
  fakePosts([]);
  fakeSiteHistoryStart();
}
