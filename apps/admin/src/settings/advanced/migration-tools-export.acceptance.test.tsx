import {describe, expect, it} from "vitest";
import {page} from "vitest/browser";

import {configResponse, fakeSettingsScreens, renderAdminApp} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

async function openExportTab() {
    const section = settingsScreen.section("migrationtools");
    await section.getByRole("tab", {name: "Export"}).click();
    return section;
}

describe("Migration tools export", () => {
    it("keeps the individual export buttons without the selfServeArchives flag", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings/advanced");

        const section = await openExportTab();
        await expect.element(section.getByRole("button", {name: "Content & settings"})).toBeVisible();
        await expect.element(section.getByRole("button", {name: "Post analytics"})).toBeVisible();
        await expect.element(section.getByRole("button", {name: "Export data"})).not.toBeInTheDocument();
    });

    it("offers the sync export dialog without media when no archive host is configured", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings/advanced", {labs: {selfServeArchives: true}});

        const section = await openExportTab();
        await section.getByRole("button", {name: "Export data"}).click();

        const dialog = page.getByRole("dialog");
        await expect.element(dialog.getByText("downloaded as a single zip", {exact: false})).toBeVisible();
        await expect.element(dialog.getByText("Members", {exact: true})).toBeVisible();
        await expect.element(dialog.getByText("Media files", {exact: true})).not.toBeInTheDocument();

        await dialog.getByRole("button", {name: "Export", exact: true}).click();
        await expect.element(dialog.getByText("Preparing your export", {exact: false})).toBeVisible();
    });

    it("offers media and email delivery when an archive host is configured", async () => {
        fakeSettingsScreens();
        const config = configResponse({labs: {selfServeArchives: true}});
        (config.config as {hostSettings?: object}).hostSettings = {
            ...(config.config as {hostSettings?: object}).hostSettings,
            export: {generate_archive_url: "https://archives.example.com/generate"},
        };
        await renderAdminApp("/settings/advanced", {
            labs: {selfServeArchives: true},
            boot: {browseConfig: {response: config}},
        });

        const section = await openExportTab();
        await section.getByRole("button", {name: "Export data"}).click();

        const dialog = page.getByRole("dialog");
        await expect.element(dialog.getByText("sent to you by email", {exact: false})).toBeVisible();
        await expect.element(dialog.getByText("Media files", {exact: true})).toBeVisible();

        await dialog.getByRole("button", {name: "Export", exact: true}).click();
        await expect.element(dialog.getByText("Exporting data", {exact: false})).toBeVisible();
    });
});
