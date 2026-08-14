import {describe, expect, it} from "vitest";

import {configResponse, fakeAdminEndpoint, renderAdminApp} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";
import {fakeStaffWorld, role, user} from "./staff.test-helpers";

async function chooseAction(name: string) {
    await settingsScreen.userDetailModal().getByRole("button", {name: "Actions"}).click();
    await settingsScreen.menuItem(name).click();
}

describe("Staff actions", () => {
    it("suspends an active user", async () => {
        const owner = user("Owner");
        const author = user("Author");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, author]});
        const editApi = fakeAdminEndpoint("PUT", `/users/${author.id}/?include=roles`, {users: [{...author, status: "inactive"}]});
        await renderAdminApp(`/settings/staff/${author.slug}`, {boot});

        await chooseAction("Suspend user");
        await settingsScreen.confirmationModal().getByRole("button", {name: "Suspend"}).click();

        await expect.element(settingsScreen.userDetailModal().getByText("Author User (Suspended)", {exact: true})).toBeVisible();
        expect(editApi.lastRequest?.body).toMatchObject({users: [{email: author.email, status: "inactive"}]});
    });

    it("un-suspends an inactive user", async () => {
        const owner = user("Owner");
        const author = user("Author", {status: "inactive"});
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, author]});
        const editApi = fakeAdminEndpoint("PUT", `/users/${author.id}/?include=roles`, {users: [{...author, status: "active"}]});
        await renderAdminApp(`/settings/staff/${author.slug}`, {boot});

        await chooseAction("Un-suspend user");
        await settingsScreen.confirmationModal().getByRole("button", {name: "Un-suspend"}).click();

        await expect(settingsScreen.userDetailModal().getByText(/Suspended/)).toHaveCount(0);
        expect(editApi.lastRequest?.body).toMatchObject({users: [{status: "active"}]});
    });

    it("deletes a user and returns to the staff list", async () => {
        const owner = user("Owner");
        const author = user("Author");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, author]});
        const deleteApi = fakeAdminEndpoint("DELETE", `/users/${author.id}/`, {});
        await renderAdminApp(`/settings/staff/${author.slug}`, {boot});

        await chooseAction("Delete user");
        await expect.element(settingsScreen.confirmationModal().getByText(`#${author.slug}`, {exact: false})).toBeVisible();
        await settingsScreen.confirmationModal().getByRole("button", {name: "Delete user"}).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent("User deleted");
        await expect(settingsScreen.notification("User not found")).toHaveCount(0);
        await expect(settingsScreen.userDetailModal()).toHaveCount(0);
        await expect(settingsScreen.users().getByText(author.email, {exact: true})).toHaveCount(0);
        expect(deleteApi.requests).toHaveLength(1);
    });

    it("transfers ownership to an active Administrator", async () => {
        const owner = user("Owner");
        const administrator = user("Administrator");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, administrator]});
        const makeOwnerApi = fakeAdminEndpoint("PUT", "/users/owner/", {
            users: [
                {...owner, roles: [role("Administrator")]},
                {...administrator, roles: [role("Owner")]},
            ],
        });
        await renderAdminApp(`/settings/staff/${administrator.slug}`, {boot});

        await chooseAction("Make owner");
        await settingsScreen.confirmationModal().getByRole("button", {name: "Yep — I'm sure"}).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent("Ownership transferred");
        await settingsScreen.userDetailModal().getByRole("button", {name: "Close"}).click();
        await expect.element(settingsScreen.users().getByTestId("owner-user")).toHaveTextContent(administrator.email);
        expect(makeOwnerApi.lastRequest?.body).toEqual({owner: [{id: administrator.id}]});
    });

    it("does not offer ownership transfer for non-Administrators", async () => {
        const owner = user("Owner");
        const editor = user("Editor");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, editor]});
        await renderAdminApp(`/settings/staff/${editor.slug}`, {boot});

        await settingsScreen.userDetailModal().getByRole("button", {name: "Actions"}).click();
        await expect(settingsScreen.menuItem("Make owner")).toHaveCount(0);
        await expect.element(settingsScreen.menuItem("Suspend user")).toBeVisible();
    });

    it("blocks un-suspending when the staff plan limit is reached", async () => {
        const owner = user("Owner");
        const author = user("Author", {status: "inactive"});
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, author]});
        const config = configResponse();
        config.config.hostSettings = {
            limits: {staff: {max: 1, error: "Your plan does not support more staff"}},
        };
        await renderAdminApp(`/settings/staff/${author.slug}`, {
            boot: {...boot, browseConfig: {response: config}},
        });

        await chooseAction("Un-suspend user");

        await expect.element(settingsScreen.limitModal()).toHaveTextContent("Your plan does not support more staff");
    });
});
