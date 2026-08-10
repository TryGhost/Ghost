import { describe, expect, it } from "vitest";

import { currentRoute, fakeAnalyticsOverview, fakeSettingsScreens, renderAdminApp } from "@test-utils/acceptance";
import { settingsScreen } from "./settings.screen";

// Settings navigations are real router pushes; these specs pin the history
// semantics the router swap introduced.
describe("Settings navigation history", () => {
    it("closes an open dialog with the browser back button", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        await settingsScreen.portal().getByRole("button", { name: "Customize" }).click();
        await expect.element(settingsScreen.portalModal()).toBeVisible();
        await expect.poll(currentRoute).toBe("/settings/portal/edit");

        window.history.back();

        await expect.poll(currentRoute).toBe("/settings");
        await expect.element(settingsScreen.portalModal()).not.toBeInTheDocument();
    });

    it("returns to settings with the back button after exiting", async () => {
        fakeSettingsScreens();
        fakeAnalyticsOverview();
        await renderAdminApp("/settings");

        await settingsScreen.exitButton().click();
        await expect.poll(currentRoute).toBe("/analytics");

        window.history.back();

        await expect.poll(currentRoute).toBe("/settings");
        await expect.element(settingsScreen.sidebar()).toBeVisible();
    });

    it("does not push a history entry when re-clicking the current section", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        await settingsScreen.navItem("Signup portal").click();
        await expect.poll(currentRoute).toBe("/settings/portal");
        const entriesAfterFirstClick = window.history.length;

        await settingsScreen.navItem("Signup portal").click();

        await expect.poll(currentRoute).toBe("/settings/portal");
        expect(window.history.length).toBe(entriesAfterFirstClick);
    });
});
