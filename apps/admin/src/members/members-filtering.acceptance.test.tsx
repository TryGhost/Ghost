import { describe, expect, it } from "vitest";

import { fakeMembers, label, member, renderAdminApp } from "@test-utils/acceptance";
import { membersScreen } from "./members.screen";

describe("Members list", () => {
    it("lists members", async () => {
        fakeMembers([
            member({ name: "First Member" }),
            member({ name: "Second Member" }),
            member({ name: "Third Member" }),
        ]);
        await renderAdminApp("/members");

        await expect(membersScreen.memberRows()).toHaveCount(3);
        await expect.element(membersScreen.link("First Member")).toBeVisible();
        await expect.element(membersScreen.link("Second Member")).toBeVisible();
        await expect.element(membersScreen.link("Third Member")).toBeVisible();
    });

    it("filters members by label from the URL", async () => {
        const vip = label({ name: "VIP" });
        const membersApi = fakeMembers([
            member({ name: "Labelled One", labels: [vip] }),
            member({ name: "Labelled Two", labels: [vip] }),
        ]);
        await renderAdminApp("/members?filter=label:VIP");

        await expect.element(membersScreen.link("Labelled One")).toBeVisible();
        await expect(membersScreen.memberRows()).toHaveCount(2);

        // The URL's `label:VIP` is re-serialized into the multiselect list
        // form on the API request.
        await expect(membersApi).toHaveSentFilter("label:[VIP]");
    });

    it("shows no results state when search matches nothing", async () => {
        const membersApi = fakeMembers(
            ({ search }) => (search ? [] : [member({ name: "Existing Member" })])
        );
        await renderAdminApp("/members");

        await expect(membersScreen.memberRows()).toHaveCount(1);

        await membersScreen.searchInput().fill("nonexistentnamestring");

        await expect.element(membersScreen.noResults()).toBeVisible();
        await expect.element(membersScreen.showAllButton()).toBeVisible();
        await expect(membersApi).toHaveSentSearch("nonexistentnamestring");
    });

    it("builds a name filter through the filters UI", async () => {
        const membersApi = fakeMembers(({ filter }) => (filter
            ? [member({ name: "Alice Alpha" })]
            : [
                member({ name: "Alice Alpha" }),
                member({ name: "Bob Beta" }),
            ]));
        await renderAdminApp("/members");

        await expect(membersScreen.memberRows()).toHaveCount(2);

        await membersScreen.addFilter("Name", "Alice");

        await expect(membersApi).toHaveSentFilter(/name:~'Alice'/);
        await expect(membersScreen.memberRows()).toHaveCount(1);
        await expect.element(membersScreen.link("Alice Alpha")).toBeVisible();
    });
});
