import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import {
    currentRoute,
    fakeAdminEndpoint,
    fakePosts,
    fakeTinybirdPipe,
    fakeTinybirdToken,
    post,
    renderAdminApp,
    webAnalyticsBootOverrides,
} from "@test-utils/acceptance";
import { postAnalyticsScreen } from "./post-analytics.screen";

const POST_ID = "64d623b64676110001e897d9";
const POST_UUID = "0d5cea22-f4d5-4b23-a0f7-1d9c46ae5f2a";
const NEWSLETTER_ID = "64d623b64676110001e897aa";

function daysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
}

function seededPost() {
    return post({
        id: POST_ID,
        uuid: POST_UUID,
        title: "Attack of the Clones",
        slug: "attack-of-the-clones",
        status: "published",
        visibility: "public",
        published_at: `${daysAgo(10)}T10:00:00.000Z`,
        url: "https://example.com/attack-of-the-clones/",
        email: { email_count: 1000, opened_count: 400, status: "submitted" },
        count: { clicks: 60, positive_feedback: 0, negative_feedback: 0 },
        newsletter: { id: NEWSLETTER_ID },
    });
}

/**
 * The world every post-analytics tab reads: the routed post, its growth
 * stats (referrers/growth/mrr feed both the overview and the growth tab),
 * and the Tinybird KPI + active-visitors pipes. Tab-specific endpoints are
 * declared per test.
 */
function seedPostAnalyticsWorld() {
    const postsApi = fakePosts([seededPost()]);
    fakeAdminEndpoint("GET", new RegExp(`^/stats/posts/${POST_ID}/top-referrers`), {
        stats: [{ source: "Google", referrer_url: "https://google.com", free_members: 80, paid_members: 20, mrr: 1000 }],
        meta: {},
    });
    fakeAdminEndpoint("GET", new RegExp(`^/stats/posts/${POST_ID}/growth`), {
        stats: [{ post_id: POST_ID, free_members: 100, paid_members: 25, mrr: 1250 }],
        meta: {},
    });
    fakeAdminEndpoint("GET", /^\/stats\/mrr\//, {
        stats: [{ date: daysAgo(1), mrr: 50000, currency: "usd" }],
        meta: { totals: [{ currency: "usd", mrr: 50000 }] },
    });
    fakeAdminEndpoint("GET", /^\/links\//, {
        links: [
            {
                post_id: POST_ID,
                link: { link_id: "link-1", from: "/r/abc", to: "https://example.com/subscribe", edited: false },
                count: { clicks: 10 },
            },
        ],
        meta: {},
    });
    fakeTinybirdToken();
    fakeTinybirdPipe("api_active_visitors", [{ active_visitors: 3 }]);
    const topSourcesApi = fakeTinybirdPipe("api_top_sources", [{ source: "google.com", visits: 170 }]);
    const topLocationsApi = fakeTinybirdPipe("api_top_locations", [{ location: "US", visits: 200 }]);
    return {
        postsApi,
        topSourcesApi,
        topLocationsApi,
        kpisApi: fakeTinybirdPipe("api_kpis", [
            { date: daysAgo(2), visits: 100, pageviews: 240, bounce_rate: 0.4, avg_session_sec: 30 },
            { date: daysAgo(1), visits: 150, pageviews: 320, bounce_rate: 0.5, avg_session_sec: 40 },
        ]),
    };
}

