import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { currentRoute, fakeSettingsScreens, fakeTiers, renderAdminApp, settingsResponse, tier } from "@test-utils/acceptance";
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

    it("closes a modal dropdown with Escape without closing the modal", async () => {
        fakeSettingsScreens();
        fakeTiers([tier({name: "Supporter"})]);
        await renderAdminApp("/settings/portal/edit", {
            boot: {browseSettings: {response: settingsResponse({settings: {
                stripe_connect_publishable_key: "pk_test_123",
                stripe_connect_secret_key: "sk_test_123",
            }})}},
        });

        const modal = settingsScreen.portalModal();
        await expect.element(modal).toBeVisible();
        await modal.getByLabelText("Default price at signup").click();
        await expect.element(settingsScreen.selectOptionExact("Yearly")).toBeVisible();
        await userEvent.keyboard("{Escape}");

        await expect(settingsScreen.selectOptionExact("Yearly")).toHaveCount(0);
        await expect.element(modal).toBeVisible();
        await expect.poll(currentRoute).toBe("/settings/portal/edit");
    });
});
