import {describe, expect, it} from "vitest";

import {
    fakeAdminEndpoint,
    fakeEditSettings,
    fakeSettingsScreens,
    fakeTiers,
    renderAdminApp,
    settingsResponse,
    tier,
} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

const freeTier = tier({
    id: "645453f4d254799990dd0e21",
    name: "Free",
    slug: "free",
    type: "free",
});

async function openPortal() {
    await settingsScreen.portal().getByRole("button", {name: "Customize"}).click();
    await expect.element(settingsScreen.portalModal()).toBeVisible();
    return settingsScreen.portalModal();
}

describe("Portal settings", () => {
    it("saves signup display and free-tier options", async () => {
        fakeSettingsScreens();
        fakeTiers([freeTier]);
        const tierApi = fakeAdminEndpoint("PUT", `/tiers/${freeTier.id}/`, ({body}) => body);
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        const modal = await openPortal();
        const displayName = modal.getByLabelText("Display name in signup form");
        const freeTierCheckbox = modal.getByTestId("free-tier-checkbox");
        await expect.element(displayName).toBeChecked();
        await expect.element(freeTierCheckbox).toBeChecked();
        await displayName.click();
        await freeTierCheckbox.click();
        await modal.getByRole("button", {name: "Save"}).click();

        await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();
        expect(tierApi.lastRequest?.body).toMatchObject({tiers: [{id: freeTier.id, visibility: "none"}]});
        await expect(settingsApi).toHaveEditedSettings([
            {key: "portal_name", value: false},
            {key: "portal_plans", value: "[\"monthly\",\"yearly\"]"},
        ]);
    });

    it("shows the free tier option when Stripe is disconnected", async () => {
        fakeSettingsScreens();
        fakeTiers([freeTier]);
        await renderAdminApp("/settings");

        const modal = await openPortal();
        const freeTierCheckbox = modal.getByTestId("free-tier-checkbox");
        await expect.element(freeTierCheckbox).toBeVisible();
        await expect.element(freeTierCheckbox).toBeChecked();
        await expect.element(modal.getByText("Free", {exact: true})).toBeVisible();
    });

    it("hides the free-tier option for paid-only signup", async () => {
        fakeSettingsScreens();
        fakeTiers([freeTier]);
        const settings = settingsResponse({settings: {members_signup_access: "paid"}});
        await renderAdminApp("/settings", {boot: {browseSettings: {response: settings}}});

        const modal = await openPortal();
        await expect(modal.getByTestId("free-tier-checkbox")).toHaveCount(0);
    });

    it("saves Look & Feel settings", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        const modal = await openPortal();
        await modal.getByRole("tab", {name: "Look & feel"}).click();
        await modal.getByRole("textbox").fill("become a member of something epic");
        await modal.getByRole("switch").click();
        await modal.getByRole("button", {name: "Save"}).click();

        await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();
        await expect(settingsApi).toHaveEditedSettings([
            {key: "portal_button", value: false},
            {key: "portal_button_signup_text", value: "become a member of something epic"},
        ]);
    });

    it("validates and saves the support email address", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        const modal = await openPortal();
        await modal.getByRole("tab", {name: "Account page"}).last().click();
        const supportEmail = modal.getByLabelText("Support email address");
        await supportEmail.fill("not-an-email");
        supportEmail.element().blur();
        await expect.element(modal.getByText("Enter a valid email address")).toBeVisible();

        await supportEmail.fill("hello@world.com");
        supportEmail.element().blur();
        await modal.getByRole("button", {name: "Save"}).click();

        await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();
        await expect(settingsApi).toHaveEditedSettings([{key: "members_support_address", value: "hello@world.com"}]);
    });
});
