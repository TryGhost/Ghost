import { describe, expect, it } from "vitest";

import { currentRoute, fakeAnalyticsOverview, fakeSettingsScreens, renderAdminApp } from "@test-utils/acceptance";
import { settingsScreen } from "./settings.screen";
import { fakeStaffWorld } from "./general/staff.test-helpers";

const flushEffects = () => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve)));
});

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

    it("confirms before the back button closes a dirty dialog", async () => {
        const {boot, currentUser} = fakeStaffWorld();
        await renderAdminApp("/settings", {boot});

        await settingsScreen.users().getByTestId("owner-user").click();
        const modal = settingsScreen.userDetailModal();
        await expect.element(modal).toBeVisible();
        await expect.poll(currentRoute).toBe(`/settings/staff/${currentUser.slug}`);
        await modal.getByLabelText("Location").fill("Somewhere new");
        // The dirty flag reaches the history blocker through passive effects
        // (dialog → global dirty state → guard re-render); let them flush.
        await flushEffects();

        window.history.back();

        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
        await settingsScreen.confirmationAction("Stay").click();
        await expect(settingsScreen.confirmationModal()).toHaveCount(0);
        await expect.element(modal).toBeVisible();
        await expect.poll(currentRoute).toBe(`/settings/staff/${currentUser.slug}`);

        window.history.back();

        await settingsScreen.confirmationAction("Leave").click();
        await expect.poll(currentRoute).toBe("/settings");
        await expect.element(modal).not.toBeInTheDocument();
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
