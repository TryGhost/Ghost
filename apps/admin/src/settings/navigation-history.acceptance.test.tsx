import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

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

    it("confirms before leaving a dirty direct-load dialog with the forward button", async () => {
        const {boot, currentUser} = fakeStaffWorld();
        await renderAdminApp(`/settings/staff/${currentUser.slug}`, {boot});

        const modal = settingsScreen.userDetailModal();
        await modal.getByRole("button", { name: "Close" }).click();
        await expect.poll(currentRoute).toBe("/settings/staff");

        window.history.back();
        await expect.poll(currentRoute).toBe(`/settings/staff/${currentUser.slug}`);
        await modal.getByLabelText("Location").fill("Somewhere new");
        await flushEffects();

        window.history.forward();

        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
        await settingsScreen.confirmationAction("Stay").click();
        await expect.poll(currentRoute).toBe(`/settings/staff/${currentUser.slug}`);
        await expect.element(modal).toBeVisible();

        window.history.forward();

        await settingsScreen.confirmationAction("Leave").click();
        await expect.poll(currentRoute).toBe("/settings/staff");
    });

    it("confirms before the back button closes a dirty dialog when settings was entered from the sidebar", async () => {
        const {boot} = fakeStaffWorld();
        await renderAdminApp("/site", {boot});

        await page.getByRole("link", { name: "Settings" }).click();
        await expect.element(settingsScreen.users()).toBeVisible();
        await settingsScreen.users().getByTestId("owner-user").click();
        const modal = settingsScreen.userDetailModal();
        await expect.element(modal).toBeVisible();
        await modal.getByLabelText("Location").fill("Somewhere new");
        await flushEffects();

        window.history.back();

        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
        await settingsScreen.confirmationAction("Leave").click();
        await expect.poll(currentRoute).toBe("/settings");
        await expect.element(modal).not.toBeInTheDocument();
    });

    it("does not prompt when the back button only switches a dirty dialog's tab", async () => {
        const {boot, currentUser} = fakeStaffWorld();
        await renderAdminApp(`/settings/staff/${currentUser.slug}`, {boot});

        const modal = settingsScreen.userDetailModal();
        await modal.getByLabelText("Location").fill("Somewhere new");
        await modal.getByRole("tab", { name: "Social Links" }).click();
        await expect.poll(currentRoute).toBe(`/settings/staff/${currentUser.slug}/social-links`);
        await flushEffects();

        window.history.back();

        await expect.poll(currentRoute).toBe(`/settings/staff/${currentUser.slug}`);
        await expect(settingsScreen.confirmationModal()).toHaveCount(0);
        await expect.element(modal).toBeVisible();
        await modal.getByRole("tab", { name: "Profile" }).click();
        await expect.element(modal.getByLabelText("Location")).toHaveValue("Somewhere new");
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