describe("Post analytics overview", () => {
    it("renders the seeded post with web and growth sections", async () => {
        const { postsApi } = seedPostAnalyticsWorld();
        await renderAdminApp(`/posts/analytics/${POST_ID}`, { boot: webAnalyticsBootOverrides() });

        await expect.element(postAnalyticsScreen.postTitle("Attack of the Clones")).toBeVisible();
        await expect(postsApi).toHaveSentFilter(`id:${POST_ID}`);

        // Web performance: visitors summed from the Tinybird rows.
        await expect.element(postAnalyticsScreen.webPerformanceCard()).toBeVisible();
        await expect.element(postAnalyticsScreen.uniqueVisitors()).toHaveTextContent("250");

        // Growth: totals from the post growth stats.
        await expect.element(postAnalyticsScreen.growthCard()).toHaveTextContent("Free members");
        await expect.element(postAnalyticsScreen.growthCard()).toHaveTextContent("100");
    });

    it("keeps the post context when switching to the web tab", async () => {
        const { kpisApi } = seedPostAnalyticsWorld();
        await renderAdminApp(`/posts/analytics/${POST_ID}`, { boot: webAnalyticsBootOverrides() });

        await expect.element(postAnalyticsScreen.postTitle("Attack of the Clones")).toBeVisible();
        await expect.element(postAnalyticsScreen.uniqueVisitors()).toHaveTextContent("250");
        const overviewKpiRequestCount = kpisApi.requests.length;

        await postAnalyticsScreen.webTrafficTab().click();

        await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}/web`);
        await expect.element(postAnalyticsScreen.locationsCard()).toBeVisible();
        // Same routed post: the header stays, and the KPI queries stay scoped to it.
        await expect.element(postAnalyticsScreen.postTitle("Attack of the Clones")).toBeVisible();
        await expect.poll(() => kpisApi.requests.length).toBeGreaterThan(overviewKpiRequestCount);
        await expect.poll(() => kpisApi.lastRequest?.params.get("post_uuid")).toBe(POST_UUID);
    });
});

describe("Post analytics web", () => {
    it("renders the seeded KPIs, locations and sources", async () => {
        const { topSourcesApi, topLocationsApi } = seedPostAnalyticsWorld();
        await renderAdminApp(`/posts/analytics/${POST_ID}/web`, { boot: webAnalyticsBootOverrides() });

        await expect.element(postAnalyticsScreen.postTitle("Attack of the Clones")).toBeVisible();
        await expect.element(page.getByRole("tab", { name: "Unique visitors" })).toHaveTextContent("250");
        await expect.element(postAnalyticsScreen.locationRow("US")).toHaveTextContent("United States");
        await expect.element(postAnalyticsScreen.sourceRow("google.com")).toHaveTextContent("170");
        await expect.poll(() => topLocationsApi.lastRequest?.params.get("post_uuid")).toBe(POST_UUID);
        await expect.poll(() => topSourcesApi.lastRequest?.params.get("post_uuid")).toBe(POST_UUID);
    });
});

describe("Post analytics growth", () => {
    it("renders the seeded member totals and top sources", async () => {
        seedPostAnalyticsWorld();
        await renderAdminApp(`/posts/analytics/${POST_ID}/growth`, { boot: webAnalyticsBootOverrides() });

        await expect.element(postAnalyticsScreen.membersCard()).toHaveTextContent("Free members");
        await expect.element(postAnalyticsScreen.membersCard()).toHaveTextContent("100");
        await expect.element(page.getByText("Top sources")).toBeVisible();
        await expect.element(page.getByText("Google")).toBeVisible();
    });
});

describe("Post analytics newsletter", () => {
    it("renders the seeded email performance", async () => {
        seedPostAnalyticsWorld();
        fakeAdminEndpoint("GET", new RegExp(`^/posts/${POST_ID}/`), { posts: [seededPost()] });
        fakeAdminEndpoint("GET", /^\/stats\/newsletter-basic-stats\//, {
            stats: [
                {
                    post_id: POST_ID,
                    post_title: "Attack of the Clones",
                    send_date: `${daysAgo(10)}T10:00:00.000Z`,
                    sent_to: 1000,
                    total_opens: 400,
                    open_rate: 0.4,
                    total_clicks: 0,
                    click_rate: 0,
                },
            ],
            meta: {},
        });
        fakeAdminEndpoint("GET", /^\/stats\/newsletter-click-stats\//, {
            stats: [
                {
                    post_id: POST_ID,
                    post_title: "Attack of the Clones",
                    send_date: `${daysAgo(10)}T10:00:00.000Z`,
                    sent_to: 1000,
                    total_opens: 400,
                    open_rate: 0.4,
                    total_clicks: 60,
                    click_rate: 0.06,
                },
            ],
            meta: {},
        });
        await renderAdminApp(`/posts/analytics/${POST_ID}/newsletter`, { boot: webAnalyticsBootOverrides() });

        await expect.element(postAnalyticsScreen.postTitle("Attack of the Clones")).toBeVisible();
        // The funnel KPI labels also appear inside the radial chart's svg; take the KPI card's.
        await expect.element(page.getByText("Sent", { exact: true }).first()).toBeVisible();
        await expect.element(page.getByText("1,000").first()).toBeVisible();
        await expect.element(page.getByText("400").first()).toBeVisible();
    });
});
