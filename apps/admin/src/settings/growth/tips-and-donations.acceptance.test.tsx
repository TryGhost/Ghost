import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { fakeEditSettings, fakeSettingsScreens, renderAdminApp, settingsResponse, type RenderAdminAppOptions } from "@test-utils/acceptance";
import { settingsScreen } from "@/settings/settings.screen";

function withStripe(): RenderAdminAppOptions {
    return {
        boot: {
            browseSettings: {
                response: settingsResponse({
                    settings: {
                        donations_enabled: true,
                        stripe_connect_publishable_key: "pk_test_123",
                        stripe_connect_secret_key: "sk_test_123",
                        stripe_connect_display_name: "Dummy",
                        stripe_connect_account_id: "acct_123",
                    },
                }),
            },
        },
    };
}

describe("Tips and donations settings", () => {
    it("is hidden when Stripe is disabled", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        await expect(settingsScreen.tipsAndDonations()).toHaveCount(0);
        await expect(settingsScreen.navItem("Tips & donations")).toHaveCount(0);
    });

    it("shows the suggested amount and shareable link when Stripe is enabled", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", withStripe());

        const section = settingsScreen.tipsAndDonations();
        await expect.element(section).toBeVisible();
        await expect.element(settingsScreen.suggestedAmount()).toHaveValue("5");
        await expect.element(section.getByRole("combobox")).toBeVisible();
        await expect.element(settingsScreen.donateUrl()).toHaveTextContent("http://test.com/#/portal/support");
        await expect.element(settingsScreen.previewShareableLink()).not.toBeVisible();
        await expect.element(settingsScreen.copyShareableLink()).not.toBeVisible();

        await userEvent.hover(settingsScreen.donateUrl().element());

        await expect.element(settingsScreen.previewShareableLink()).toBeVisible();
        await expect.element(settingsScreen.copyShareableLink()).toBeVisible();
    });

    it("saves an updated suggested amount", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings", withStripe());

        const section = settingsScreen.tipsAndDonations();
        await settingsScreen.suggestedAmount().fill("7.25");
        await section.getByRole("button", { name: "Save" }).click();

        await expect(settingsApi).toHaveEditedSettings([{ key: "donations_suggested_amount", value: "725" }]);
    });

    it("blocks suggested amounts above Stripe's maximum", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings", withStripe());

        const section = settingsScreen.tipsAndDonations();
        const amount = settingsScreen.suggestedAmount();
        await amount.fill("10000.01");
        await userEvent.tab();
        await section.getByRole("button", { name: "Save" }).click();

        await expect.element(section).toHaveTextContent("Suggested amount cannot be more than $10000.");
        expect(settingsApi.requests).toHaveLength(0);
    });
});
