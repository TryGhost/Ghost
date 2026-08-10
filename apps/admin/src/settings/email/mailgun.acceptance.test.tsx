import {describe, expect, it} from "vitest";

import {fakeEditSettings, fakeSettingsScreens, renderAdminApp} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

describe("Mailgun settings", () => {
    it("saves the default region with the domain and private API key", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/newsletters");

        const section = settingsScreen.mailgun();
        await expect.element(section.getByText("Mailgun is not set up", {exact: true})).toBeVisible();
        await section.getByRole("button", {name: "Edit"}).click();
        await section.getByLabelText("Mailgun domain").fill("test.com");
        await section.getByLabelText("Mailgun private API key").fill("test-key");
        await section.getByRole("button", {name: "Save"}).click();

        await expect.element(section.getByText("Mailgun is set up", {exact: true})).toBeVisible();
        expect(settingsApi.requests).toEqual([
            {settings: [{key: "mailgun_base_url", value: "https://api.mailgun.net/v3"}]},
            {settings: [
                {key: "mailgun_domain", value: "test.com"},
                {key: "mailgun_api_key", value: "test-key"},
            ]},
        ]);
    });
});
