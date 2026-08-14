import {describe, expect, it} from "vitest";

import {fakeAdminEndpoint, renderAdminApp} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";
import {fakeStaffWorld, role, user} from "./staff.test-helpers";

describe("Staff roles", () => {
    it("groups staff under role tabs with accurate counts", async () => {
        const users = [
            user("Owner"),
            user("Administrator"),
            user("Editor"),
            user("Author"),
            user("Author", {id: "userauthortwo", name: "Second Author", slug: "second-author"}),
            user("Contributor"),
        ];
        const {boot} = fakeStaffWorld({currentUser: users[0], users});
        await renderAdminApp("/settings/staff", {boot});

        const section = settingsScreen.users();
        await expect.element(section.getByTestId("owner-user").getByText("Owner User", {exact: false})).toBeVisible();
        await expect.element(section.getByRole("tab", {name: "Administrators"})).toHaveTextContent("Administrators1");
        await expect.element(section.getByRole("tab", {name: "Editors"})).toHaveTextContent("Editors1");
        await expect.element(section.getByRole("tab", {name: "Authors"})).toHaveTextContent("Authors2");
        await expect.element(section.getByRole("tab", {name: "Contributors"})).toHaveTextContent("Contributors1");

        await section.getByRole("tab", {name: "Authors"}).click();
        await expect(section.getByTestId("user-list-item")).toHaveCount(2);
        await expect.element(section.getByText("Second Author", {exact: true})).toBeVisible();
    });

    it("moves a user to the selected role after saving", async () => {
        const owner = user("Owner");
        const author = user("Author");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, author]});
        const edited = {...author, roles: [role("Editor")]};
        const editApi = fakeAdminEndpoint("PUT", `/users/${author.id}/?include=roles`, {users: [edited]});
        await renderAdminApp(`/settings/staff/${author.slug}`, {boot});

        const modal = settingsScreen.userDetailModal();
        await modal.getByTestId("role-select").click();
        await settingsScreen.selectOption("Editor").click();
        await modal.getByRole("button", {name: "Save"}).click();

        await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();
        expect(editApi.lastRequest?.body).toMatchObject({
            users: [{id: author.id, roles: [{id: role("Editor").id, name: "Editor"}]}],
        });
        await modal.getByRole("button", {name: "Close"}).click();

        const section = settingsScreen.users();
        await section.getByRole("tab", {name: "Authors"}).click();
        await expect(section.getByText(author.email, {exact: true})).toHaveCount(0);
        await section.getByRole("tab", {name: "Editors"}).click();
        await expect.element(section.getByText(author.email, {exact: true})).toBeVisible();
    });

    it("lets Editors edit only Contributors without exposing role management", async () => {
        const editor = user("Editor", {id: "currenteditor", slug: "current-editor"});
        const otherEditor = user("Editor", {id: "othereditor", slug: "other-editor", email: "other-editor@test.com"});
        const administrator = user("Administrator");
        const author = user("Author");
        const contributor = user("Contributor");
        const owner = user("Owner");
        const users = [owner, administrator, editor, otherEditor, author, contributor];
        const {boot} = fakeStaffWorld({currentUser: editor, users});
        const editApi = fakeAdminEndpoint("PUT", `/users/${contributor.id}/?include=roles`, ({body}) => body);
        await renderAdminApp("/settings/staff", {boot});

        const section = settingsScreen.users();
        await expect(section.getByTestId("owner-user").getByRole("button")).toHaveCount(0);
        for (const [tab, email] of [["Administrators", administrator.email], ["Editors", otherEditor.email], ["Authors", author.email]] as const) {
            await section.getByRole("tab", {name: tab}).click();
            await section.getByTestId("user-list-item").filter({hasText: email}).click();
            await expect(settingsScreen.userDetailModal()).toHaveCount(0);
        }

        await section.getByRole("tab", {name: "Contributors"}).click();
        await section.getByTestId("user-list-item").filter({hasText: contributor.email}).click();
        const modal = settingsScreen.userDetailModal();
        await expect.element(modal).toBeVisible();
        await expect(modal.getByTestId("role-select")).toHaveCount(0);
        await modal.getByLabelText("Full name").fill("Updated Contributor");
        await modal.getByRole("button", {name: "Save"}).click();

        await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();
        expect(editApi.lastRequest?.body).toMatchObject({users: [{name: "Updated Contributor"}]});
        await modal.getByRole("button", {name: "Close"}).click();
        await expect.element(section.getByText("Updated Contributor", {exact: true})).toBeVisible();
    });
});
