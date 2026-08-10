import { describe, expect, it } from "vitest";

import { fakeEditSettings, fakeSettingsScreens, renderAdminApp } from "@test-utils/acceptance";
import { settingsScreen } from "@/settings/settings.screen";

describe("Title and description settings", () => {
    it("edits the title and description", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        const section = settingsScreen.titleAndDescription();
        await expect.element(section.getByText("Test Site", { exact: true })).toBeVisible();
        await expect.element(section.getByText("Thoughts, stories and ideas.", { exact: true })).toBeVisible();

        await section.getByRole("button", { name: "Edit" }).click();
        await section.getByLabelText("Site title").fill("New Site Title");
        await section.getByLabelText("Site description").fill("New Site Description");
        await section.getByRole("button", { name: "Save" }).click();

        await expect(section.getByLabelText("Site title")).toHaveCount(0);
        await expect.element(section.getByText("New Site Title", { exact: true })).toBeVisible();
        await expect.element(section.getByText("New Site Description", { exact: true })).toBeVisible();
        await expect(settingsApi).toHaveEditedSettings([
            { key: "title", value: "New Site Title" },
            { key: "description", value: "New Site Description" },
        ]);
    });

    it("validates the title without saving", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        const section = settingsScreen.titleAndDescription();
        await section.getByRole("button", { name: "Edit" }).click();

        await section.getByLabelText("Site title").fill("");
        await section.getByRole("button", { name: "Save" }).click();
        await expect.element(section.getByText("Please enter a site title.")).toBeVisible();

        await section.getByLabelText("Site title").fill("ab");
        await section.getByRole("button", { name: "Save" }).click();
        await expect.element(section.getByText("Please use a site title longer than 3 characters.")).toBeVisible();
        expect(settingsApi.requests).toHaveLength(0);
    });

    it("restores the title and description on cancel", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        const section = settingsScreen.titleAndDescription();
        await section.getByRole("button", { name: "Edit" }).click();
        await section.getByLabelText("Site title").fill("Discarded title");
        await section.getByLabelText("Site description").fill("Discarded description");
        await section.getByRole("button", { name: "Cancel" }).click();

        await expect.element(section.getByText("Test Site", { exact: true })).toBeVisible();
        await expect.element(section.getByText("Thoughts, stories and ideas.", { exact: true })).toBeVisible();
    });
});
