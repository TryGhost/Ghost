import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import {
    configResponse,
    currentRoute,
    defaultThemesResponse,
    fakeAdminEndpoint,
    fakeEditSettings,
    fakeSettingsScreens,
    fakeThemes,
    renderAdminApp,
    theme,
    type Theme,
} from "@test-utils/acceptance";
import * as sel from "@tryghost/test-data/selectors/settings";
import { settingsScreen } from "@/settings/settings.screen";

function themes(): Theme[] {
    return defaultThemesResponse().themes;
}

function fakeThemeWorld(): Theme[] {
    fakeSettingsScreens();
    const installed = themes();
    fakeThemes(installed);
    return installed;
}

function themeLimits(allowlist: string[], error: string) {
    const config = configResponse();
    config.config.hostSettings = {
        limits: { customThemes: { allowlist, error } },
    };
    return { boot: { browseConfig: { response: config } } };
}

async function archiveBuffer(): Promise<ArrayBuffer> {
    const fixture = new URL("../../../test-utils/acceptance/fixtures/theme.zip", import.meta.url);
    return await fetch(fixture).then(response => response.arrayBuffer());
}

async function fakeThemeDownload(name: string): Promise<void> {
    fakeAdminEndpoint("GET", `/themes/${name}/download/`, await archiveBuffer(), { contentType: "application/zip" });
}

function installedTheme(name: string) {
    return settingsScreen.themeModal().getByTestId(sel.themeListItem).filter({ hasText: new RegExp(name, "i") });
}

async function uploadThemeFile(file: File): Promise<void> {
    const prompt = page.getByText("Click to select or drag & drop zip file", { exact: true });
    await expect.element(prompt).toBeVisible();
    const input = prompt.element().parentElement?.querySelector("input[type=file]");
    if (!(input instanceof HTMLInputElement)) {
        throw new Error("Theme upload input was not rendered");
    }
    await page.elementLocator(input).upload(file);
}

async function editorTextbox() {
    const editor = settingsScreen.themeCodeEditorModal().getByRole("textbox").first();
    await expect.element(editor).toBeVisible();
    return editor;
}

