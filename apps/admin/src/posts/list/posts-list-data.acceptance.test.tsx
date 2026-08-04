import { beforeEach, describe, expect, it } from "vitest";

import { currentUserResponse, fakeAdminEndpoint, fakePages, fakePosts, fakeTags, fakeUsers, post, renderAdminApp, staffRole } from "@test-utils/acceptance";
import { postsListScreen } from "./posts-list.screen";
import type { StaffRoleName } from "@tryghost/test-data";

const FLAG_ON = { labs: { postsListReact: true } };

function asRole(name: StaffRoleName, slug: string) {
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name })];
    me.users[0].slug = slug;
    return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

/**
 * The list is three queries, not one — scheduled, then drafts, then
 * published/sent — each with its own default sort, drained in order. This
 * covers the whole data path: URL params in, three correctly-filtered requests
 * out, rows rendered in bucket order.
 *
 * The fakes don't implement NQL (see THE RULE in test-utils), so each bucket is
 * served by declaring a response as a function of the outgoing filter.
 */

const SCHEDULED = post({ title: "Scheduled one", status: "scheduled" });
const DRAFT = post({ title: "Draft one", status: "draft" });
const PUBLISHED = post({ title: "Published one", status: "published" });

function byBucket(filter: string | undefined) {
    if (filter?.includes("status:scheduled")) {
        return [SCHEDULED];
    }
    if (filter?.includes("status:draft")) {
        return [DRAFT];
    }
    return [PUBLISHED];
}

describe("Posts list data", () => {
    // The filter bar mounts with the screen and probes these to resolve any
    // author/tag slug in the URL into a name.
    beforeEach(() => {
        fakeTags([]);
        fakeUsers([]);
        fakeAdminEndpoint("GET", /^\/tags\/\?.*slug/, { tags: [] });
        fakeAdminEndpoint("GET", /^\/users\/\?.*slug/, { users: [] });
    });

    it("runs one query per status bucket", async () => {
        const postsApi = fakePosts(query => byBucket(query.filter));
        await renderAdminApp("/posts", FLAG_ON);

        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        const filters = postsApi.requests.map(request => request.filter);
        expect(filters).toContain("status:scheduled");
        expect(filters).toContain("status:draft");
        expect(filters).toContain("status:[published,sent]");
    });

    it("renders buckets in order: scheduled, then drafts, then published", async () => {
        fakePosts(query => byBucket(query.filter));
        await renderAdminApp("/posts", FLAG_ON);

        await expect.element(postsListScreen.listItems().nth(2)).toBeVisible();
        await expect(postsListScreen.listItems()).toHaveCount(3);

        await expect.element(postsListScreen.listItems().nth(0)).toHaveTextContent("Scheduled one");
        await expect.element(postsListScreen.listItems().nth(1)).toHaveTextContent("Draft one");
        await expect.element(postsListScreen.listItems().nth(2)).toHaveTextContent("Published one");
    });

    it("sorts drafts by recently updated and the rest by publish date", async () => {
        const postsApi = fakePosts(query => byBucket(query.filter));
        await renderAdminApp("/posts", FLAG_ON);

        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        const orderFor = (status: string) => postsApi.requests
            .find(request => request.filter?.includes(status))
            ?.order;

        // Drafts have no published_at, so they sort by when they were touched.
        expect(orderFor("status:draft")).toBe("updated_at desc");
        expect(orderFor("status:scheduled")).toBe("published_at desc");
        expect(orderFor("status:[published,sent]")).toBe("published_at desc");
    });

    it("runs a single query when the type filter picks one status", async () => {
        const postsApi = fakePosts(query => byBucket(query.filter));
        await renderAdminApp("/posts?type=draft", FLAG_ON);

        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        expect(postsApi.requests.map(request => request.filter)).toEqual(["status:draft"]);
    });

    it("carries the other filter params into every bucket", async () => {
        const postsApi = fakePosts(query => byBucket(query.filter));
        await renderAdminApp("/posts?tag=news&visibility=public", FLAG_ON);

        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        postsApi.requests.forEach((request) => {
            expect(request.filter).toContain("tag:news");
            expect(request.filter).toContain("visibility:public");
        });
    });

    // `featured` is not a status — it means every status, and featured.
    it("treats type=featured as every bucket plus featured:true", async () => {
        const postsApi = fakePosts(query => byBucket(query.filter));
        await renderAdminApp("/posts?type=featured", FLAG_ON);

        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        expect(postsApi.requests).toHaveLength(3);
        postsApi.requests.forEach((request) => {
            expect(request.filter).toContain("featured:true");
        });
    });

    it("lets an explicit sort override every bucket", async () => {
        const postsApi = fakePosts(query => byBucket(query.filter));
        await renderAdminApp("/posts?order=published_at%20asc", FLAG_ON);

        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        postsApi.requests.forEach((request) => {
            expect(request.order).toBe("published_at asc");
        });
    });

    // A posts URL is a saved view's identity; rewriting it would corrupt the
    // view and desync from the Ember screen, which reads the same params.
    it("leaves the URL exactly as it was given", async () => {
        fakePosts(query => byBucket(query.filter));
        await renderAdminApp("/posts?type=draft&tag=news&order=updated_at+desc", FLAG_ON);

        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        expect(window.location.hash).toContain("type=draft");
        expect(window.location.hash).toContain("tag=news");
        expect(window.location.hash).toContain("order=updated_at");
    });

    // Ember forces authors and contributors onto their own posts regardless of
    // the author param. Without this they'd see everyone's.
    describe.each([
        { role: "Author" as const },
        { role: "Contributor" as const }
    ])("as $role", ({ role }) => {
        it("scopes every bucket to the signed-in user's own posts", async () => {
            const postsApi = fakePosts(query => byBucket(query.filter));
            await renderAdminApp("/posts", asRole(role, "just-me"));

            await expect.element(postsListScreen.listItems().first()).toBeVisible();

            postsApi.requests.forEach((request) => {
                expect(request.filter).toContain("authors:just-me");
            });
        });

        it("ignores an author param pointing at someone else", async () => {
            const postsApi = fakePosts(query => byBucket(query.filter));
            await renderAdminApp("/posts?author=someone-else", asRole(role, "just-me"));

            await expect.element(postsListScreen.listItems().first()).toBeVisible();

            postsApi.requests.forEach((request) => {
                expect(request.filter).toContain("authors:just-me");
                expect(request.filter).not.toContain("someone-else");
            });
        });
    });

    it("honours the author param for roles that see everything", async () => {
        const postsApi = fakePosts(query => byBucket(query.filter));
        await renderAdminApp("/posts?author=someone-else", asRole("Administrator", "admin-user"));

        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        postsApi.requests.forEach((request) => {
            expect(request.filter).toContain("authors:someone-else");
        });
    });

    it("queries the pages endpoint for the pages screen", async () => {
        const pagesApi = fakePages(query => byBucket(query.filter));
        const postsApi = fakePosts([]);
        await renderAdminApp("/pages", FLAG_ON);

        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        expect(pagesApi.requests.length).toBeGreaterThan(0);
        expect(postsApi.requests).toHaveLength(0);
    });
});
