import {describe, expect, it} from "vitest";

import {fakeAdminEndpoint, renderAdminApp} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";
import {fakeStaffWorld, user} from "./staff.test-helpers";

describe("Staff passwords", () => {
    it("validates and changes another staff user's password", async () => {
        const owner = user("Owner");
        const administrator = user("Administrator");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, administrator]});
        const passwordApi = fakeAdminEndpoint("PUT", "/users/password/", {password: [{message: "Password updated"}]});
        await renderAdminApp(`/settings/staff/${administrator.slug}`, {boot});

        const modal = settingsScreen.userDetailModal();
        await modal.getByTestId("change-password-button").click();
        const newPassword = modal.getByTestId("new-password");
        const confirmPassword = modal.getByTestId("confirm-password");
        const save = modal.getByTestId("save-password-button");
        await expect.element(newPassword).toHaveFocus();

        await newPassword.fill("short");
        await confirmPassword.fill("short");
        await save.click();
        await expect.element(modal.getByText("Password must be at least 10 characters long.")).toBeVisible();

        await newPassword.fill("1234567890");
        await confirmPassword.fill("1234567890");
        await save.click();
        await expect.element(modal.getByText("Sorry, you cannot use an insecure password.")).toBeVisible();

        await newPassword.fill("this-is-sufficiently-secure");
        await confirmPassword.fill("different-password");
        await save.click();
        await expect.element(modal.getByText("Your new passwords do not match").first()).toBeVisible();

        await confirmPassword.fill("this-is-sufficiently-secure");
        await save.click();
        await expect.element(save).toHaveTextContent("Saved");
        expect(passwordApi.lastRequest?.body).toEqual({
            password: [{
                user_id: administrator.id,
                oldPassword: "",
                newPassword: "this-is-sufficiently-secure",
                ne2Password: "this-is-sufficiently-secure",
            }],
        });
    });

    it("requires and submits the current password when changing your own", async () => {
        const owner = user("Owner");
        const {boot} = fakeStaffWorld({currentUser: owner});
        const passwordApi = fakeAdminEndpoint("PUT", "/users/password/", {password: [{message: "Password updated"}]});
        await renderAdminApp(`/settings/staff/${owner.slug}`, {boot});

        const modal = settingsScreen.userDetailModal();
        await modal.getByTestId("change-password-button").click();
        const oldPassword = modal.getByTestId("old-password");
        const newPassword = modal.getByTestId("new-password");
        const confirmPassword = modal.getByTestId("confirm-password");
        const save = modal.getByTestId("save-password-button");
        await expect.element(oldPassword).toHaveFocus();

        await newPassword.fill("this-is-sufficiently-secure");
        await confirmPassword.fill("this-is-sufficiently-secure");
        await save.click();
        await expect.element(modal.getByText("Your current password is required to set a new one")).toBeVisible();

        await oldPassword.fill("current-password");
        await save.click();
        await expect.element(save).toHaveTextContent("Saved");
        expect(passwordApi.lastRequest?.body).toMatchObject({password: [{oldPassword: "current-password", user_id: owner.id}]});
    });
});
