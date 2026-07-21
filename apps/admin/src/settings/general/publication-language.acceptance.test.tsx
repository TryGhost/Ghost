import { describe, expect, it } from "vitest";

import { fakeEditSettings, fakeSettingsScreens, renderAdminApp, settingsResponse } from "@test-utils/acceptance";
import { settingsScreen } from "@/settings/settings.screen";

describe("Publication language settings", () => {
    it("selects a language from the dropdown", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        const select = settingsScreen.localeSelect();
        await expect.element(select).toHaveTextContent("English (en)");
        await select.click();
        await settingsScreen.selectOption("French (fr)").click();
        await settingsScreen.publicationLanguage().getByRole("button", { name: "Save" }).click();

        await expect.element(select).toHaveTextContent("French (fr)");
        await expect(settingsApi).toHaveEditedSettings([{ key: "locale", value: "fr" }]);
    });

    it("enters a custom locale via the Other option", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        await settingsScreen.localeSelect().click();
        await settingsScreen.selectOption("Other").click();
        await settingsScreen.publicationLanguage().getByLabelText("Site language").fill("en-GB");
        await settingsScreen.publicationLanguage().getByRole("button", { name: "Save" }).click();

        await expect(settingsApi).toHaveEditedSettings([{ key: "locale", value: "en-GB" }]);
    });

    it("shows a validation error for an invalid custom locale", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        await settingsScreen.localeSelect().click();
        await settingsScreen.selectOption("Other").click();
        await settingsScreen.publicationLanguage().getByLabelText("Site language").fill("invalid--locale");
        await settingsScreen.publicationLanguage().getByRole("button", { name: "Save" }).click();

        await expect.element(settingsScreen.publicationLanguage().getByText("Invalid locale format")).toBeVisible();
        expect(settingsApi.requests).toHaveLength(0);
    });

    it("switches back from a custom input to the dropdown", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        await settingsScreen.localeSelect().click();
        await settingsScreen.selectOption("Other").click();
        await settingsScreen.publicationLanguage().getByRole("button", { name: "Choose from list" }).click();

        await expect.element(settingsScreen.localeSelect()).toBeVisible();
        await expect.element(settingsScreen.localeSelect()).toHaveTextContent("English (en)");
    });

    it("restores the language dropdown when cancelling Other", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        await settingsScreen.localeSelect().click();
        await settingsScreen.selectOption("Other").click();
        await settingsScreen.publicationLanguage().getByRole("button", { name: "Cancel" }).click();

        await expect.element(settingsScreen.localeSelect()).toBeVisible();
        await expect.element(settingsScreen.localeSelect()).toHaveTextContent("English (en)");
    });

    it("displays a stored custom locale", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", {
            boot: { browseSettings: { response: settingsResponse({ settings: { locale: "cy" } }) } },
        });

        await expect.element(settingsScreen.publicationLanguage().getByLabelText("Site language")).toHaveValue("cy");
    });

    it("clears validation when cancelling changes to a stored custom locale", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", {
            boot: { browseSettings: { response: settingsResponse({ settings: { locale: "cy" } }) } },
        });

        const section = settingsScreen.publicationLanguage();
        const language = section.getByLabelText("Site language");
        await language.fill("invalid--locale");
        await expect.element(section.getByText("Invalid locale format")).toBeVisible();
        await section.getByRole("button", { name: "Cancel" }).click();

        await expect.element(language).toHaveValue("cy");
        await expect(section.getByText("Invalid locale format")).toHaveCount(0);
        await expect.element(section.getByText("Enter a custom locale code.")).toBeVisible();
    });
});
