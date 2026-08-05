import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { renderAdminApp } from "@test-utils/acceptance";

/**
 * The editor is a focused writing surface — Ghost hides the nav sidebar for it,
 * and always has.
 *
 * Ember arranges that by setting `ui.isFullScreen` when the editor route
 * *activates*. With `postsListReact` on, the posts route aborts its transition,
 * so the editor route never deactivates — and a second visit is a model change
 * on an already-active route, where `activate()` does not run again. The
 * sidebar came back from the second post onwards.
 *
 * React decides it from the route instead, which does not care how many times
 * you have been there.
 *
 * These tests pin the route's own decision. They cannot prove the *original*
 * bug is gone: there is no Ember in this harness, so `useSidebarVisibility`
 * returns its default and the Ember half of the handshake is never exercised.
 * What they guarantee is that React hides the sidebar on the editor route
 * regardless of what Ember reports — which is the property the fix relies on.
 * The sequence that produced the bug (list -> editor -> list -> editor) was
 * verified by hand against a real Ghost.
 */
describe("Editor chrome", () => {
    const sidebar = () => page.getByTestId("admin-sidebar");

    it("hides the nav sidebar", async () => {
        await renderAdminApp("/editor/post/abc123");

        await expect(sidebar()).toHaveCount(0);
    });

    it("hides it for a page too", async () => {
        await renderAdminApp("/editor/page/abc123");

        await expect(sidebar()).toHaveCount(0);
    });

    // ...and still shows it everywhere else, or this would be a worse bug than
    // the one it fixes.
    it("leaves the sidebar alone on the posts list", async () => {
        await renderAdminApp("/posts");

        await expect.element(sidebar()).toBeVisible();
    });
});
