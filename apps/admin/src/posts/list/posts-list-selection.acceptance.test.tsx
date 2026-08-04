import { beforeEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { currentUserResponse, fakeAdminEndpoint, fakePosts, fakeTags, fakeUsers, post, renderAdminApp, staffRole } from "@test-utils/acceptance";
import { postsListScreen } from "./posts-list.screen";
import type { StaffRoleName } from "@tryghost/test-data";

const FLAG_ON = { labs: { postsListReact: true } };

/**
 * Selection has no checkboxes — it is entirely modifier-clicks, Cmd+A, Escape
 * and window-level handlers. None of that can be covered by the reducer tests:
 * the semantics live in `post-selection-state.test.ts`, and what these check is
 * the wiring — that a cmd-click reaches the reducer at all, that it doesn't
 * navigate, and that the window handler doesn't clear what was just selected.
 */

const POSTS = [
    post({ title: "First post", status: "published" }),
    post({ title: "Second post", status: "published" }),
    post({ title: "Third post", status: "published" }),
    post({ title: "Fourth post", status: "published" })
];

function asRole(name: StaffRoleName) {
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name })];
    return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

/**
 * A cmd-click on any of these targets is a cmd-click on a *link*, which opens
 * a new browser tab — that is the whole point of `data-ignore-select`, and it
 * is what Ember does too. Dispatching the mousedown directly exercises the
 * selection path without asking the browser to open tabs mid-suite.
 */
function metaMouseDown(element: Element) {
    element.dispatchEvent(new MouseEvent("mousedown", {
        bubbles: true, cancelable: true, metaKey: true
    }));
}

async function renderList(options: object = FLAG_ON) {
    fakePosts(POSTS);
    await renderAdminApp("/posts?type=published", options);
    await expect.element(postsListScreen.listItems().nth(3)).toBeVisible();
}

