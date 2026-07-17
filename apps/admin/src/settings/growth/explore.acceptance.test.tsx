import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import {
    configResponse,
    fakeEditSettings,
    fakeEndpoint,
    fakeSettingsScreens,
    renderAdminApp,
    settingsResponse,
    siteResponse,
} from "@test-utils/acceptance";
import { settingsScreen } from "@/settings/settings.screen";

describe("Ghost Explore settings", () => {
    it("can join Ghost Explore", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings", {
            boot: { browseSettings: { response: settingsResponse({ settings: { explore_ping: false, explore_ping_growth: false } }) } },
        });

        await expect.element(settingsScreen.explore()).toBeVisible();
        await expect.element(settingsScreen.exploreToggle()).not.toBeChecked();
        await settingsScreen.exploreToggle().click();

        await expect(settingsApi).toHaveEditedSettings([{ key: "explore_ping", value: true }]);
    });

    it("can share growth data with Ghost Explore", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings", {
            boot: { browseSettings: { response: settingsResponse({ settings: { explore_ping: true, explore_ping_growth: false } }) } },
        });

        await expect.element(settingsScreen.exploreToggle()).toBeChecked();
        await expect.element(settingsScreen.exploreGrowthToggle()).not.toBeChecked();
        await settingsScreen.exploreGrowthToggle().click();

        await expect(settingsApi).toHaveEditedSettings([{ key: "explore_ping_growth", value: true }]);
    });

    it("renders a preview with the member count", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", {
            boot: {
                browseSettings: { response: settingsResponse({ settings: { explore_ping: true, explore_ping_growth: true } }) },
                browseMembersCount: {
                    response: {
                        members: [],
                        meta: { pagination: { page: 1, limit: 1, pages: 1000, total: 1000, next: 2, prev: null } },
                    },
                },
            },
        });

        const preview = settingsScreen.explorePreview();
        await expect.element(preview).toBeVisible();
        await expect.element(preview.getByText("Test Site")).toBeVisible();
        await expect.element(preview.getByText("Thoughts, stories and ideas.")).toBeVisible();
        await expect.element(preview.getByText("test.com")).toBeVisible();
        await expect.element(preview.getByText("1k members")).toBeVisible();
    });

    it("can send a testimonial", async () => {
        const testimonialUrl = "https://mocked.com/api/testimonials";
        const config = configResponse();
        config.config.exploreTestimonialsUrl = testimonialUrl;
        const site = siteResponse();
        site.site.site_uuid = "9a604cf9-4c27-4a05-9991-be9974a764c5";

        fakeSettingsScreens();
        const testimonialApi = fakeEndpoint("POST", testimonialUrl, { status: "success" });
        await renderAdminApp("/settings", {
            boot: {
                browseConfig: { response: config },
                browseSettings: { response: settingsResponse({ settings: { explore_ping: true, explore_ping_growth: true } }) },
                browseSite: { response: site },
            },
        });

        await settingsScreen.explore().getByText("Send testimonial").click();

        const modal = settingsScreen.testimonialsModal();
        await expect.element(modal).toBeVisible();
        await expect.element(modal.getByText("By Owner User")).toBeVisible();
        await expect.element(modal.getByText("Owner — Test Site")).toBeVisible();

        const submitButton = modal.getByRole("button", { name: "Send testimonial" });
        await submitButton.click();
        await expect.element(modal.getByText("This field is required")).toBeVisible();

        await settingsScreen.testimonialContent().fill("I love Ghost!");
        await settingsScreen.migratedFromSelect().click();
        await page.getByRole("option", { name: "WordPress" }).click();
        await submitButton.click();

        await expect.element(page.getByText("Thank you for your testimonial!")).toBeVisible();
        await expect.poll(() => testimonialApi.lastRequest?.body).toEqual({
            ghost_uuid: "9a604cf9-4c27-4a05-9991-be9974a764c5",
            staff_user_email: "owner@test.com",
            content: "I love Ghost!",
            prev_platform: "wordpress",
        });
    });
});
