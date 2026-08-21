import { describe, expect, it, onTestFinished, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

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

/**
 * This tier serves no Ember CSS, so nothing here collides with Ghost's legacy
 * unlayered stylesheet unless the collision is staged. Without staging, both
 * assertions AND screenshots taken from this harness flatter the UI for
 * anything `ghost.css` touches.
 */
function stageLegacyGhostCss(css: string): void {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    onTestFinished(() => style.remove());
}

/**
 * Verbatim from `ghost/core/core/built/admin/assets/ghost.css` — a bare element
 * selector that turns every `<code>` in Admin into a bordered grey chip with
 * pink text.
 */
const LEGACY_CODE_CSS = `code, tt {
    padding: 0.2rem 0.3rem;
    border: 1px solid hsl(203, 12.29%, 91.14%);
    background: hsl(205, 12.29%, 95.14%);
    border-radius: 2px;
    color: hsl(332.04, 96.26%, 43.04%);
    vertical-align: middle;
    white-space: pre-wrap;
    font-size: 0.85em;
    line-height: 1em;
}`;

/** Tachyons' `.rotate-180`, which Tailwind v4 expresses as `rotate` rather than `transform`. */
const LEGACY_TACHYONS_CSS = ".rotate-180 { transform: rotate(180deg); }";

function themeProblem(overrides: { code: string; level?: string; rule?: string; details?: string }) {
    return {
        level: "warning",
        rule: "Replace {{@blog.url}} with {{@site.url}}",
        details: "The helper {{@blog.url}} is deprecated and will be removed in a future version of Ghost.",
        failures: [{ ref: "default.hbs", message: "line 12" }],
        fatal: false,
        ...overrides,
    };
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

/** Line height as a multiple of font size, so sizes of different scale compare. */
function lineRatio(style: CSSStyleDeclaration): number {
    return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
}

/** The one `<code>` in the open dialog reading exactly `text`. */
function codeSpan(text: string): HTMLElement {
    const dialog = settingsScreen.confirmationModal().element();
    const match = [...dialog.querySelectorAll("code")].find(node => node.textContent === text);
    if (!match) {
        throw new Error(`No <code> reading ${text} was rendered`);
    }
    return match;
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

    it("closes an installed-theme menu with Escape without closing the theme modal", async () => {
        fakeThemeWorld();
        await renderAdminApp("/settings/design/change-theme");

        const modal = settingsScreen.themeModal();
        await modal.getByRole("tab", { name: "Installed" }).click();
        await installedTheme("casper").getByRole("button", { name: "Menu" }).click();
        await expect.element(settingsScreen.menuItem("Download")).toBeVisible();

        await userEvent.keyboard("{Escape}");

        await expect(settingsScreen.menuItem("Download")).toHaveCount(0);
        await expect.element(modal).toBeVisible();
        await expect.poll(currentRoute).toBe("/settings/design/change-theme");
    });

    it("uploads a theme archive", async () => {
        fakeThemeWorld();
        const uploaded = theme({ name: "mytheme" });
        const uploadApi = fakeAdminEndpoint("POST", "/themes/upload/", { themes: [uploaded] });
        const buffer = await archiveBuffer();
        await renderAdminApp("/settings/design/change-theme");

        await settingsScreen.themeModal().getByRole("button", { name: "Upload theme" }).click();
        await uploadThemeFile(new File([buffer], "theme.zip", { type: "application/zip" }));

        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent("mytheme was uploaded successfully. Do you want to activate it?");
        expect(uploadApi.requests).toHaveLength(1);
    });

    it("summarises non-blocking issues on the installed-theme dialog", async () => {
        fakeThemeWorld();
        const uploaded = theme({
            name: "mytheme",
            errors: [themeProblem({ code: "GS005-TPL-ERR", level: "error", rule: "Templates must contain valid Handlebars" })],
            warnings: [
                themeProblem({ code: "GS001-DEPR-PURL", rule: "Replace {{@blog.url}} with {{@site.url}}" }),
                themeProblem({ code: "GS002-DISQUS-ID", rule: "Disqus id should be present" }),
            ],
        });
        fakeAdminEndpoint("POST", "/themes/upload/", { themes: [uploaded] });
        const buffer = await archiveBuffer();
        await renderAdminApp("/settings/design/change-theme");

        await settingsScreen.themeModal().getByRole("button", { name: "Upload theme" }).click();
        await uploadThemeFile(new File([buffer], "mytheme.zip", { type: "application/zip" }));

        const installedModal = settingsScreen.confirmationModal();
        // Errors and warnings are merged into one list, so the sentence says
        // "issues" rather than contradicting the "1 error" in the heading.
        await expect.element(installedModal).toHaveTextContent("mytheme was uploaded, but it has some issues. Do you want to activate it?");
        await expect.element(installedModal).toHaveTextContent("1 error, 2 warnings");

        // A summary that says "error" can't be headed by a warning-coloured
        // icon: it takes the same red as the ERROR badge in the list below.
        const heading = installedModal.element().querySelector("h3")!;
        const badge = installedModal.getByText("Error", { exact: true }).element();
        expect(getComputedStyle(heading.querySelector("svg")!).color).toBe(getComputedStyle(badge).color);

        // Every issue is listed up front; each one expands on its own.
        await expect(installedModal.getByRole("button", { name: /GS001-DEPR-PURL/ })).toHaveCount(1);
        await expect(installedModal.getByText(/deprecated/)).toHaveCount(0);
        await installedModal.getByRole("button", { name: /GS001-DEPR-PURL/ }).click();
        await expect.element(installedModal.getByText(/deprecated/)).toBeVisible();
        await expect.element(installedModal).toHaveTextContent("Affected files");
    });

    it("flips an expanding issue row's chevron a single half turn", async () => {
        fakeThemeWorld();
        fakeAdminEndpoint("POST", "/themes/upload/", {
            themes: [theme({ name: "mytheme", warnings: [themeProblem({ code: "GS001-DEPR-PURL" })] })],
        });
        const buffer = await archiveBuffer();
        await renderAdminApp("/settings/design/change-theme");

        await settingsScreen.themeModal().getByRole("button", { name: "Upload theme" }).click();
        await uploadThemeFile(new File([buffer], "mytheme.zip", { type: "application/zip" }));

        // Ghost's legacy Ember stylesheet ships Tachyons' `.rotate-180 {transform:
        // rotate(180deg)}` unlayered alongside Tailwind v4's `.rotate-180 {rotate:
        // 180deg}`. An icon carrying that literal class picks up both and turns a
        // full circle, landing back where it started — the bug this dialog was
        // rebuilt to fix. This tier serves no Ember CSS, so the collision is staged
        // here; the chevron must rotate via a selector that rule cannot match.
        stageLegacyGhostCss(LEGACY_TACHYONS_CSS);

        const row = settingsScreen.confirmationModal().getByRole("button", { name: /GS001-DEPR-PURL/ });
        await expect.element(row).toBeVisible();
        const chevron = () => (row.element() as HTMLElement).querySelector("svg")!;
        expect(getComputedStyle(chevron()).rotate).toBe("none");

        await row.click();

        // Polling rides out the expand transition without a fixed wait: an
        // interpolated frame reads as an intermediate angle, never as 180deg.
        await expect.poll(() => getComputedStyle(chevron()).rotate).toBe("180deg");
        // ...and nothing may add a second rotation on top of that one.
        expect(getComputedStyle(chevron()).transform).toBe("none");
    });

    it("renders gscan's inline code plainly under the legacy code rule", async () => {
        fakeThemeWorld();
        fakeAdminEndpoint("POST", "/themes/upload/", {
            themes: [
                theme({
                    name: "mytheme",
                    warnings: [
                        themeProblem({
                            code: "GS001-DEPR-PURL",
                            rule: "Replace <code>{{@blog.url}}</code> with <code>{{@site.url}}</code>",
                            details: "The <code>{{@blog.title}}</code> helper is deprecated.",
                        }),
                    ],
                }),
            ],
        });
        const buffer = await archiveBuffer();
        await renderAdminApp("/settings/design/change-theme");

        await settingsScreen.themeModal().getByRole("button", { name: "Upload theme" }).click();
        await uploadThemeFile(new File([buffer], "mytheme.zip", { type: "application/zip" }));
        stageLegacyGhostCss(LEGACY_CODE_CSS);

        const row = settingsScreen.confirmationModal().getByRole("button", { name: /GS001-DEPR-PURL/ });
        await expect.element(row).toBeVisible();
        await row.click();
        await expect.element(settingsScreen.confirmationModal().getByText(/deprecated/)).toBeVisible();

        // gscan's own markup: mono, inheriting the line it sits on, no chip.
        for (const text of ["{{@blog.url}}", "{{@blog.title}}"]) {
            const code = codeSpan(text);
            const surrounding = getComputedStyle(code.parentElement!);
            const style = getComputedStyle(code);
            expect(style.fontFamily).toContain("mono");
            expect(style.color).toBe(surrounding.color);
            // Nothing reads optically larger than the text it sits in.
            expect(style.fontSize).toBe(surrounding.fontSize);
            // The legacy `line-height: 1em` computes to exactly the font size;
            // inheriting the surrounding ratio is what its absence would give.
            expect(style.lineHeight).not.toBe(style.fontSize);
            expect(lineRatio(style)).toBeCloseTo(lineRatio(surrounding), 2);
            expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect(style.borderTopWidth).toBe("0px");
            expect(style.borderTopLeftRadius).toBe("0px");
            expect(style.paddingLeft).toBe("0px");
            expect(style.verticalAlign).toBe("baseline");
        }

        // An affected file is inline mono too: same size, family and weight as the
        // code in the details above it, with no chip of its own left behind.
        const filenameCode = codeSpan("default.hbs");
        const filename = getComputedStyle(filenameCode);
        const detailsCode = getComputedStyle(codeSpan("{{@blog.title}}"));
        expect(filename.backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(filename.borderTopWidth).toBe("0px");
        expect(filename.borderTopLeftRadius).toBe("0px");
        expect(filename.paddingLeft).toBe("0px");
        expect(filename.verticalAlign).toBe("baseline");
        expect(filename.fontSize).toBe(detailsCode.fontSize);
        expect(filename.fontFamily).toBe(detailsCode.fontFamily);
        expect(filename.fontWeight).toBe(detailsCode.fontWeight);
        // Same foreground as the line it sits on — the affected-files list stays
        // muted while the details read as body copy — i.e. not the legacy pink.
        expect(filename.color).toBe(getComputedStyle(filenameCode.parentElement!).color);
    });

    it("keeps the installed-theme dialog open when activation fails", async () => {
        fakeThemeWorld();
        const uploaded = theme({ name: "mytheme" });
        fakeAdminEndpoint("POST", "/themes/upload/", { themes: [uploaded] });
        const activateApi = fakeAdminEndpoint("PUT", "/themes/mytheme/activate/", {
            errors: [{ message: "Theme activation failed" }],
        }, { status: 422 });
        const buffer = await archiveBuffer();
        await renderAdminApp("/settings/design/change-theme");

        await settingsScreen.themeModal().getByRole("button", { name: "Upload theme" }).click();
        await uploadThemeFile(new File([buffer], "mytheme.zip", { type: "application/zip" }));

        const installedModal = settingsScreen.confirmationModal();
        await installedModal.getByRole("button", { name: "Activate theme" }).click();

        await expect.element(installedModal).toBeVisible();
        await expect.element(settingsScreen.errorToast()).toHaveTextContent("Theme activation failed");
        await expect.poll(currentRoute).toBe("/settings/design/change-theme");
        expect(activateApi.requests).toHaveLength(1);
    });

    it("seats the sticky footer against the issue list without an empty band", async () => {
        fakeThemeWorld();
        fakeAdminEndpoint("POST", "/themes/upload/", {
            themes: [
                theme({
                    name: "mytheme",
                    errors: [themeProblem({ code: "GS005-TPL-ERR", level: "error", rule: "Templates must contain valid Handlebars" })],
                    // Enough rows that the dialog scrolls, so the footer both
                    // floats mid-scroll and lands in flow at the bottom.
                    warnings: Array.from({ length: 8 }, (_, index) => themeProblem({ code: `GS10${index}-DEPR-PURL` })),
                }),
            ],
        });
        const buffer = await archiveBuffer();
        await renderAdminApp("/settings/design/change-theme");

        await settingsScreen.themeModal().getByRole("button", { name: "Upload theme" }).click();
        await uploadThemeFile(new File([buffer], "mytheme.zip", { type: "application/zip" }));
        stageLegacyGhostCss(LEGACY_CODE_CSS);

        const dialog = settingsScreen.confirmationModal();
        await expect.element(dialog).toHaveTextContent("1 error, 8 warnings");

        const scroller = dialog.element() as HTMLElement;
        const list = scroller.querySelector<HTMLElement>("div.overflow-hidden.rounded-lg.border")!;
        // The footer's own background: `sticky bottom-0`, 84px tall, and the
        // only thing standing between scrolling rows and the buttons.
        const mask = scroller.querySelector<HTMLElement>(".z-\\[299\\]")!;
        expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);
        expect(getComputedStyle(mask).backgroundColor).not.toMatch(/rgba\(.*, 0\)$/);

        // Mid-scroll the mask is pinned to the bottom of the scroll port and
        // rows run underneath it rather than showing through.
        scroller.scrollTop = Math.floor((scroller.scrollHeight - scroller.clientHeight) / 2);
        await expect.poll(() => Math.round(mask.getBoundingClientRect().bottom)).toBe(Math.round(scroller.getBoundingClientRect().bottom));
        await expect.poll(() => Math.round(mask.getBoundingClientRect().height)).toBe(84);
        expect(list.getBoundingClientRect().bottom).toBeGreaterThan(mask.getBoundingClientRect().top);

        // Scrolled to the end the footer returns to flow, and the list has to
        // end exactly where the footer's background begins — the 24px spacer
        // the component opens with would read as an empty band here.
        scroller.scrollTop = scroller.scrollHeight;
        await expect.poll(() => Math.round(mask.getBoundingClientRect().bottom)).toBe(Math.round(scroller.getBoundingClientRect().bottom));
        await expect.poll(() => Math.round(mask.getBoundingClientRect().top - list.getBoundingClientRect().bottom)).toBe(0);
    });

    it("reports blocking upload errors and re-opens the upload dialog from the error dialog", async () => {
        fakeThemeWorld();
        const uploadApi = fakeAdminEndpoint("POST", "/themes/upload/", {
            errors: [{ message: "Theme is not compatible or contains errors.", details: "Missing index.hbs" }],
        }, { status: 422 });
        const buffer = await archiveBuffer();
        await renderAdminApp("/settings/design/change-theme");

        await settingsScreen.themeModal().getByRole("button", { name: "Upload theme" }).click();
        await uploadThemeFile(new File([buffer], "mytheme.zip", { type: "application/zip" }));

        const errorModal = settingsScreen.confirmationModal();
        await expect.element(errorModal).toHaveTextContent("Theme not uploaded");
        await expect.element(errorModal).toHaveTextContent("mytheme couldn't be uploaded. Fix the errors below and try again.");
        await expect.element(errorModal).toHaveTextContent("Missing index.hbs");
        expect(uploadApi.requests).toHaveLength(1);

        await errorModal.getByRole("button", { name: "Re-upload" }).click();
        await expect.element(page.getByText("Click to select or drag & drop zip file", { exact: true })).toBeVisible();
        await expect(page.getByText("Theme not uploaded")).toHaveCount(0);
    });

    it("reports blocking activation errors for an installed theme", async () => {
        fakeThemeWorld();
        const activateApi = fakeAdminEndpoint("PUT", "/themes/casper/activate/", {
            errors: [{ message: "Theme is not compatible or contains errors.", details: "Missing post.hbs" }],
        }, { status: 422 });
        await renderAdminApp("/settings/design/change-theme");

        const modal = settingsScreen.themeModal();
        await modal.getByRole("tab", { name: "Installed" }).click();
        await installedTheme("casper").getByRole("button", { name: "Activate" }).click();

        const errorModal = settingsScreen.confirmationModal();
        await expect.element(errorModal).toHaveTextContent("Theme not activated");
        await expect.element(errorModal).toHaveTextContent("Missing post.hbs");
        expect(activateApi.requests).toHaveLength(1);

        await errorModal.getByRole("button", { name: "Cancel" }).click();
        await expect(settingsScreen.confirmationModal()).toHaveCount(0);
        await expect.element(modal).toBeVisible();
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
        await expect.element(settingsScreen.themeEditorConfirmModal()).toBeVisible();
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true }));
        await expect(settingsScreen.themeEditorConfirmModal()).toHaveCount(1);
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

    it("falls back to the generic API error for malformed archive limit details", async () => {
        fakeThemeWorld();
        await fakeThemeDownload("edition");
        fakeAdminEndpoint("POST", "/themes/upload/", {
            errors: [{
                message: "Zip entry exceeds maximum uncompressed size.",
                errorType: "UnsupportedMediaTypeError",
                code: "ENTRY_TOO_LARGE",
                errorDetails: { entryName: "partials/huge.hbs", limitBytes: "not-a-number" },
            }],
        }, { status: 415 });
        await renderAdminApp("/settings/theme/edit/edition");

        const editor = await editorTextbox();
        await editor.fill('{"name":"edition","version":"1.0.0"}\n');
        await settingsScreen.themeCodeEditorModal().getByRole("button", { name: "Save" }).click();
        await settingsScreen.themeEditorConfirmModal().getByRole("button", { name: "Replace theme" }).click();

        await expect.element(settingsScreen.errorToast()).toHaveTextContent("Request contains an unknown or unsupported file type.");
        await expect.element(settingsScreen.errorToast()).not.toHaveTextContent("NaN");
    });

    it("keeps the code editor open and reports blocking validation errors on save", async () => {
        fakeThemeWorld();
        await fakeThemeDownload("edition");
        fakeAdminEndpoint("POST", "/themes/upload/", {
            errors: [{ message: "Theme is not compatible or contains errors.", details: "Missing default.hbs" }],
        }, { status: 422 });
        await renderAdminApp("/settings/theme/edit/edition");

        const editor = await editorTextbox();
        await editor.fill('{"name":"edition","version":"1.0.0"}\n');
        await settingsScreen.themeCodeEditorModal().getByRole("button", { name: "Save" }).click();
        await settingsScreen.themeEditorConfirmModal().getByRole("button", { name: "Replace theme" }).click();

        const errorModal = settingsScreen.confirmationModal();
        await expect.element(errorModal).toHaveTextContent("Theme not saved");
        await expect.element(errorModal).toHaveTextContent("Missing default.hbs");
        await expect(errorModal.getByRole("button", { name: "Retry" })).toHaveCount(0);
        await userEvent.keyboard("{Escape}");
        await expect(settingsScreen.confirmationModal()).toHaveCount(0);
        await expect.element(settingsScreen.themeCodeEditorModal()).toBeVisible();
    });

    it("falls back to the generic API error for an empty validation payload", async () => {
        fakeThemeWorld();
        await fakeThemeDownload("edition");
        fakeAdminEndpoint("POST", "/themes/upload/", { errors: [] }, { status: 422 });
        await renderAdminApp("/settings/theme/edit/edition");

        const editor = await editorTextbox();
        await editor.fill('{"name":"edition","version":"1.0.0"}\n');
        await settingsScreen.themeCodeEditorModal().getByRole("button", { name: "Save" }).click();
        await settingsScreen.themeEditorConfirmModal().getByRole("button", { name: "Replace theme" }).click();

        await expect.element(settingsScreen.errorToast()).toHaveTextContent(/Something went wrong/i);
        await expect(settingsScreen.confirmationModal()).toHaveCount(0);
        await expect.element(settingsScreen.themeCodeEditorModal()).toBeVisible();
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
        // saving under a new name carries over the original theme's settings
        const uploadApi = fakeAdminEndpoint("POST", "/themes/upload/?copy_settings_from=casper", {
            themes: [theme({ name: "casper-edited" })],
        });
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

    it("replaces a blocked marketplace installation in history", async () => {
        fakeThemeWorld();
        fakeAdminEndpoint("POST", /^\/themes\/install\/\?/, { themes: [theme({ name: "taste" })] });
        const replaceState = vi.spyOn(window.history, "replaceState");
        await renderAdminApp(
            "/settings/theme/install?source=github&ref=TryGhost/Taste",
            themeLimits(["casper"], "Upgrade to use custom themes")
        );

        await expect.element(settingsScreen.limitModal()).toHaveTextContent(/Upgrade to use custom themes/);
        await expect.poll(currentRoute).toBe("/settings/theme");

        expect(replaceState.mock.calls.some(([, , url]) => String(url).endsWith("#/settings/theme"))).toBe(true);
        replaceState.mockRestore();
    });

    it("confirms before discarding editor changes", async () => {
        fakeThemeWorld();
        await fakeThemeDownload("edition");
        await renderAdminApp("/settings/theme/edit/edition");

        const editor = await editorTextbox();
        await editor.fill('{"name":"edition","version":"1.0.0"}\n');
        await settingsScreen.themeCodeEditorModal().getByRole("button", { name: "Close" }).click();
        await expect.element(settingsScreen.themeEditorConfirmModal()).toHaveTextContent(/unsaved theme changes/i);
        await userEvent.keyboard("{Escape}");
        await expect(settingsScreen.themeEditorConfirmModal()).toHaveCount(0);
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

    it("opens the code editor from the active theme overflow menu and returns to settings on close", async () => {
        fakeThemeWorld();
        await fakeThemeDownload("edition");
        await renderAdminApp("/settings");

        await settingsScreen.theme().getByRole("button", { name: "Menu" }).click();
        await settingsScreen.menuItem("Edit code").click();

        await expect.element(settingsScreen.themeCodeEditorModal()).toBeVisible();
        await expect.poll(currentRoute).toContain("/settings/theme/edit/edition");

        await settingsScreen.themeCodeEditorModal().getByRole("button", { name: "Close" }).click();
        await expect.poll(currentRoute).toBe("/settings");
        await expect(settingsScreen.themeCodeEditorModal()).toHaveCount(0);
        await expect.element(settingsScreen.theme()).toBeVisible();
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