describe("Posts list selection", () => {
    beforeEach(() => {
        fakeAdminEndpoint("POST", "/stats/posts-visitor-counts/", {stats: [{data: {visitor_counts: {}}}]});
        fakeAdminEndpoint("POST", "/stats/posts-member-counts/", {stats: [{data: {member_counts: {}}}]});
        fakeTags([]);
        fakeUsers([]);
        fakeAdminEndpoint("GET", /^\/tags\/\?.*slug/, { tags: [] });
        fakeAdminEndpoint("GET", /^\/users\/\?.*slug/, { users: [] });
    });

    it("selects a row on cmd-click without following its link", async () => {
        await renderList();

        await postsListScreen.listItems().nth(1).click({ modifiers: ["Meta"] });

        await expect.poll(() => postsListScreen.selectedTitles()).toEqual(["Second post"]);
        // The row is a link; a modifier-click must not navigate to the editor.
        expect(window.location.hash).toContain("/posts");
    });

    it("adds a second row rather than replacing the first", async () => {
        await renderList();

        await postsListScreen.listItems().nth(0).click({ modifiers: ["Meta"] });
        await postsListScreen.listItems().nth(2).click({ modifiers: ["Meta"] });

        await expect.poll(() => postsListScreen.selectedTitles().length).toBe(2);
    });

    it("deselects a row on a second cmd-click", async () => {
        await renderList();

        await postsListScreen.listItems().nth(1).click({ modifiers: ["Meta"] });
        await postsListScreen.listItems().nth(1).click({ modifiers: ["Meta"] });

        await expect.poll(() => postsListScreen.selectedTitles().length).toBe(0);
    });

    // Titles, not a count: the anchor-inclusion bugs this guards against all
    // preserve the count while shifting *which* rows are in the range.
    it("selects a range on shift-click", async () => {
        await renderList();

        await postsListScreen.listItems().nth(0).click({ modifiers: ["Meta"] });
        await postsListScreen.listItems().nth(2).click({ modifiers: ["Shift"] });

        await expect.poll(() => postsListScreen.selectedTitles())
            .toEqual(["First post", "Second post", "Third post"]);
    });

    // Backwards takes the anchor with it, where forwards excludes it — the
    // asymmetry is Ember's, and it is invisible to a count-only assertion.
    it("selects a backward range including the anchor", async () => {
        await renderList();

        await postsListScreen.listItems().nth(2).click({ modifiers: ["Meta"] });
        await postsListScreen.listItems().nth(0).click({ modifiers: ["Shift"] });

        await expect.poll(() => postsListScreen.selectedTitles())
            .toEqual(["First post", "Second post", "Third post"]);
    });

    /**
     * Asserted against the server's total, not the loaded rows: an
     * implementation that simply enumerated the four ids on screen would pass a
     * count-of-four check, and that is precisely the bug that makes a bulk
     * delete silently miss every unloaded page.
     */
    it("selects everything on Cmd+A, including rows never loaded", async () => {
        await renderList();

        await userEvent.keyboard("{Meta>}a{/Meta}");

        await expect.poll(() => postsListScreen.selectedTitles().length).toBe(4);
        // The rows on screen are all selected, but the selection is inverted —
        // it is bounded by the filter, not by the four ids in memory.
        await expect.poll(() => postsListScreen.listRoot().getAttribute("data-selection"))
            .toBe("inverted");
    });

    // The inverted selection has to survive a deselect, since that is what
    // produces the `(filter)+id:-[…]` shape bulk actions send.
    it("lets a row be taken back out after Cmd+A", async () => {
        await renderList();

        await userEvent.keyboard("{Meta>}a{/Meta}");
        await postsListScreen.listItems().nth(1).click({ modifiers: ["Meta"] });

        await expect.poll(() => postsListScreen.selectedTitles().length).toBe(3);
    });

    it("clears the selection on Escape", async () => {
        await renderList();

        await postsListScreen.listItems().nth(1).click({ modifiers: ["Meta"] });
        await userEvent.keyboard("{Escape}");

        await expect.poll(() => postsListScreen.selectedTitles().length).toBe(0);
    });

    // The window-level click handler. Its counterpart — *not* clearing on the
    // modifier click that just selected the row — is covered by every test
    // above, which would all read zero if the handler fired too eagerly.
    it("clears the selection on an unmodified click elsewhere", async () => {
        await renderList();

        await postsListScreen.listItems().nth(1).click({ modifiers: ["Meta"] });
        await postsListScreen.title("posts", "Posts").click();

        await expect.poll(() => postsListScreen.selectedTitles().length).toBe(0);
    });

    // `data-ignore-select` on the metric links and the trailing button: a
    // cmd-click there follows the link into a new tab, as on any link, rather
    // than selecting the row underneath it.
    it("does not select when the trailing action button is cmd-clicked", async () => {
        await renderList();

        metaMouseDown(postsListScreen.rowAction().nth(1).element());

        await expect.poll(() => postsListScreen.selectedTitles().length).toBe(0);
    });

    describe.each([
        { role: "Author" as const },
        { role: "Contributor" as const }
    ])("as $role", ({ role }) => {
        // Ember disables the whole SelectionList for these roles — they have no
        // bulk actions, so a selection would be an affordance leading nowhere.
        it("cannot select a row at all", async () => {
            await renderList(asRole(role));

            metaMouseDown(postsListScreen.listItems().nth(1).element());

            await expect.poll(() => postsListScreen.selectedTitles().length).toBe(0);
        });

        it("cannot select everything with Cmd+A", async () => {
            await renderList(asRole(role));

            await userEvent.keyboard("{Meta>}a{/Meta}");

            await expect.poll(() => postsListScreen.selectedTitles().length).toBe(0);
        });
    });

    /**
     * Ember clears the selection on every model refresh (`clearSelection()` in
     * PostsRoute#setupController), and all five query params are
     * `refreshModel: true` — so changing a filter always drops the selection.
     *
     * Keeping it would be worse than untidy. After Cmd+A the selection is
     * *inverted* and bounded by the list's filter, and that filter is rebuilt
     * from the URL. Select all drafts, then clear the type filter, and the same
     * selection now means "every post on the site" — which is what a bulk
     * delete would be handed.
     */
    describe("across a filter change", () => {
        // Navigated through history rather than by clicking a filter control:
        // every click path to changing a filter is itself an unmodified click,
        // which clears the selection on its own. Going through the URL is the
        // only way to prove the filter change is what did it.
        function navigate(to: string) {
            window.history.pushState({}, "", to);
            window.dispatchEvent(new PopStateEvent("popstate"));
        }

        it("drops the selection when the filter changes", async () => {
            await renderList();

            await postsListScreen.listItems().nth(1).click({ modifiers: ["Meta"] });
            await expect.poll(() => postsListScreen.selectedTitles().length).toBe(1);

            navigate("#/posts?type=published&visibility=public");

            await expect.poll(() => postsListScreen.selectedTitles().length).toBe(0);
        });

        it("drops an inverted selection rather than re-bounding it to the new filter", async () => {
            await renderList();

            await userEvent.keyboard("{Meta>}a{/Meta}");
            await expect.poll(() => postsListScreen.selectedTitles().length).toBe(4);

            navigate("#/posts?type=published&visibility=public");

            await expect.poll(() => postsListScreen.selectedTitles().length).toBe(0);
        });
    });

    /**
     * Ember's `[data-ctrl]` mode. Holding a modifier takes the list out of
     * "links" and into "selectable rows" — the cursor changes and children stop
     * taking pointer events, so a click lands on the row. Without it the list
     * still *behaves* correctly (the handlers preventDefault) but gives no sign
     * that a click is about to select rather than navigate.
     */
    describe("while a modifier is held", () => {
        it("puts the list into select mode and takes it back out", async () => {
            await renderList();

            await userEvent.keyboard("{Meta>}");
            await expect.poll(() => postsListScreen.listRoot().getAttribute("data-ctrl")).toBe("true");

            await userEvent.keyboard("{/Meta}");
            await expect.poll(() => postsListScreen.listRoot().getAttribute("data-ctrl")).toBeNull();
        });

        // The keyup for a held modifier never arrives if the window loses focus
        // mid-chord, which would strand the list with nothing clickable.
        it("leaves select mode when the window loses focus", async () => {
            await renderList();

            await userEvent.keyboard("{Meta>}");
            await expect.poll(() => postsListScreen.listRoot().getAttribute("data-ctrl")).toBe("true");

            window.dispatchEvent(new Event("blur"));

            await expect.poll(() => postsListScreen.listRoot().getAttribute("data-ctrl")).toBeNull();
            await userEvent.keyboard("{/Meta}");
        });

        it("stays out of select mode for roles that cannot select", async () => {
            await renderList(asRole("Contributor"));

            await userEvent.keyboard("{Meta>}");

            await expect.poll(() => postsListScreen.listRoot().getAttribute("data-ctrl")).toBeNull();
            await userEvent.keyboard("{/Meta}");
        });
    });
});
