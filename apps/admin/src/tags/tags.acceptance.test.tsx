import { describe, expect, it } from "vitest";

import { fakeTags, renderAdminApp, tag } from "@test-utils/acceptance";
import { tagsScreen } from "./tags.screen";

describe("Tags list", () => {
    it("lists public tags with description and posts count", async () => {
        fakeTags([
            tag({ name: "News", description: "News description", count: { posts: 1 } }),
        ]);
        await renderAdminApp("/tags");

        const row = tagsScreen.tagRows();
        await expect.element(row).toBeVisible();
        await expect.element(row).toHaveTextContent("News");
        await expect.element(row).toHaveTextContent("News description");
        await expect.element(row).toHaveTextContent("1 post");

        // The tabs are a single-select toggle group: role="radio" + aria-checked.
        await expect.element(tagsScreen.publicTab()).toHaveAttribute("aria-checked", "true");
        await expect.element(tagsScreen.internalTab()).toHaveAttribute("aria-checked", "false");
    });

    it("lists public and internal tags separately", async () => {
        fakeTags([
            tag({ name: "Public Tag Name" }),
            tag({ name: "Other Public Tag Name" }),
            tag({ name: "#Internal Tag Name", visibility: "internal" }),
        ]);
        await renderAdminApp("/tags");

        await expect.element(tagsScreen.link("Public Tag Name")).toBeVisible();
        await expect(tagsScreen.tagRows()).toHaveCount(2);

        await tagsScreen.internalTab().click();
        await expect.element(tagsScreen.link("#Internal Tag Name")).toBeVisible();
        await expect(tagsScreen.tagRows()).toHaveCount(1);

        await tagsScreen.publicTab().click();
        await expect.element(tagsScreen.link("Public Tag Name")).toBeVisible();
        await expect(tagsScreen.tagRows()).toHaveCount(2);
    });

    it("shows the empty state with a call to action when there are no tags", async () => {
        fakeTags([]);
        await renderAdminApp("/tags");

        await expect.element(tagsScreen.emptyStateHeading()).toBeVisible();
        await expect.element(tagsScreen.createNewTagLink()).toBeVisible();
    });
});
