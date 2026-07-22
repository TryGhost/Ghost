import {describe, expect, it} from "vitest";

import {configResponse, fakeAdminEndpoint, fakeEditSettings, fakeSettingsScreens, renderAdminApp, settingsResponse} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

type AnalyticsSetting = {key: string; value: boolean; is_read_only?: boolean};

function analyticsSettings(overrides: AnalyticsSetting[] = []) {
    const response = settingsResponse();
    const byKey = new Map(overrides.map(setting => [setting.key, setting]));
    const existingKeys = new Set(response.settings.map(setting => setting.key));
    return {
        ...response,
        settings: [
            ...response.settings.map(setting => byKey.get(setting.key) ?? setting),
            ...overrides.filter(setting => !existingKeys.has(setting.key)),
        ],
    };
}

function analyticsConfig({limited = false}: {limited?: boolean} = {}) {
    const response = configResponse();
    if (limited) {
        response.config.hostSettings = {
            limits: {
                limitAnalytics: {
                    disabled: true,
                    error: "Your current plan doesn't support web analytics.",
                    errorCode: "HOST_LIMIT_REACHED",
                },
            },
        };
    }
    return response;
}

describe("Analytics settings", () => {
    it("saves all analytics collection choices in one exact request", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings", {boot: {browseSettings: {response: analyticsSettings([
            {key: "web_analytics", value: true},
            {key: "web_analytics_configured", value: true},
        ])}}});

        const section = settingsScreen.analytics();
        for (const label of ["Web analytics", "Email opens", "Email clicks", "Member sources", "Outbound link tagging"]) {
            await expect.element(section.getByLabelText(label)).toBeChecked();
            await section.getByLabelText(label).click();
        }
        await section.getByRole("button", {name: "Save"}).click();

        await expect(settingsApi).toHaveEditedSettings([
            {key: "web_analytics", value: false},
            {key: "email_track_opens", value: false},
            {key: "email_track_clicks", value: false},
            {key: "members_track_sources", value: false},
            {key: "outbound_link_tagging", value: false},
        ]);
    });

    it("honors a read-only email-click tracking setting", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", {boot: {browseSettings: {response: analyticsSettings([
            {key: "email_track_clicks", value: false, is_read_only: true},
        ])}}});

        const toggle = settingsScreen.analytics().getByLabelText("Email clicks");
        await expect.element(toggle).not.toBeChecked();
        await expect.element(toggle).toBeDisabled();
    });

    it("explains unavailable web analytics and prevents edits when Tinybird is not configured", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", {boot: {browseSettings: {response: analyticsSettings([
            {key: "web_analytics", value: true},
            {key: "web_analytics_configured", value: false},
        ])}}});

        const section = settingsScreen.analytics();
        const toggle = section.getByLabelText("Web analytics");
        await expect.element(toggle).not.toBeChecked();
        await expect.element(toggle).toBeDisabled();
        await expect.element(section.getByText(/Web analytics in Ghost is powered by.*Tinybird.*requires configuration/)).toBeVisible();
        await expect(section.getByRole("button", {name: "Save"})).toHaveCount(0);
    });

    it("enables configured web analytics and renders the normal section separator", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings", {boot: {browseSettings: {response: analyticsSettings([
            {key: "web_analytics", value: false},
            {key: "web_analytics_configured", value: true},
        ])}}});

        const section = settingsScreen.analytics();
        const toggle = section.getByLabelText("Web analytics");
        await expect.element(toggle).toBeEnabled();
        await expect.element(toggle).not.toBeChecked();
        expect(section.element().querySelector('[data-orientation="horizontal"]')).not.toBeNull();
        await expect(section.getByText(/requires configuration/)).toHaveCount(0);
        await toggle.click();
        await section.getByRole("button", {name: "Save"}).click();

        await expect(settingsApi).toHaveEditedSettings([{key: "web_analytics", value: true}]);
    });

    it("shows the plan upgrade path when web analytics is limited", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", {boot: {
            browseConfig: {response: analyticsConfig({limited: true})},
            browseSettings: {response: analyticsSettings([
                {key: "web_analytics", value: false},
                {key: "web_analytics_configured", value: true},
            ])},
        }});

        const section = settingsScreen.analytics();
        await expect.element(section.getByLabelText("Web analytics")).toBeDisabled();
        await expect.element(section.getByText(/available on the Publisher plan and above/)).toBeVisible();
        await expect(section.getByText(/requires configuration/)).toHaveCount(0);
        await section.getByText("Upgrade now →", {exact: true}).click();
        expect(JSON.parse(document.body.dataset.externalNavigate!)).toMatchObject({route: "/pro"});
    });

    it("disables the post analytics export while downloading from the expected endpoint", async () => {
        fakeSettingsScreens();
        let finishExport!: () => void;
        const exportApi = fakeAdminEndpoint("GET", "/posts/export/?limit=1000", () => new Promise<object>((resolve) => {
            finishExport = () => resolve({});
        }));
        await renderAdminApp("/settings");

        const migrationTools = settingsScreen.section("migrationtools");
        await migrationTools.getByRole("tab", {name: "Export"}).click();
        const button = migrationTools.getByTestId("post-analytics-export-button");
        await button.click();

        expect(exportApi.requests).toHaveLength(1);
        await expect.element(button).toBeDisabled();
        await expect.element(button).toHaveTextContent("Loading...");

        finishExport();

        await expect.element(button).toBeEnabled();
        expect(exportApi.lastRequest?.url).toContain("/posts/export/?limit=1000");
    });
});
