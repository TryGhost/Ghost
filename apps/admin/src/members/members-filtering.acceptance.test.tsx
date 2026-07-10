import { describe, expect, it } from "vitest";
import { label, member } from "@tryghost/test-data";

import { mockMembers, renderAdminApp } from "@test-utils/acceptance";

// Ported from e2e/tests/admin/members/search-and-filter.test.ts (the
// acceptance halves). Members filtering is NQL-serialization behavior, so the
// handler runs in EXPLICIT mode: the spec declares what the API returns and
// asserts the outgoing filter/search string — the handler never interprets NQL.

describe("Members filtering", () => {
    it("filters members by label from the URL", async () => {
        const vip = label({ name: "VIP" });
        const members = mockMembers(
            [
                member({ name: "Labelled One", email: "labelled1@example.com", labels: [vip] }),
                member({ name: "Labelled Two", email: "labelled2@example.com", labels: [vip] }),
            ],
            { labels: [vip] }
        );
        const screen = await renderAdminApp({ route: "/members?filter=label:VIP" });

        await expect.element(screen.getByRole("link", { name: "Labelled One", exact: true })).toBeVisible();
        await expect(screen.getByTestId("members-list-item")).toHaveCount(2);

        // The page re-serializes the URL's `label:VIP` into the multiselect
        // list form before querying the API — that serialization is the
        // behavior under test here.
        expect(members.lastRequest?.url).toContain("filter=label%3A%5BVIP%5D");
    });

    it("shows no results state when search matches nothing", async () => {
        const members = mockMembers(
            ({ search }) => (search ? [] : [member({ name: "Existing Member", email: "exists@example.com" })])
        );
        const screen = await renderAdminApp({ route: "/members" });

        await expect(screen.getByTestId("members-list-item")).toHaveCount(1);

        await screen.getByLabelText("Search members").fill("nonexistentnamestring");

        await expect.element(screen.getByText("No matching members found.")).toBeVisible();
        await expect.element(screen.getByRole("button", { name: "Show all members" })).toBeVisible();
        expect(members.lastRequest?.search).toBe("nonexistentnamestring");
    });

    it("builds a name filter through the filters UI", async () => {
        const members = mockMembers(({ filter }) => (filter
            ? [member({ name: "Alice Alpha", email: "alice@alpha.com" })]
            : [
                member({ name: "Alice Alpha", email: "alice@alpha.com" }),
                member({ name: "Bob Beta", email: "bob@beta.com" }),
            ]));
        const screen = await renderAdminApp({ route: "/members" });

        await expect(screen.getByTestId("members-list-item")).toHaveCount(2);

        await screen.getByRole("button", { name: "Filter" }).click();
        await screen.getByRole("option", { name: "Name", exact: true }).click();
        await screen.getByRole("textbox", { name: "Enter name..." }).fill("Alice");

        await expect.poll(() => members.lastRequest?.filter).toContain("name:~'Alice'");
        await expect(screen.getByTestId("members-list-item")).toHaveCount(1);
        await expect.element(screen.getByRole("link", { name: "Alice Alpha", exact: true })).toBeVisible();
    });
});
