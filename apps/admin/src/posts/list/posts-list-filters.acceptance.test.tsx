import { beforeEach, describe, expect, it } from "vitest";

import {
    currentRoute,
    currentUserResponse,
    fakePosts,
    fakeTags,
    fakeAdminEndpoint,
    fakeUsers,
    post,
    renderAdminApp,
    staffRole,
    staffUser,
    tag
} from "@test-utils/acceptance";
import { postsListScreen } from "./posts-list.screen";

const FLAG_ON = { labs: { postsListReact: true } };

function asRole(name: Parameters<typeof staffRole>[0] extends { name: infer N } ? N : never) {
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name })];
    return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

/**
 * The filter bar. What matters most is that chips and the URL stay in lockstep:
 * the five params are what sidebar saved views persist, and the Ember screen
 * reads the same ones while both implementations exist.
 */
describe("Posts list filters", () => {
    // The author and tag fields hydrate their selected values as soon as the
    // bar mounts, so both endpoints are probed on every render here.
    beforeEach(() => {
        fakeTags([]);
        fakeUsers([]);
    });

    it("hydrates a chip from the URL", async () => {
        fakePosts([post({ title: "A draft", status: "draft" })]);
        await renderAdminApp("/posts?type=draft", FLAG_ON);

        await expect.element(postsListScreen.filterBar()).toBeVisible();
        await expect.element(postsListScreen.filterBar()).toHaveTextContent("Draft posts");
    });

    // The slug-to-name lookup is its own request, and `fakeTags` only declares
    // semantics for `visibility` filters — so declare this one explicitly
    // rather than teaching a fake to run NQL.
    it("resolves a tag slug in the URL to its name", async () => {
        fakePosts([post({ title: "Tagged", status: "published" })]);
        fakeAdminEndpoint("GET", /^\/tags\/\?.*slug/, {
            tags: [tag({ name: "Engineering", slug: "engineering" })]
        });
        await renderAdminApp("/posts?tag=engineering", FLAG_ON);

        // The URL carries a slug; the chip has to read as the tag's name.
        await expect.element(postsListScreen.filterBar()).toHaveTextContent("Engineering");
    });

    it("resolves an author slug in the URL to their name", async () => {
        fakePosts([post({ title: "Authored", status: "published" })]);
        fakeUsers([staffUser({ name: "Ada Lovelace", slug: "ada" })]);
        await renderAdminApp("/posts?author=ada", FLAG_ON);

        await expect.element(postsListScreen.filterBar()).toHaveTextContent("Ada Lovelace");
    });

    // A saved view can point at a tag that was later renamed or deleted.
    // Dropping it would silently rewrite the user's URL.
    it("keeps an unresolvable slug rather than dropping the filter", async () => {
        fakePosts([]);
        fakeAdminEndpoint("GET", /^\/tags\/\?.*slug/, { tags: [] });
        await renderAdminApp("/posts?tag=deleted-tag", FLAG_ON);

        await expect.element(postsListScreen.filterBar()).toBeVisible();
        await expect.poll(currentRoute).toBe("/posts?tag=deleted-tag");
    });

    // Each field maps to one URL param, which holds one value. Shade defaults
    // to allowing several chips per field, and the serializer keeps the last —
    // so without allowMultiple={false} a user could sit looking at two "Post
    // type" chips while only one of them was in the URL or a saved view.
    it("does not offer a field that already has a chip", async () => {
        fakePosts([]);
        await renderAdminApp("/posts?type=draft", FLAG_ON);

        await postsListScreen.addFilterButton().click();

        await expect.element(postsListScreen.filterFieldOption("Tag")).toBeVisible();
        await expect(postsListScreen.filterFieldOption("Post type")).toHaveCount(0);
    });

    describe("the sort control", () => {
        it("shows the default when no order is set", async () => {
            fakePosts([post({ title: "One", status: "published" })]);
            await renderAdminApp("/posts", FLAG_ON);

            await expect.element(postsListScreen.sortButton()).toHaveTextContent("Newest first");
        });

        it("names the order from the URL", async () => {
            fakePosts([post({ title: "One", status: "published" })]);
            await renderAdminApp("/posts?order=updated_at+desc", FLAG_ON);

            await expect.element(postsListScreen.sortButton()).toHaveTextContent("Recently updated");
        });

        it("writes the chosen order to the URL", async () => {
            fakePosts([post({ title: "One", status: "published" })]);
            await renderAdminApp("/posts", FLAG_ON);

            await postsListScreen.sortButton().click();
            await postsListScreen.sortOption("Oldest first").click();

            await expect.poll(currentRoute).toBe("/posts?order=published_at+asc");
        });

        // "Newest first" is the absence of the param, not a value.
        it("drops the param when returning to the default", async () => {
            fakePosts([post({ title: "One", status: "published" })]);
            await renderAdminApp("/posts?order=published_at+asc", FLAG_ON);

            await postsListScreen.sortButton().click();
            await postsListScreen.sortOption("Newest first").click();

            await expect.poll(currentRoute).toBe("/posts");
        });

        it("leaves the filters alone when the sort changes", async () => {
            fakePosts([post({ title: "One", status: "draft" })]);
            await renderAdminApp("/posts?type=draft", FLAG_ON);

            await postsListScreen.sortButton().click();
            await postsListScreen.sortOption("Oldest first").click();

            await expect.poll(currentRoute).toBe("/posts?type=draft&order=published_at+asc");
        });
    });

    // Ember hides these for roles that can only see their own posts.
    describe("role restrictions", () => {
        it("offers only the type filter to a contributor", async () => {
            fakePosts([]);
            await renderAdminApp("/posts", asRole("Contributor"));

            await postsListScreen.addFilterButton().click();

            await expect.element(postsListScreen.filterFieldOption("Post type")).toBeVisible();
            await expect(postsListScreen.filterFieldOption("Author")).toHaveCount(0);
            await expect(postsListScreen.filterFieldOption("Access")).toHaveCount(0);
            await expect(postsListScreen.filterFieldOption("Tag")).toHaveCount(0);
        });

        it("hides the author filter from an author", async () => {
            fakePosts([]);
            await renderAdminApp("/posts", asRole("Author"));

            await postsListScreen.addFilterButton().click();

            await expect.element(postsListScreen.filterFieldOption("Tag")).toBeVisible();
            await expect(postsListScreen.filterFieldOption("Author")).toHaveCount(0);
        });

        it("offers all four to an administrator", async () => {
            fakePosts([]);
            await renderAdminApp("/posts", asRole("Administrator"));

            await postsListScreen.addFilterButton().click();

            await expect.element(postsListScreen.filterFieldOption("Post type")).toBeVisible();
            await expect.element(postsListScreen.filterFieldOption("Access")).toBeVisible();
            await expect.element(postsListScreen.filterFieldOption("Author")).toBeVisible();
            await expect.element(postsListScreen.filterFieldOption("Tag")).toBeVisible();
        });
    });
});
