import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { currentRoute, fakeSettingsScreens, renderAdminApp } from "@test-utils/acceptance";
import { settingsScreen } from "./settings.screen";

describe("Settings layout", () => {
    it("leaves immediately when the page is clean", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        await settingsScreen.exitButton().click();

        await expect.poll(currentRoute).toBe("/");
        await expect(settingsScreen.confirmationModal()).toHaveCount(0);
    });

    it("can stay on or leave a dirty page from the confirmation", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        await settingsScreen.editTitle("New Site Title");
        await settingsScreen.exitButton().click();

        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
        await settingsScreen.confirmationAction("Stay").click();
        await expect.poll(currentRoute).toBe("/settings");
        await expect(settingsScreen.confirmationModal()).toHaveCount(0);

        await settingsScreen.exitButton().click();
        await settingsScreen.confirmationAction("Leave").click();
        await expect.poll(currentRoute).toBe("/");
    });

    it("confirms before leaving a dirty page with Escape", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        await settingsScreen.editTitle("New Site Title");
        // Opening once synchronizes the page-level dirty-state effect; Stay
        // preserves that dirty state for the Escape path under test.
        await settingsScreen.exitButton().click();
        await settingsScreen.confirmationAction("Stay").click();
        await expect(settingsScreen.confirmationModal()).toHaveCount(0);
        await userEvent.keyboard("{Escape}");

        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
        await expect.poll(currentRoute).toBe("/settings");
    });

    it("does not leave settings when Escape is pressed with a modal open", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings/portal/edit");

        await expect.element(settingsScreen.portalModal()).toBeVisible();
        await userEvent.keyboard("{Escape}");

        await expect.element(settingsScreen.portalModal()).toBeVisible();
        await expect.poll(currentRoute).toBe("/settings/portal/edit");
    });
});
