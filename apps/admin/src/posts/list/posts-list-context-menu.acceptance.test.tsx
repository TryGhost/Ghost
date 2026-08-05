import { beforeEach, describe, expect, it } from "vitest";

import { fakeAdminEndpoint, fakePosts, fakeTags, fakeUsers, post, renderAdminApp } from "@test-utils/acceptance";
import { postsListScreen } from "./posts-list.screen";

const FLAG_ON = { labs: { postsListReact: true } };

/**
 * The right-click menu. Which items it offers for a given selection is unit
 * tested in post-context-menu-items.test.ts; what these cover is the wiring —
 * that a right-click opens it at all, that it describes the selection rather
 * than the row under the cursor, and that the actions do what they say.
 */
describe("Posts list context menu", () => {
    beforeEach(() => {
        fakeAdminEndpoint("POST", "/stats/posts-visitor-counts/", {stats: [{data: {visitor_counts: {}}}]});
        fakeAdminEndpoint("POST", "/stats/posts-member-counts/", {stats: [{data: {member_counts: {}}}]});
        fakeTags([]);
        fakeUsers([]);
        fakeAdminEndpoint("GET", /^\/tags\/\?.*slug/, { tags: [] });
        fakeAdminEndpoint("GET", /^\/users\/\?.*slug/, { users: [] });
    });

    it("opens on right-click", async () => {
        fakePosts([post({ title: "A draft", status: "draft" })]);
        await renderAdminApp("/posts?type=draft", FLAG_ON);
        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        await postsListScreen.listItems().first().click({ button: "right" });

        await expect.element(postsListScreen.contextMenu()).toBeVisible();
    });

    // The whole point of the transient selection: right-clicking a row nothing
    // has selected acts on that row alone.
    it("offers actions for the right-clicked row when nothing is selected", async () => {
        fakePosts([post({ title: "A draft", status: "draft" })]);
        await renderAdminApp("/posts?type=draft", FLAG_ON);
        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        await postsListScreen.listItems().first().click({ button: "right" });

        await expect.element(postsListScreen.contextMenuItem("Copy preview link")).toBeVisible();
        await expect.element(postsListScreen.contextMenuItem("Duplicate")).toBeVisible();
    });

    /**
     * Ember's "Copy preview link" copies `post.url` — the public permalink,
     * which for a draft points at a page that does not exist yet. It is the
     * same string its "Copy link to post" action copies, so the two menu items
     * are indistinguishable. Fixed here rather than ported; flagged for Ember
     * separately.
     */
    it("copies the preview link, not the public permalink", async () => {
        const draft = post({ title: "A draft", status: "draft", url: "https://example.com/a-draft/" });
        fakePosts([draft]);
        await renderAdminApp("/posts?type=draft", FLAG_ON);
        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        const copied: string[] = [];
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText: (text: string) => { copied.push(text); return Promise.resolve(); } }
        });

        await postsListScreen.listItems().first().click({ button: "right" });
        await postsListScreen.contextMenuItem("Copy preview link").click();

        await expect.poll(() => copied).toEqual([`http://test.com/p/${draft.uuid}/`]);
        expect(copied[0]).not.toBe(draft.url);
    });

    it("copies the public permalink for a published post", async () => {
        const published = post({ title: "Live", status: "published", url: "https://example.com/live/" });
        fakePosts([published]);
        await renderAdminApp("/posts?type=published", FLAG_ON);
        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        const copied: string[] = [];
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText: (text: string) => { copied.push(text); return Promise.resolve(); } }
        });

        await postsListScreen.listItems().first().click({ button: "right" });
        await postsListScreen.contextMenuItem("Copy link to post").click();

        await expect.poll(() => copied).toEqual(["https://example.com/live/"]);
    });

    /**
     * Duplicating always produces a draft, whatever the source was. The point
     * of the test is that the copy shows up on its own — the user shouldn't
     * have to reload to see what they just made, which is a bug we already hit
     * once on this screen when creating a page.
     *
     * The fake starts serving the copy once the copy endpoint has been called,
     * which is what the real server does.
     */
    it("duplicates a post and shows the copy straight away", async () => {
        const original = post({ title: "Original", status: "published" });
        const duplicate = post({ title: "Original (Copy)", status: "draft" });
        let duplicated = false;

        fakePosts(() => (duplicated ? [duplicate, original] : [original]));
        fakeAdminEndpoint("POST", new RegExp(`/posts/${original.id}/copy`), () => {
            duplicated = true;
            return { posts: [duplicate] };
        });
        await renderAdminApp("/posts?type=published", FLAG_ON);
        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        await postsListScreen.listItems().first().click({ button: "right" });
        await postsListScreen.contextMenuItem("Duplicate").click();

        await expect(postsListScreen.listItems()).toHaveCount(2);
        await expect.element(postsListScreen.listItems().first()).toHaveTextContent("Original (Copy)");
        // Also pins the key-to-message mapping: swapping two `notify` calls in
        // the actions hook would otherwise go unnoticed.
        await expect.element(postsListScreen.toastWithText("Post duplicated")).toBeVisible();
    });

    /**
     * A gift link shares a gated post with someone who isn't a member. Ember's
     * menu hands off to this same React modal over the state bridge; the React
     * list opens it directly, so there is one modal and one set of eligibility
     * rules (`@/shared/gift-link`) behind both.
     */
    describe("share as a gift", () => {
        const gated = post({ title: "Members only", status: "published", visibility: "paid" });

        it("offers it for a gated published post", async () => {
            fakePosts([gated]);
            await renderAdminApp("/posts?type=published", FLAG_ON);
            await expect.element(postsListScreen.listItems().first()).toBeVisible();

            await postsListScreen.listItems().first().click({ button: "right" });

            await expect.element(postsListScreen.contextMenuItem("Share as a gift")).toBeVisible();
        });

        // Nothing to gift — anyone can already read it.
        it("does not offer it for a public post", async () => {
            fakePosts([post({ title: "Open to all", status: "published", visibility: "public" })]);
            await renderAdminApp("/posts?type=published", FLAG_ON);
            await expect.element(postsListScreen.listItems().first()).toBeVisible();

            await postsListScreen.listItems().first().click({ button: "right" });

            await expect.element(postsListScreen.contextMenu()).toBeVisible();
            await expect(postsListScreen.contextMenuItem("Share as a gift")).toHaveCount(0);
        });

        it("opens the gift-link modal", async () => {
            fakePosts([gated]);
            // The modal ensures a gift link for the post as soon as it opens.
            fakeAdminEndpoint("PUT", new RegExp(`/posts/${gated.id}/gift_links`), {
                gift_links: [{ id: "g1", url: `https://example.com/members/gift/${gated.id}` }]
            });
            await renderAdminApp("/posts?type=published", FLAG_ON);
            await expect.element(postsListScreen.listItems().first()).toBeVisible();

            await postsListScreen.listItems().first().click({ button: "right" });
            await postsListScreen.contextMenuItem("Share as a gift").click();

            await expect.element(postsListScreen.giftLinkModal()).toBeVisible();
        });
    });

    /**
     * The menu describes the whole selection. Right-clicking a row that is
     * already part of one must not collapse it down to that row — that is how
     * every bulk action is reached.
     */
    it("keeps a multi-row selection and drops the single-post actions", async () => {
        fakePosts([
            post({ title: "First", status: "published" }),
            post({ title: "Second", status: "published" })
        ]);
        await renderAdminApp("/posts?type=published", FLAG_ON);
        await expect.element(postsListScreen.listItems().nth(1)).toBeVisible();

        await postsListScreen.listItems().nth(0).click({ modifiers: ["Meta"] });
        await postsListScreen.listItems().nth(1).click({ modifiers: ["Meta"] });
        await postsListScreen.listItems().nth(1).click({ button: "right" });

        await expect.element(postsListScreen.contextMenu()).toBeVisible();
        // Both rows are still selected, so the per-post actions are gone...
        await expect(postsListScreen.contextMenuItem("Copy link to post")).toHaveCount(0);
        await expect(postsListScreen.contextMenuItem("Duplicate")).toHaveCount(0);
        // ...while the ones that work on many rows remain.
        await expect.element(postsListScreen.contextMenuItem("Add a tag")).toBeVisible();
        await expect.poll(() => postsListScreen.selectedTitles().length).toBe(2);
    });

    /**
     * The bulk actions are wired in Phase 8. Until then they must not look
     * available: a menu that closes and does nothing when you pick Delete is
     * worse than one that says the item isn't ready.
     */
    it("disables the actions that are not wired up yet", async () => {
        fakePosts([post({ title: "A draft", status: "draft" })]);
        await renderAdminApp("/posts?type=draft", FLAG_ON);
        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        await postsListScreen.listItems().first().click({ button: "right" });

        // Add a tag and Change access still need their pickers.
        await expect.element(postsListScreen.contextMenuItem("Add a tag")).toBeDisabled();
        await expect.element(postsListScreen.contextMenuItem("Change access")).toBeDisabled();
        // ...while the ones that do work are not disabled.
        await expect.element(postsListScreen.contextMenuItem("Duplicate")).not.toBeDisabled();
        await expect.element(postsListScreen.contextMenuItem("Delete")).not.toBeDisabled();
    });

    /**
     * Ember surfaces API failures through `notifications.showAPIError`. Here the
     * framework's global handler does it, so the message is generic rather than
     * action-specific — but the failure is visible, which is the contract that
     * matters. `usePostActions` also wraps the switch in a try/catch, which
     * covers the paths the framework doesn't see at all: `clipboard.writeText`
     * rejects whenever the document isn't focused.
     */
    it("reports a failed duplicate instead of failing silently", async () => {
        const original = post({ title: "Original", status: "published" });
        fakePosts([original]);
        fakeAdminEndpoint(
            "POST",
            new RegExp(`/posts/${original.id}/copy`),
            { errors: [{ message: "Could not duplicate this post." }] },
            { status: 500 }
        );
        await renderAdminApp("/posts?type=published", FLAG_ON);
        await expect.element(postsListScreen.listItems().first()).toBeVisible();

        await postsListScreen.listItems().first().click({ button: "right" });
        await postsListScreen.contextMenuItem("Duplicate").click();

        // The framework's own error handling surfaces this, with its standard
        // wording rather than anything this screen chooses. What matters is
        // that the user is told at all...
        await expect.element(postsListScreen.toastWithText(/something went wrong/i)).toBeVisible();
        // ...and that success is not also claimed.
        await expect(postsListScreen.toastWithText(/duplicated/i)).toHaveCount(0);
    });
});