describe("Theme settings", () => {
    it("activates an installed official theme and updates another", async () => {
        const installed = fakeThemeWorld();
        const casper = installed.find(item => item.name === "casper")!;
        const activateApi = fakeAdminEndpoint("PUT", "/themes/casper/activate/", { themes: [{ ...casper, active: true }] });
        const installApi = fakeAdminEndpoint("POST", /^\/themes\/install\/\?/, { themes: [theme({ name: "edition" })] });
        await renderAdminApp("/settings/design/change-theme", {
            boot: { browseActiveTheme: { response: { themes: [installed.find(item => item.active)!] } } },
        });

        const modal = settingsScreen.themeModal();
        await modal.getByRole("button", { name: /Casper/ }).click();
        await modal.getByRole("button", { name: "Activate Casper" }).click();
        await settingsScreen.confirmationModal().getByRole("button", { name: "Activate" }).click();
        await expect.element(settingsScreen.successToast()).toHaveTextContent(/casper is now your active theme/i);
        expect(activateApi.requests).toHaveLength(1);

        await settingsScreen.theme().getByRole("button", { name: "Change theme" }).click();
        const reopenedModal = settingsScreen.themeModal();
        await reopenedModal.getByRole("button", { name: /Edition/ }).click();
        await reopenedModal.getByRole("button", { name: "Update Edition" }).click();
        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/overwrite/i);
        await settingsScreen.confirmationModal().getByRole("button", { name: "Overwrite" }).click();
        await expect.poll(() => installApi.lastRequest?.url).toContain("ref=TryGhost%2FEdition");
    });

    it("manages installed themes", async () => {
        const installed = fakeThemeWorld();
        const casper = installed.find(item => item.name === "casper")!;
        const activateApi = fakeAdminEndpoint("PUT", "/themes/casper/activate/", { themes: [{ ...casper, active: true }] });
        const deleteApi = fakeAdminEndpoint("DELETE", "/themes/edition/", {});
        await renderAdminApp("/settings/design/change-theme");

        const modal = settingsScreen.themeModal();
        await modal.getByRole("tab", { name: "Installed" }).click();
        await expect(modal.getByTestId(sel.themeListItem)).toHaveCount(2);
        await installedTheme("casper").getByRole("button", { name: "Activate" }).click();
        await expect.element(installedTheme("casper")).toHaveTextContent(/Active/);
        expect(activateApi.requests).toHaveLength(1);

        await installedTheme("casper").getByRole("button", { name: "Menu" }).click();
        await settingsScreen.menuItem("Download").click();
        await expect.poll(() => document.querySelector<HTMLIFrameElement>("iframe#iframeDownload")?.src).toMatch(/\/api\/admin\/themes\/casper\/download/);

        await installedTheme("edition").getByRole("button", { name: "Menu" }).click();
        await settingsScreen.menuItem("Delete").click();
        await settingsScreen.confirmationModal().getByRole("button", { name: "Delete" }).click();
        await expect(modal.getByTestId(sel.themeListItem)).toHaveCount(1);
        expect(deleteApi.requests).toHaveLength(1);
    });

    it("uploads a theme archive", async () => {
        fakeThemeWorld();
        const uploaded = theme({ name: "mytheme" });
        const uploadApi = fakeAdminEndpoint("POST", "/themes/upload/", { themes: [uploaded] });
        const buffer = await archiveBuffer();
        await renderAdminApp("/settings/design/change-theme");

        await settingsScreen.themeModal().getByRole("button", { name: "Upload theme" }).click();
        await uploadThemeFile(new File([buffer], "theme.zip", { type: "application/zip" }));

        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/successful/i);
        expect(uploadApi.requests).toHaveLength(1);
    });

    it("prevents uploading an archive over a built-in theme", async () => {
        fakeThemeWorld();
        const uploadApi = fakeAdminEndpoint("POST", "/themes/upload/", { themes: [theme({ name: "source" })] });
        const buffer = await archiveBuffer();
        await renderAdminApp("/settings/design/change-theme");

        await settingsScreen.themeModal().getByRole("button", { name: "Upload theme" }).click();
        await uploadThemeFile(new File([buffer], "source.zip", { type: "application/zip" }));

        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/Upload failed/i);
        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/cannot be overwritten/i);
        expect(uploadApi.requests).toHaveLength(0);
    });

    it("loads the code editor and saves a changed theme", async () => {
        fakeThemeWorld();
        await fakeThemeDownload("edition");
        const uploadApi = fakeAdminEndpoint("POST", "/themes/upload/", { themes: [theme({ name: "edition", active: true })] });
        await renderAdminApp("/settings/theme/edit/edition");

        const modal = settingsScreen.themeCodeEditorModal();
        await expect.element(modal).toHaveTextContent(/Edit theme/);
        await expect.element(modal).toHaveTextContent(/json/i);
        const editor = await editorTextbox();
        await editor.fill('{"name":"edition","version":"1.0.0"}\n');
        await expect.element(modal).toHaveTextContent(/1 file modified/);
        await modal.getByRole("button", { name: "Save" }).click();
        await settingsScreen.themeEditorConfirmModal().getByRole("button", { name: "Replace theme" }).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent(/Theme saved/i);
        expect(uploadApi.requests).toHaveLength(1);
    });

    it("runs the current save flow from the keyboard shortcut", async () => {
        fakeThemeWorld();
        // The editor shortcut currently propagates to the settings form too;
        // keep that pre-existing request in the declared world (follow-up).
        fakeEditSettings();
        await fakeThemeDownload("edition");
        const uploadApi = fakeAdminEndpoint("POST", "/themes/upload/", { themes: [theme({ name: "edition", active: true })] });
        await renderAdminApp("/settings/theme/edit/edition");

        const editor = await editorTextbox();
        await editor.fill('{"name":"edition","version":"1.0.0"}\n');
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true }));
        await settingsScreen.themeEditorConfirmModal().getByRole("button", { name: "Replace theme" }).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent(/Theme saved/i);
        expect(uploadApi.requests).toHaveLength(1);
    });

    it("surfaces server-side archive limit details", async () => {
        fakeThemeWorld();
        await fakeThemeDownload("edition");
        fakeAdminEndpoint("POST", "/themes/upload/", {
            errors: [{
                message: "Zip entry exceeds maximum uncompressed size.",
                errorType: "UnsupportedMediaTypeError",
                code: "ENTRY_TOO_LARGE",
                errorDetails: { entryName: "partials/huge.hbs", observedBytes: 2_000_000, limitBytes: 1_048_576 },
            }],
        }, { status: 415 });
        await renderAdminApp("/settings/theme/edit/edition");

        const editor = await editorTextbox();
        await editor.fill('{"name":"edition","version":"1.0.0"}\n');
        await settingsScreen.themeCodeEditorModal().getByRole("button", { name: "Save" }).click();
        await settingsScreen.themeEditorConfirmModal().getByRole("button", { name: "Replace theme" }).click();

        await expect.element(settingsScreen.errorToast()).toHaveTextContent(/partials\/huge\.hbs/);
        await expect.element(settingsScreen.errorToast()).toHaveTextContent(/1\.0 MB/);
    });

    it("requires built-in themes to be saved under a valid new name", async () => {
        fakeThemeWorld();
        await fakeThemeDownload("casper");
        await renderAdminApp("/settings/theme/edit/casper");

        const editor = await editorTextbox();
        await editor.fill('{"name":"casper","version":"1.0.0"}\n');
        await settingsScreen.themeCodeEditorModal().getByRole("button", { name: "Save" }).click();
        const inputModal = settingsScreen.themeEditorInputModal();
        await inputModal.getByLabelText("Theme name").fill("Foo Bar!");
        await inputModal.getByRole("button", { name: "Continue" }).click();
        await expect.element(page.getByText(/Invalid theme name/i)).toBeVisible();

        await settingsScreen.themeCodeEditorModal().getByRole("button", { name: "Save" }).click();
        await inputModal.getByLabelText("Theme name").fill("casper");
        await inputModal.getByRole("button", { name: "Continue" }).click();
        await expect.element(page.getByText(/Built-in themes cannot be overwritten/i)).toBeVisible();
    });

    it("saves a built-in theme under a valid new name", async () => {
        fakeThemeWorld();
        await fakeThemeDownload("casper");
        await fakeThemeDownload("casper-edited");
        const uploadApi = fakeAdminEndpoint("POST", "/themes/upload/", { themes: [theme({ name: "casper-edited" })] });
        await renderAdminApp("/settings/theme/edit/casper");

        const editor = await editorTextbox();
        await editor.fill('{"name":"casper","version":"1.0.0"}\n');
        await settingsScreen.themeCodeEditorModal().getByRole("button", { name: "Save" }).click();
        await settingsScreen.themeEditorInputModal().getByLabelText("Theme name").fill("casper-edited");
        await settingsScreen.themeEditorInputModal().getByRole("button", { name: "Continue" }).click();
        await settingsScreen.themeEditorConfirmModal().getByRole("button", { name: "Save theme" }).click();

        await expect.poll(() => uploadApi.requests.length).toBe(1);
        await expect.poll(currentRoute).toBe("/settings/theme/edit/casper-edited");
        await expect.element(settingsScreen.themeCodeEditorModal()).toHaveTextContent("casper-edited");
    });

    it.each([
        { allowlist: ["casper"], opensThemes: false },
        { allowlist: ["casper", "edition"], opensThemes: true },
    ])("enforces theme-change limits", async ({ allowlist, opensThemes }) => {
        fakeThemeWorld();
        await renderAdminApp("/settings/theme", themeLimits(allowlist, "Upgrade to use custom themes"));

        await settingsScreen.theme().getByRole("button", { name: "Change theme" }).click();
        if (opensThemes) {
            await expect.element(settingsScreen.themeModal()).toBeVisible();
            await expect(settingsScreen.limitModal()).toHaveCount(0);
        } else {
            await expect.element(settingsScreen.limitModal()).toHaveTextContent(/Upgrade to use custom themes/);
            await expect(settingsScreen.themeModal()).toHaveCount(0);
        }
    });

    it("prevents direct access to the theme-change route when limited", async () => {
        fakeThemeWorld();
        await renderAdminApp("/settings/design/change-theme", themeLimits(["casper"], "Upgrade to use custom themes"));

        await expect.element(settingsScreen.limitModal()).toHaveTextContent(/Upgrade to use custom themes/);
        await expect(settingsScreen.themeModal()).toHaveCount(0);
    });

    it("prevents direct access to the theme editor when editing is limited", async () => {
        fakeThemeWorld();
        await fakeThemeDownload("edition");
        await renderAdminApp("/settings/theme/edit/edition", themeLimits(["casper", "edition"], "Upgrade to use custom themes"));

        await expect.element(settingsScreen.limitModal()).toHaveTextContent(/Upgrade to use custom themes/);
        await expect(settingsScreen.themeCodeEditorModal()).toHaveCount(0);
        await expect.poll(currentRoute).toBe("/settings/theme");
    });

    it("prevents theme uploads when custom themes are limited", async () => {
        fakeThemeWorld();
        await renderAdminApp("/settings/design/change-theme", themeLimits(["casper", "headline", "edition"], "Upgrade to use more themes"));

        await settingsScreen.themeModal().getByRole("button", { name: "Upload theme" }).click();
        await expect.element(settingsScreen.limitModal()).toHaveTextContent(/Upgrade to use more themes/);
        await expect(settingsScreen.confirmationModal()).toHaveCount(0);
    });

    it.each([
        { themeName: "Headline", action: "Install Headline", allowlist: ["casper", "edition"] },
        { themeName: "Edition", action: "Update Edition", allowlist: ["casper", "headline"] },
    ])("checks limits before installing or updating a theme card", async ({ themeName, action, allowlist }) => {
        fakeThemeWorld();
        await renderAdminApp("/settings/design/change-theme", themeLimits(allowlist, "Upgrade to use more themes"));

        const modal = settingsScreen.themeModal();
        await modal.getByRole("button", { name: new RegExp(themeName) }).click();
        await modal.getByRole("button", { name: action }).click();
        await expect.element(settingsScreen.limitModal()).toHaveTextContent(/Upgrade to use more themes/);
        await expect(settingsScreen.confirmationModal()).toHaveCount(0);
    });

    it.each([
        { allowlist: ["casper", "headline", "taste"], canInstall: true },
        { allowlist: ["casper", "headline", "edition"], canInstall: false },
    ])("enforces marketplace installation limits", async ({ allowlist, canInstall }) => {
        fakeThemeWorld();
        const installApi = fakeAdminEndpoint("POST", /^\/themes\/install\/\?/, { themes: [theme({ name: "taste" })] });
        fakeAdminEndpoint("PUT", "/themes/taste/activate/", { themes: [theme({ name: "taste", active: true })] });
        await renderAdminApp("/settings/theme/install?source=github&ref=TryGhost/Taste", themeLimits(allowlist, "Upgrade to use more themes"));

        if (canInstall) {
            await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/Install Theme/);
            await settingsScreen.confirmationModal().getByRole("button", { name: "Install" }).click();
            await expect.element(settingsScreen.successToast()).toHaveTextContent(/taste is now your active theme/i);
            expect(installApi.requests).toHaveLength(1);
        } else {
            await expect.element(settingsScreen.limitModal()).toHaveTextContent(/Upgrade to use more themes/);
            expect(installApi.requests).toHaveLength(0);
        }
    });

    it("confirms before discarding editor changes", async () => {
        fakeThemeWorld();
        await fakeThemeDownload("edition");
        await renderAdminApp("/settings/theme/edit/edition");

        const editor = await editorTextbox();
        await editor.fill('{"name":"edition","version":"1.0.0"}\n');
        await settingsScreen.themeCodeEditorModal().getByRole("button", { name: "Close" }).click();
        await expect.element(settingsScreen.themeEditorConfirmModal()).toHaveTextContent(/unsaved theme changes/i);
        await settingsScreen.themeEditorConfirmModal().getByRole("button", { name: "Cancel" }).click();
        await expect.element(settingsScreen.themeCodeEditorModal()).toBeVisible();
        await settingsScreen.themeCodeEditorModal().getByRole("button", { name: "Close" }).click();
        await settingsScreen.themeEditorConfirmModal().getByRole("button", { name: "Discard changes" }).click();
        await expect(settingsScreen.themeCodeEditorModal()).toHaveCount(0);
    });

    it.each([
        { from: "theme", destination: "/settings/theme" },
        { from: "staff/owner-transfer", destination: "/settings/design/change-theme" },
    ])("only honours allowlisted editor return routes", async ({ from, destination }) => {
        fakeThemeWorld();
        await fakeThemeDownload("edition");
        await renderAdminApp(`/settings/theme/edit/edition?from=${from}`);

        await settingsScreen.themeCodeEditorModal().getByRole("button", { name: "Close" }).click();
        await expect.poll(currentRoute).toBe(destination);
    });

    it("redirects invalid editor theme names", async () => {
        fakeThemeWorld();
        await renderAdminApp("/settings/theme/edit/%2Fedition");

        await expect.poll(currentRoute).toBe("/settings/theme");
        await expect(settingsScreen.themeCodeEditorModal()).toHaveCount(0);
    });

    it("shows a controlled message for non-editable files", async () => {
        fakeThemeWorld();
        await fakeThemeDownload("edition");
        await renderAdminApp("/settings/theme/edit/edition");

        const modal = settingsScreen.themeCodeEditorModal();
        await modal.getByRole("button", { name: ".DS_Store" }).click();
        await expect.element(modal).toHaveTextContent(/cannot be edited in the browser/i);
        await expect(modal.getByRole("textbox")).toHaveCount(0);
    });
});
