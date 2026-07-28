import {describe, expect, it} from "vitest";

import {
    configResponse,
    fakeAdminEndpoint,
    fakeEditSettings,
    fakeSettingsScreens,
    fakeTiers,
    renderAdminApp,
    settingsResponse,
    tier,
} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

function configWithPublicSiteAccessLimit() {
    const config = configResponse();
    config.config.hostSettings = {
        limits: {
            publicSiteAccess: {
                disabled: true,
                error: "This plan does not include public site access",
            },
        },
    };
    return config;
}

async function choose(selectTestId: string, option: string) {
    await settingsScreen.access().getByTestId(selectTestId).click();
    await settingsScreen.selectOptionExact(option).click();
}

describe("Access settings", () => {
    it("edits subscription, post, and commenting access", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");
        const section = settingsScreen.access();

        await expect.element(section.getByTestId("subscription-access-select")).toHaveTextContent("Public");
        await expect.element(section.getByTestId("default-post-access-select")).toHaveTextContent("Public");
        await expect.element(section.getByTestId("commenting-select")).toHaveTextContent("Nobody");

        await choose("subscription-access-select", "Invite-only");
        await choose("default-post-access-select", "Members only");
        await choose("commenting-select", "All members");
        await section.getByRole("button", {name: "Save"}).click();

        await expect.element(section.getByRole("button", {name: "Saved"})).toBeVisible();
        await expect(settingsApi).toHaveEditedSettings([
            {key: "default_content_visibility", value: "members"},
            {key: "members_signup_access", value: "invite"},
            {key: "comments_enabled", value: "all"},
        ]);
    });

    it("switches site visibility between public and private", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");
        const section = settingsScreen.access();

        await expect.element(section.getByTestId("site-visibility-select")).toHaveTextContent("Public");
        await choose("site-visibility-select", "Private");
        await section.getByTestId("site-access-code").fill("secret-access-code");
        await expect(section.getByText(/A private RSS feed is available/)).toHaveCount(0);
        await section.getByRole("button", {name: "Save"}).click();

        await expect(settingsApi).toHaveEditedSettings([
            {key: "is_private", value: true},
            {key: "password", value: "secret-access-code"},
        ]);
        await expect.element(section.getByText(/A private RSS feed is available/)).toBeVisible();

        await choose("site-visibility-select", "Public");
        await expect(section.getByTestId("site-access-code")).toHaveCount(0);
        await section.getByRole("button", {name: "Save"}).click();

        await expect(settingsApi).toHaveEditedSettings([{key: "is_private", value: false}]);
        await expect(section.getByText(/A private RSS feed is available/)).toHaveCount(0);
        expect(settingsApi.requests).toHaveLength(2);
    });

    it("regenerates a locked private-site access code server-side", async () => {
        fakeSettingsScreens();
        const settings = settingsResponse({settings: {is_private: true, password: "fake-123"}});
        for (const key of ["is_private", "password"]) {
            Object.assign(settings.settings.find(setting => setting.key === key)!, {is_read_only: true});
        }
        const regenerated = settingsResponse({settings: {is_private: true, password: "fake-456"}});
        const regenerateApi = fakeAdminEndpoint("POST", "/settings/access_code/regenerate/", regenerated);
        await renderAdminApp("/settings", {
            boot: {
                browseConfig: {response: configWithPublicSiteAccessLimit()},
                browseSettings: {response: settings},
            },
        });

        const accessCode = settingsScreen.access().getByTestId("site-access-code");
        await expect.element(accessCode).toHaveValue("fake-123");
        await settingsScreen.access().getByTestId("regenerate-access-code").click();

        await expect.element(accessCode).toHaveValue("fake-456");
        expect(regenerateApi.requests).toHaveLength(1);
        expect(regenerateApi.lastRequest?.body).toBeUndefined();
    });

    it("keeps dropdown options usable in pre-launch mode", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", {
            boot: {browseConfig: {response: configWithPublicSiteAccessLimit()}},
        });

        const section = settingsScreen.access();
        await expect.element(section.getByText("Pre-launch mode", {exact: true})).toBeVisible();
        await section.getByTestId("commenting-select").click();
        const option = settingsScreen.selectOption("Nobody");
        await expect.element(option).toBeVisible();

        const element = option.element();
        const rect = element.getBoundingClientRect();
        expect(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest("[role='option']")).toBe(element);
    });

    it("shows the default pre-launch banner copy when public site access is disabled", async () => {
        fakeSettingsScreens();
        const config = configResponse();
        config.config.hostSettings = {
            limits: {publicSiteAccess: {disabled: true}},
        };
        await renderAdminApp("/settings", {boot: {browseConfig: {response: config}}});

        const section = settingsScreen.access();
        await expect.element(section.getByText("Pre-launch mode", {exact: true})).toBeVisible();
        await expect.element(section.getByText(/During your free trial, a private access code is required/)).toBeVisible();
        await expect.element(section.getByRole("link", {name: "Upgrade now"})).toHaveAttribute("href", "#/pro/billing/plans");
    });

    it("uses configurable title, message, and link for the pre-launch banner", async () => {
        fakeSettingsScreens();
        const config = configResponse();
        config.config.hostSettings = {
            limits: {
                publicSiteAccess: {
                    disabled: true,
                    title: "Trial mode",
                    error: "Your site is private while you evaluate the platform.",
                    upgradeUrl: "https://billing.example.com/upgrade",
                },
            },
        };
        await renderAdminApp("/settings", {boot: {browseConfig: {response: config}}});

        const section = settingsScreen.access();
        await expect.element(section.getByText("Trial mode", {exact: true})).toBeVisible();
        await expect.element(section.getByText("Your site is private while you evaluate the platform.")).toBeVisible();
        await expect.element(section.getByRole("link", {name: "Upgrade now"})).toHaveAttribute("href", "https://billing.example.com/upgrade");
        await expect(section.getByText("Pre-launch mode", {exact: true})).toHaveCount(0);
    });

    it("disables dependent settings when signup is disabled", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        await choose("subscription-access-select", "Nobody");
        await settingsScreen.access().getByRole("button", {name: "Save"}).click();

        await expect.element(settingsScreen.access().getByRole("button", {name: "Saved"})).toBeVisible();
        await expect(settingsApi).toHaveEditedSettings([{key: "members_signup_access", value: "none"}]);
        await expect.element(settingsScreen.portal().getByRole("button", {name: "Customize"})).toBeDisabled();
        await expect.element(settingsScreen.enableNewsletters()).toHaveTextContent("which disables all newsletter sending");
    });

    it("selects specific active and archived tiers for new-post access", async () => {
        const basic = tier({id: "645453f4d254799990dd0e22", name: "Basic Supporter", active: true});
        const premium = tier({id: "645453f4d254799990dd0e23", name: "Ultimate Starlight Diamond Tier", active: false});
        fakeSettingsScreens();
        fakeTiers([basic, premium]);
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        await choose("default-post-access-select", "Specific tiers");
        await settingsScreen.access().getByTestId("tiers-select").click();
        await settingsScreen.selectOption(basic.name).click();
        await settingsScreen.selectOption(premium.name).click();
        await settingsScreen.access().getByRole("button", {name: "Save"}).click();

        await expect.element(settingsScreen.access().getByRole("button", {name: "Saved"})).toBeVisible();
        await expect(settingsApi).toHaveEditedSettings([
            {key: "default_content_visibility", value: "tiers"},
            {key: "default_content_visibility_tiers", value: JSON.stringify([basic.id, premium.id])},
        ]);
    });
});
