import { fakePosts } from "./resources";
import { fakeAdminStats } from "./stats";

/** Empty request graph for mounting the Analytics overview. */
export function fakeAnalyticsOverview(): void {
    fakeAdminStats.memberCount();
    fakeAdminStats.mrr();
    fakeAdminStats.subscriptions();
    fakeAdminStats.topPostViews();
    fakePosts([]);
}
