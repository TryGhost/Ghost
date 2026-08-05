import { beforeEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { fakeAdminEndpoint, fakePosts, fakeTags, fakeUsers, post, renderAdminApp } from "@test-utils/acceptance";
import { postsListScreen } from "./posts-list.screen";

const FLAG_ON = { labs: { postsListReact: true } };

/**
 * Bulk actions send an NQL *filter*, never a list of ids — that is what lets
 * Cmd+A cover posts that were never loaded. These tests assert the outgoing
 * request, because the filter string is the thing with the blast radius: it is
 * appended straight to `DELETE /posts/?filter=`.
 */
describe("Posts list bulk actions", () => {
    beforeEach(() => {
        fakeAdminEndpoint("POST", "/stats/posts-visitor-counts/", {stats: [{data: {visitor_counts: {}}}]});
        fakeAdminEndpoint("POST", "/stats/posts-member-counts/", {stats: [{data: {member_counts: {}}}]});
        fakeTags([]);
        fakeUsers([]);
        fakeAdminEndpoint("GET", /^\/tags\/\?.*slug/, { tags: [] });
        fakeAdminEndpoint("GET", /^\/users\/\?.*slug/, { users: [] });
    });

    it("deletes one post by id, not by the list filter", async () => {
        const target = post({ title: "Doomed", status: "published" });
        fakePosts([target]);
        const deletion = fakeAdminEndpoint("DELETE", /^\/posts\//, {});
        await renderAdminApp("/posts?type=published", FLAG_ON);
        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        await postsListScreen.listItems().first().click({ button: "right" });
        await postsListScreen.contextMenuItem("Delete").click();
        await postsListScreen.confirmButton("Delete").click();

        await expect.poll(() => deletion.requests.length).toBe(1);
        expect(new URL(deletion.requests[0].url).searchParams.get("filter"))
            .toBe(`id:['${target.id}']`);
    });

    /**
     * The reason selection is inverted rather than enumerated. On a site with
     * thousands of posts, Cmd+A then Delete must send the *filter* — enumerating
     * ids would silently spare every post that had not been scrolled into view,
     * and would build a URL long enough to be rejected outright.
     */
    it("deletes everything matching the filter after Cmd+A, not the loaded ids", async () => {
        fakePosts([
            post({ title: "First", status: "published" }),
            post({ title: "Second", status: "published" })
        ]);
        const deletion = fakeAdminEndpoint("DELETE", /^\/posts\//, {});
        await renderAdminApp("/posts?type=published", FLAG_ON);
        await expect.element(postsListScreen.listItems().nth(1)).toBeVisible();

        await userEvent.keyboard("{Meta>}a{/Meta}");
        await postsListScreen.listItems().first().click({ button: "right" });
        await postsListScreen.contextMenuItem("Delete").click();
        await postsListScreen.confirmButton("Delete").click();

        await expect.poll(() => deletion.requests.length).toBe(1);
        const filter = new URL(deletion.requests[0].url).searchParams.get("filter");
        expect(filter).toBe("status:published");
        expect(filter).not.toContain("id:");
    });

    // Cmd+A minus a few is the shape that most easily goes wrong: it has to
    // subtract the deselected ids from the list filter, parenthesised.
    it("subtracts deselected posts from the filter", async () => {
        const spared = post({ title: "Spared", status: "published" });
        fakePosts([post({ title: "First", status: "published" }), spared]);
        const deletion = fakeAdminEndpoint("DELETE", /^\/posts\//, {});
        await renderAdminApp("/posts?type=published", FLAG_ON);
        await expect.element(postsListScreen.listItems().nth(1)).toBeVisible();

        await userEvent.keyboard("{Meta>}a{/Meta}");
        await postsListScreen.listItems().nth(1).click({ modifiers: ["Meta"] });
        await postsListScreen.listItems().first().click({ button: "right" });
        await postsListScreen.contextMenuItem("Delete").click();
        await postsListScreen.confirmButton("Delete").click();

        await expect.poll(() => deletion.requests.length).toBe(1);
        expect(new URL(deletion.requests[0].url).searchParams.get("filter"))
            .toBe(`(status:published)+id:-['${spared.id}']`);
    });

    /**
     * The client-side prune. Unpublishing a post while viewing `?type=published`
     * takes it out of the list straight away — no refetch, no lost scroll
     * position — because NQL is re-run in the browser against the list's own
     * filter. See prune-non-matching-posts.ts.
     *
     * `type=published` rather than `type=featured` deliberately: featured fans
     * out across all four status buckets, and the fakes don't implement NQL, so
     * every bucket would serve the same rows and the counts would be fiction.
     */
    describe("pruning after an edit", () => {
        it("removes an unpublished post from a published-only view", async () => {
            fakePosts([
                post({ title: "Live one", status: "published" }),
                post({ title: "Live two", status: "published" })
            ]);
            fakeAdminEndpoint("PUT", /^\/posts\/bulk/, {});
            await renderAdminApp("/posts?type=published", FLAG_ON);
            await expect.element(postsListScreen.listItems().nth(1)).toBeVisible();

            await postsListScreen.listItems().first().click({ button: "right" });
            await postsListScreen.contextMenuItem("Unpublish").click();
            await postsListScreen.confirmButton("Unpublish").click();

            await expect(postsListScreen.listItems()).toHaveCount(1);
            await expect.element(postsListScreen.listItems().first()).toHaveTextContent("Live two");
        });

        // The rule with the worst failure mode: an edit must never remove rows
        // it did not touch, however the filter reads.
        it("leaves the posts it did not edit alone", async () => {
            fakePosts([
                post({ title: "Edited", status: "published" }),
                // Already a draft, so it does not match `status:published`
                // either — but the action never touched it, so it stays.
                post({ title: "Untouched", status: "draft" })
            ]);
            fakeAdminEndpoint("PUT", /^\/posts\/bulk/, {});
            await renderAdminApp("/posts?type=published", FLAG_ON);
            await expect.element(postsListScreen.listItems().nth(1)).toBeVisible();

            await postsListScreen.listItems().first().click({ button: "right" });
            await postsListScreen.contextMenuItem("Unpublish").click();
            await postsListScreen.confirmButton("Unpublish").click();

            await expect(postsListScreen.listItems()).toHaveCount(1);
            await expect.element(postsListScreen.listItems().first()).toHaveTextContent("Untouched");
        });
    });
});
