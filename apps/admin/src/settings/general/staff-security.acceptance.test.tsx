import {describe, expect, it} from "vitest";

import {configResponse, fakeEditSettings, renderAdminApp, settingsResponse} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";
import {fakeStaffWorld, user} from "./staff.test-helpers";

describe("Staff security settings", () => {
    it.each(["Owner", "Administrator"] as const)("shows email 2FA controls to %ss", async (roleName) => {
        const currentUser = user(roleName);
        const {boot} = fakeStaffWorld({currentUser});
        await renderAdminApp("/settings/staff", {boot});

        const section = settingsScreen.users();
        await expect.element(section.getByText("Security settings", {exact: true})).toBeVisible();
        await expect.element(section.getByText("Require email 2FA codes to be used on all staff logins")).toBeVisible();
        await expect.element(section.getByRole("switch")).toBeVisible();
    });

    it("does not show email 2FA controls to Editors", async () => {
        const currentUser = user("Editor");
        const {boot} = fakeStaffWorld({currentUser});
        await renderAdminApp("/settings/staff", {boot});

        await expect(settingsScreen.users().getByText("Security settings", {exact: true})).toHaveCount(0);
    });

    it("saves the email 2FA requirement", async () => {
        const {boot} = fakeStaffWorld();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/staff", {
            boot: {
                ...boot,
                browseConfig: {response: configResponse()},
                browseSettings: {response: settingsResponse({settings: {require_email_mfa: false}})},
            },
        });

        const toggle = settingsScreen.users().getByRole("switch");
        await expect.element(toggle).not.toBeChecked();
        await toggle.click();

        await expect(settingsApi).toHaveEditedSettings([{key: "require_email_mfa", value: true}]);
        await expect.element(toggle).toBeChecked();
    });
});
