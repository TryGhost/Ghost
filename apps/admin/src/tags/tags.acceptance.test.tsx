import { describe, expect, it } from "vitest";
import { tag } from "@tryghost/test-data";

import { mockTags, renderAdminApp } from "@test-utils/acceptance";

// Ported from e2e/tests/admin/tags/list.test.ts (the read-only cases): same
// UI assertions, with the Ghost Admin API served by the acceptance harness's
// tags resource handler instead of a real per-worker Ghost instance.

describe("Tags list", () => {
    it("lists public tags with description and posts count", async () => {
        mockTags([
            tag({ name: "News", description: "News description", count: { posts: 1 } }),
        ]);
        const screen = await renderAdminApp({ route: "/tags" });

        const row = screen.getByTestId("tag-list-row");
        await expect.element(row).toBeVisible();
        await expect.element(row).toHaveTextContent("News");
        await expect.element(row).toHaveTextContent("News description");
        await expect.element(row).toHaveTextContent("1 post");

        await expect.element(screen.getByLabelText("Public tags")).toHaveAttribute("data-state", "on");
        await expect.element(screen.getByLabelText("Internal tags")).toHaveAttribute("data-state", "off");
    });

    it("lists public and internal tags separately", async () => {
        mockTags([
            tag({ name: "Public Tag Name", description: "Public Tag description" }),
            tag({ name: "Other Public Tag Name" }),
            tag({ name: "#Internal Tag Name", visibility: "internal" }),
        ]);
        const screen = await renderAdminApp({ route: "/tags" });

        await expect.element(screen.getByRole("link", { name: "Public Tag Name", exact: true })).toBeVisible();
        await expect(screen.getByTestId("tag-list-row")).toHaveCount(2);

        await screen.getByLabelText("Internal tags").click();
        await expect.element(screen.getByRole("link", { name: "#Internal Tag Name", exact: true })).toBeVisible();
        await expect(screen.getByTestId("tag-list-row")).toHaveCount(1);

        await screen.getByLabelText("Public tags").click();
        await expect.element(screen.getByRole("link", { name: "Public Tag Name", exact: true })).toBeVisible();
        await expect(screen.getByTestId("tag-list-row")).toHaveCount(2);
    });

    it("shows the empty state with a call to action when there are no tags", async () => {
        mockTags([]);
        const screen = await renderAdminApp({ route: "/tags" });

        await expect.element(screen.getByRole("heading", { name: "Start organizing your content" })).toBeVisible();
        await expect.element(screen.getByRole("link", { name: "Create a new tag" })).toBeVisible();
    });
});
