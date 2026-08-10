import {describe, expect, it} from "vitest";

import {configResponse, fakeSettingsScreens, renderAdminApp} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

describe("Membership settings", () => {
    it("shows the legacy welcome-email section and navigation when automations are off", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        await expect.element(settingsScreen.memberEmails()).toBeVisible();
        await expect.element(settingsScreen.navItem("Welcome emails")).toBeVisible();
    });

    it("hides the legacy welcome-email section and navigation when automations are on", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", {boot: {
            browseConfig: {response: configResponse({labs: {automations: true}})},
        }});

        await expect(settingsScreen.memberEmails()).toHaveCount(0);
        await expect(settingsScreen.navItem("Welcome emails")).toHaveCount(0);
    });
});
