import {describe, expect, it} from "vitest";
import {page, userEvent} from "vitest/browser";

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

async function renderWithArchiveHost() {
    const config = configResponse({labs: {selfServeArchives: true}});
    (config.config as {hostSettings?: object}).hostSettings = {
        ...(config.config as {hostSettings?: object}).hostSettings,
        export: {webhookUrl: "https://archives.example.com/generate"},
    };
    await renderAdminApp("/settings/advanced", {
        labs: {selfServeArchives: true},
        boot: {browseConfig: {response: config}},
    });
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
        const exportsApi = fakeAdminEndpoint("POST", "/exports/", {}, {status: 202});
        await renderWithArchiveHost();

        const section = await openExportTab();
        await section.getByRole("button", {name: "Export data"}).click();

        const dialog = page.getByRole("dialog");
        await expect.element(dialog.getByText("sent to you by email", {exact: false})).toBeVisible();
        await expect.element(dialog.getByText("Media files", {exact: true})).toBeVisible();

        await dialog.getByRole("button", {name: "Export", exact: true}).click();
        await expect.element(dialog.getByText("Exporting data", {exact: false})).toBeVisible();

        // The default selection: everything except media
        await expect.poll(() => exportsApi.lastRequest?.body).toEqual({
            components: {
                content: true,
                members: true,
                analytics: true,
                themes: true,
                routes: true,
                media: false,
            },
        });
    });

    it("keeps the dialog open while the export request is in flight", async () => {
        fakeSettingsScreens();
        let releaseRequest!: () => void;
        const gate = new Promise<void>((resolve) => {
            releaseRequest = resolve;
        });
        fakeAdminEndpoint("POST", "/exports/", async () => {
            await gate;
            return {};
        }, {status: 202});
        await renderWithArchiveHost();

        const section = await openExportTab();
        await section.getByRole("button", {name: "Export data"}).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", {name: "Export", exact: true}).click();

        // Non-idempotent request: the dialog must not be dismissible while pending
        await expect.element(dialog.getByRole("button", {name: "Cancel"})).toBeDisabled();
        await userEvent.keyboard("{Escape}");
        await expect.element(dialog.getByText("sent to you by email", {exact: false})).toBeVisible();

        releaseRequest();
        await expect.element(dialog.getByText("Exporting data", {exact: false})).toBeVisible();
    });

    it("sends the selected components to the exports endpoint", async () => {
        fakeSettingsScreens();
        const exportsApi = fakeAdminEndpoint("POST", "/exports/", {}, {status: 202});
        await renderWithArchiveHost();

        const section = await openExportTab();
        await section.getByRole("button", {name: "Export data"}).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByText("Post analytics", {exact: true}).click();
        await dialog.getByText("Media files", {exact: true}).click();

        await dialog.getByRole("button", {name: "Export", exact: true}).click();
        await expect.element(dialog.getByText("Exporting data", {exact: false})).toBeVisible();

        await expect.poll(() => exportsApi.lastRequest?.body).toEqual({
            components: {
                content: true,
                members: true,
                analytics: false,
                themes: true,
                routes: true,
                media: true,
            },
        });
    });

    it("stays on the selection and surfaces an error when the export request fails", async () => {
        fakeSettingsScreens();
        // An older backend without the endpoint 404s — must not crash the dialog
        fakeAdminEndpoint("POST", "/exports/", {}, {status: 404});
        await renderWithArchiveHost();

        const section = await openExportTab();
        await section.getByRole("button", {name: "Export data"}).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", {name: "Export", exact: true}).click();

        await expect.element(page.getByText("Something went wrong while loading exports", {exact: false})).toBeVisible();
        await expect.element(dialog.getByText("Media files", {exact: true})).toBeVisible();
        await expect.element(dialog.getByText("Exporting data", {exact: false})).not.toBeInTheDocument();
    });
});
