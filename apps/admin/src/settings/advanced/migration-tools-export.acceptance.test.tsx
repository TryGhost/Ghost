import {describe, expect, it} from "vitest";
import {page} from "vitest/browser";

import {configResponse, fakeAdminEndpoint, fakeSettingsScreens, renderAdminApp} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

async function openExportTab() {
    const section = settingsScreen.section("migrationtools");
    await section.getByRole("tab", {name: "Export"}).click();
    return section;
}

/** A minimal but valid (empty) zip: just the end-of-central-directory record. */
function emptyZip(): ArrayBuffer {
    const bytes = new Uint8Array(22);
    bytes.set([0x50, 0x4b, 0x05, 0x06]);
    return bytes.buffer;
}

function fakeExportDownload() {
    return fakeAdminEndpoint("GET", /^\/exports\/download\//, emptyZip(), {contentType: "application/zip"});
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

    it("offers the sync export dialog without media and downloads the zip", async () => {
        fakeSettingsScreens();
        const download = fakeExportDownload();
        await renderAdminApp("/settings/advanced", {labs: {selfServeArchives: true}});

        const section = await openExportTab();
        await section.getByRole("button", {name: "Export data"}).click();

        const dialog = page.getByRole("dialog");
        await expect.element(dialog.getByText("downloaded as a single zip", {exact: false})).toBeVisible();
        await expect.element(dialog.getByText("Members", {exact: true})).toBeVisible();
        await expect.element(dialog.getByText("Media files", {exact: true})).not.toBeInTheDocument();

        await dialog.getByRole("button", {name: "Export", exact: true}).click();

        // The dialog reaches a real done state once the download completes
        await expect.element(dialog.getByText("Export complete", {exact: false})).toBeVisible();
        expect(download.lastRequest?.url).toContain("/exports/download/?components=content,members,analytics,themes,routes");
    });

    it("only requests the selected components", async () => {
        fakeSettingsScreens();
        const download = fakeExportDownload();
        await renderAdminApp("/settings/advanced", {labs: {selfServeArchives: true}});

        const section = await openExportTab();
        await section.getByRole("button", {name: "Export data"}).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("checkbox", {name: "Members"}).click();
        await dialog.getByRole("button", {name: "Export", exact: true}).click();

        await expect.element(dialog.getByText("Export complete", {exact: false})).toBeVisible();
        expect(download.lastRequest?.url).toContain("/exports/download/?components=content,analytics,themes,routes");
    });

    it("returns to the selection and surfaces the error when the download fails", async () => {
        fakeSettingsScreens();
        fakeAdminEndpoint("GET", /^\/exports\/download\//, {errors: [{message: "Boom"}]}, {status: 500});
        await renderAdminApp("/settings/advanced", {labs: {selfServeArchives: true}});

        const section = await openExportTab();
        await section.getByRole("button", {name: "Export data"}).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", {name: "Export", exact: true}).click();

        // The error is surfaced, and we're back on the selection for a retry
        await expect.element(page.getByText("Something went wrong, please try again.")).toBeVisible();
        await expect.element(dialog.getByRole("button", {name: "Export", exact: true})).toBeVisible();
        await expect.element(dialog.getByText("Export complete", {exact: false})).not.toBeInTheDocument();
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
