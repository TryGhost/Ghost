import { describe, expect, it } from "vitest";

import { mockTags, renderAdminApp, tag } from "@test-utils/acceptance";
import { tagsScreen } from "./tags.screen";

// Ported from e2e/tests/admin/tags/list.test.ts (the read-only cases): same
// UI assertions, with the Ghost Admin API served by the acceptance harness's
// tags resource handler instead of a real per-worker Ghost instance.

describe("Tags list", () => {
    it("lists public tags with description and posts count", async () => {
        mockTags([
            tag({ name: "News", description: "News description", count: { posts: 1 } }),
        ]);
        await renderAdminApp("/tags");

        const row = tagsScreen.tagRows();
        await expect.element(row).toBeVisible();
        await expect.element(row).toHaveTextContent("News");
        await expect.element(row).toHaveTextContent("News description");
        await expect.element(row).toHaveTextContent("1 post");

        await expect.element(tagsScreen.publicTab()).toHaveAttribute("data-state", "on");
        await expect.element(tagsScreen.internalTab()).toHaveAttribute("data-state", "off");
    });

    it("lists public and internal tags separately", async () => {
        mockTags([
            tag({ name: "Public Tag Name" }),
            tag({ name: "Other Public Tag Name" }),
            tag({ name: "#Internal Tag Name", visibility: "internal" }),
        ]);
        await renderAdminApp("/tags");

        await expect.element(tagsScreen.rowLink("Public Tag Name")).toBeVisible();
        await expect(tagsScreen.tagRows()).toHaveCount(2);

        await tagsScreen.internalTab().click();
        await expect.element(tagsScreen.rowLink("#Internal Tag Name")).toBeVisible();
        await expect(tagsScreen.tagRows()).toHaveCount(1);

        await tagsScreen.publicTab().click();
        await expect.element(tagsScreen.rowLink("Public Tag Name")).toBeVisible();
        await expect(tagsScreen.tagRows()).toHaveCount(2);
    });

    it("shows the empty state with a call to action when there are no tags", async () => {
        mockTags([]);
        await renderAdminApp("/tags");

        await expect.element(tagsScreen.emptyStateHeading()).toBeVisible();
        await expect.element(tagsScreen.createNewTagLink()).toBeVisible();
    });
});
