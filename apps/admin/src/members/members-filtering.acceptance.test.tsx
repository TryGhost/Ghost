import { describe, expect, it } from "vitest";
import { label, member } from "@tryghost/test-data";

import { mockMembers, renderAdminApp } from "@test-utils/acceptance";

describe("Members list", () => {
    it("lists members", async () => {
        mockMembers([
            member({ name: "First Member", email: "first@example.com" }),
            member({ name: "Second Member", email: "second@example.com" }),
            member({ name: "Third Member", email: "third@example.com" }),
        ]);
        const screen = await renderAdminApp({ route: "/members" });

        await expect(screen.getByTestId("members-list-item")).toHaveCount(3);
        await expect.element(screen.getByRole("link", { name: "First Member", exact: true })).toBeVisible();
        await expect.element(screen.getByRole("link", { name: "Second Member", exact: true })).toBeVisible();
        await expect.element(screen.getByRole("link", { name: "Third Member", exact: true })).toBeVisible();
    });

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

        // The URL's `label:VIP` is re-serialized into the multiselect list
        // form on the API request.
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
