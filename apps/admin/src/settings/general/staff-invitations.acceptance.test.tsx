import {describe, expect, it} from "vitest";
import {userEvent} from "vitest/browser";

import {configResponse, fakeAdminEndpoint, fakeInvites, renderAdminApp} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";
import {fakeStaffWorld, invite, role, user} from "./staff.test-helpers";

async function openInviteModal() {
    await settingsScreen.users().getByRole("button", {name: "Invite people"}).click();
    return settingsScreen.inviteUserModal();
}

describe("Staff invitations", () => {
    it("validates duplicate addresses and sends a role-specific invitation", async () => {
        const owner = user("Owner");
        const author = user("Author");
        const existingInvite = invite();
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, author], invites: [existingInvite]});
        const created = invite({id: "newinvite", email: "newuser@test.com"});
        const addApi = fakeAdminEndpoint("POST", "/invites/", {invites: [created]});
        await renderAdminApp("/settings/staff", {boot});

        const modal = await openInviteModal();
        await modal.getByRole("button", {name: "Send invitation"}).click();
        await expect.element(modal.getByText("Please enter a valid email address.")).toBeVisible();

        const emailInput = modal.getByLabelText("Email address");
        await userEvent.type(emailInput.element(), "test");
        await expect(modal.getByText("Please enter a valid email address.")).toHaveCount(0);
        await modal.getByRole("button", {name: "Send invitation"}).click();
        await expect.element(modal.getByText("Please enter a valid email address.")).toBeVisible();

        await emailInput.fill("");
        await userEvent.type(emailInput.element(), author.email);
        await expect(modal.getByText("Please enter a valid email address.")).toHaveCount(0);
        await modal.getByRole("button", {name: "Send invitation"}).click();
        await expect.element(modal.getByText("A user with that email address already exists.")).toBeVisible();

        await modal.getByLabelText("Email address").fill(existingInvite.email);
        await modal.getByRole("button", {name: "Retry"}).click();
        await expect.element(modal.getByText("A user with that email address was already invited.")).toBeVisible();

        await modal.getByLabelText("Email address").fill(created.email);
        await modal.getByRole("radio", {name: /^Author\b/}).click();
        await modal.getByRole("button", {name: "Retry"}).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent("Invitation sent");
        expect(addApi.lastRequest?.body).toEqual({
            invites: [{email: created.email, role_id: role("Author").id, expires: null, status: null, token: null}],
        });
        await expect.element(settingsScreen.users().getByText(created.email, {exact: true})).toBeVisible();
        const createdItem = settingsScreen.users().getByTestId("user-invite").filter({hasText: created.email});
        await expect.element(createdItem.getByText("Author", {exact: true})).toBeVisible();
    });

    it("shows server-side duplicate-user validation inline without an error toast", async () => {
        const {boot} = fakeStaffWorld();
        const addApi = fakeAdminEndpoint("POST", "/invites/", {
            errors: [{
                type: "ValidationError",
                message: "Validation error, cannot save invite.",
                context: "User is already registered.",
                property: "email",
                code: "USER_ALREADY_REGISTERED",
            }],
        }, {status: 422});
        await renderAdminApp("/settings/staff", {boot});

        const modal = await openInviteModal();
        await modal.getByLabelText("Email address").fill("existing-on-next-page@test.com");
        await modal.getByRole("radio", {name: /^Author\b/}).click();
        await modal.getByRole("button", {name: "Send invitation"}).click();

        await expect.element(modal.getByText("A user with that email address already exists.")).toBeVisible();
        await expect(settingsScreen.errorToast()).toHaveCount(0);
        expect(addApi.requests).toHaveLength(1);
    });

    it("resends an invitation by revoking and recreating it", async () => {
        const existing = invite();
        const {boot} = fakeStaffWorld({invites: [existing]});
        const deleteApi = fakeAdminEndpoint("DELETE", `/invites/${existing.id}/`, {});
        const addApi = fakeAdminEndpoint("POST", "/invites/", {invites: [existing]});
        await renderAdminApp("/settings/staff?tab=invited", {boot});

        const item = settingsScreen.users().getByTestId("user-invite");
        await item.hover();
        await item.getByRole("button", {name: "Resend"}).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent("Invitation resent");
        expect(deleteApi.requests).toHaveLength(1);
        expect(addApi.lastRequest?.body).toMatchObject({invites: [{email: existing.email, role_id: existing.role_id}]});
    });

    it("revokes an invitation and removes it from the list", async () => {
        const existing = invite();
        const {boot} = fakeStaffWorld({invites: [existing]});
        const deleteApi = fakeAdminEndpoint("DELETE", `/invites/${existing.id}/`, {});
        await renderAdminApp("/settings/staff?tab=invited", {boot});

        const item = settingsScreen.users().getByTestId("user-invite");
        await item.hover();
        await item.getByRole("button", {name: "Revoke"}).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent("Invitation revoked");
        await expect(settingsScreen.users().getByTestId("user-invite")).toHaveCount(0);
        expect(deleteApi.requests).toHaveLength(1);
    });

    it("loads the next page of invitations and keeps the total count accurate", {timeout: 30_000}, async () => {
        const invites = Array.from({length: 101}, (_, index) => invite({
            id: `invite${index}`,
            email: `invitee${index}@test.com`,
        }));
        const {boot} = fakeStaffWorld();
        const invitesApi = fakeInvites(invites);
        await renderAdminApp("/settings/staff?tab=invited", {boot});

        const section = settingsScreen.users();
        await expect.element(section.getByText("invitee0@test.com", {exact: true})).toBeVisible();
        await expect(section.getByText("invitee100@test.com", {exact: true})).toHaveCount(0);
        await expect.element(section.getByRole("tab", {name: "Invited"})).toHaveTextContent("Invited101");
        await section.getByRole("button", {name: "Load more (showing 100/101 invites)"}).click();

        await expect.element(section.getByText("invitee100@test.com", {exact: true})).toBeVisible();
        expect(invitesApi.requests.map(request => request.page)).toEqual([1, 2]);
    });

    it("applies staff limits to paid roles but still permits Contributors", async () => {
        const {boot} = fakeStaffWorld();
        const config = configResponse();
        config.config.hostSettings = {
            limits: {staff: {max: 1, error: "Your plan does not support more staff"}},
        };
        await renderAdminApp("/settings/staff", {boot: {...boot, browseConfig: {response: config}}});

        const modal = await openInviteModal();
        await modal.getByRole("radio", {name: /^Author\b/}).click();
        await expect.element(modal).toHaveTextContent("Your plan does not support more staff");

        await modal.getByRole("radio", {name: /^Contributor\b/}).click();
        await expect(modal.getByText("Your plan does not support more staff")).toHaveCount(0);
    });
});
