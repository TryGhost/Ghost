import { describe, expect, it } from "vitest";

import {
    activeThemeResponse,
    fakeAdminEndpoint,
    fakeEditSettings,
    fakeSettingsScreens,
    fakeSitePreview,
    post,
    renderAdminApp,
    settingsResponse,
    siteResponse,
    type SitePreviewCapture,
} from "@test-utils/acceptance";
import * as sel from "@tryghost/test-data/selectors/settings";
import { settingsScreen } from "@/settings/settings.screen";

const previewHtml = "<html><head><style></style></head><body>preview</body></html>";

type CustomThemeSetting = {
    id: string;
    key: string;
    type: "boolean" | "select" | "text";
    value: boolean | string | null;
    default: boolean | string | null;
    options?: string[];
    visibility?: string;
};

const navigationLayout = (): CustomThemeSetting => ({
    id: "navigation-layout",
    key: "navigation_layout",
    type: "select",
    options: ["Logo on cover", "Logo in the middle", "Stacked"],
    default: "Logo on cover",
    value: "Stacked",
});

function siteUrl(): string {
    const url = siteResponse().site.url;
    if (typeof url !== "string") {
        throw new Error("Site fixture requires a URL");
    }
    return url;
}

function fakeDesignWorld(themeSettings: CustomThemeSetting[] = [], { withPost = false } = {}): {
    homepagePreview: SitePreviewCapture;
    postPreview?: SitePreviewCapture;
    latest?: ReturnType<typeof post>;
} {
    fakeSettingsScreens();
    fakeAdminEndpoint("GET", "/custom_theme_settings/", { custom_theme_settings: themeSettings });
    const latest = withPost ? post({ url: "http://test.com/latest/" }) : undefined;
    fakeAdminEndpoint("GET", /^\/posts\/.+limit=1/, { posts: latest ? [latest] : [] });
    const homepagePreview = fakeSitePreview(siteUrl(), previewHtml);
    const postPreview = latest?.url ? fakeSitePreview(latest.url, previewHtml) : undefined;
    return { homepagePreview, postPreview, latest };
}

async function openThemeTab() {
    const modal = settingsScreen.designModal();
    await modal.getByRole("tab", { name: "Theme" }).click();
    return modal;
}

describe("Design settings", () => {
    it("requests homepage and post previews and switches device size", async () => {
        const { homepagePreview, postPreview } = fakeDesignWorld([], { withPost: true });
        await renderAdminApp("/settings/design/edit");

        const modal = settingsScreen.designModal();
        await expect(homepagePreview).toHaveRequestedPreview({ custom: "{}" });
        await modal.getByTestId(sel.designToolbar).getByRole("tab", { name: "Post" }).click();
        await expect(postPreview!).toHaveRequestedPreview({ custom: "{}" });

        await modal.getByRole("button", { name: "Mobile" }).click();
        await expect.element(modal.getByTestId(sel.previewMobile)).toBeVisible();
        await modal.getByRole("button", { name: "Desktop" }).click();
        await expect(modal.getByTestId(sel.previewMobile)).toHaveCount(0);
    });

    it("confirms before discarding unsaved brand changes", async () => {
        const { homepagePreview } = fakeDesignWorld();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/design/edit");

        const modal = settingsScreen.designModal();
        const color = modal.getByTestId(sel.accentColorPicker);
        await color.getByRole("button").click();
        await color.getByRole("textbox").fill("#cd5786");
        await expect(homepagePreview).toHaveRequestedPreview({ c: "#cd5786" });
        await modal.getByRole("button", { name: "Close" }).click();

        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
        await settingsScreen.confirmationAction("Leave").click();
        await expect(settingsScreen.designModal()).toHaveCount(0);
        expect(settingsApi.requests).toHaveLength(0);
    });

    it("previews and saves brand settings", async () => {
        const { homepagePreview } = fakeDesignWorld();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/design/edit");

        const modal = settingsScreen.designModal();
        const color = modal.getByTestId(sel.accentColorPicker);
        await color.getByRole("button").click();
        await color.getByRole("textbox").fill("#cd5786");

        await expect(homepagePreview).toHaveRequestedPreview({ c: "#cd5786" });
        await expect.element(modal.getByTestId(sel.toggleUnsplashButton)).toBeVisible();
        await modal.getByRole("button", { name: "Save" }).click();
        await expect(settingsApi).toHaveEditedSettings([{ key: "accent_color", value: "#cd5786" }]);
    });

    it("previews and saves custom theme settings", async () => {
        const { homepagePreview } = fakeDesignWorld([navigationLayout()]);
        const editThemeApi = fakeAdminEndpoint("PUT", "/custom_theme_settings/", ({ body }) => body);
        await renderAdminApp("/settings/design/edit");

        const modal = await openThemeTab();
        await modal.getByTestId("setting-select-navigation_layout").click();
        await settingsScreen.selectOptionExact("Logo in the middle").click();

        await expect(homepagePreview).toHaveRequestedPreview({ custom: JSON.stringify({ navigation_layout: "Logo in the middle" }) });
        await modal.getByRole("button", { name: "Save" }).click();
        await expect.poll(() => editThemeApi.lastRequest?.body).toMatchObject({
            custom_theme_settings: [{ key: "navigation_layout", value: "Logo in the middle" }],
        });
    });

    it("renders the compact brand form when a theme has no custom settings", async () => {
        const { homepagePreview } = fakeDesignWorld();
        await renderAdminApp("/settings/design/edit");

        const modal = settingsScreen.designModal();
        await expect(homepagePreview).toHaveRequestedPreview({ custom: "{}" });
        const tabs = modal.getByTestId(sel.designSettingTabs);
        await expect(tabs.getByRole("tab", { name: "Brand" })).toHaveCount(0);
        await expect(tabs.getByRole("tab", { name: "Theme" })).toHaveCount(0);
        await expect.element(tabs.getByTestId(sel.accentColorPicker)).toBeVisible();
    });

    it("hides conditional settings and sends their hidden preview value", async () => {
        const featured: CustomThemeSetting = {
            id: "featured-posts",
            key: "show_featured_posts",
            type: "boolean",
            default: false,
            value: false,
            visibility: "navigation_layout:[Stacked]",
        };
        const { homepagePreview } = fakeDesignWorld([navigationLayout(), featured]);
        const editThemeApi = fakeAdminEndpoint("PUT", "/custom_theme_settings/", ({ body }) => body);
        await renderAdminApp("/settings/design/edit");

        const modal = await openThemeTab();
        await expect.element(modal.getByLabelText("Show featured posts")).toBeVisible();
        await modal.getByTestId("setting-select-navigation_layout").click();
        await settingsScreen.selectOptionExact("Logo in the middle").click();

        await expect(modal.getByLabelText("Show featured posts")).toHaveCount(0);
        await expect(homepagePreview).toHaveRequestedPreview({
            custom: JSON.stringify({ navigation_layout: "Logo in the middle", show_featured_posts: null }),
        });
        await modal.getByRole("button", { name: "Save" }).click();
        await expect.poll(() => editThemeApi.lastRequest?.body).toMatchObject({
            custom_theme_settings: [
                { key: "navigation_layout", value: "Logo in the middle" },
                { key: "show_featured_posts", value: false },
            ],
        });
    });

    it("previews custom fonts and can restore theme defaults", async () => {
        const { homepagePreview } = fakeDesignWorld();
        await renderAdminApp("/settings/design/edit", {
            boot: { browseSettings: { response: settingsResponse({ settings: { heading_font: "Cardo", body_font: "Inter" } }) } },
        });

        const modal = settingsScreen.designModal();
        await expect.element(modal.getByTestId(sel.headingFontSelect)).toHaveTextContent(/Cardo/);
        await expect.element(modal.getByTestId(sel.bodyFontSelect)).toHaveTextContent(/Inter/);
        await modal.getByTestId(sel.headingFontSelect).click();
        await settingsScreen.selectOption("Theme default").click();
        await modal.getByTestId(sel.bodyFontSelect).click();
        await settingsScreen.selectOption("Theme default").click();

        await expect(homepagePreview).toHaveRequestedPreview({ hf: "", bf: "" });
    });

    it.each([
        { supportsCustomFonts: true },
        { supportsCustomFonts: false },
    ])("shows legacy theme font settings only when custom fonts are unsupported", async ({ supportsCustomFonts }) => {
        const titleFont: CustomThemeSetting = { id: "title-font", key: "title_font", type: "select", options: ["Modern sans-serif", "Elegant serif"], default: "Modern sans-serif", value: "Modern sans-serif" };
        const bodyFont: CustomThemeSetting = { id: "body-font", key: "body_font", type: "select", options: ["Modern sans-serif", "Elegant serif"], default: "Elegant serif", value: "Elegant serif" };
        fakeDesignWorld([titleFont, bodyFont]);
        const warnings = supportsCustomFonts ? [] : [{ code: "GS051-CUSTOM-FONTS" }];
        await renderAdminApp("/settings/design/edit", {
            boot: { browseActiveTheme: { response: activeThemeResponse({ warnings }) } },
        });

        const modal = await openThemeTab();
        if (supportsCustomFonts) {
            await expect.element(modal.getByLabelText("Title font")).not.toBeVisible();
            await expect.element(modal.getByLabelText("Body font")).not.toBeVisible();
        } else {
            await expect.element(modal.getByLabelText("Title font")).toBeVisible();
            await expect.element(modal.getByLabelText("Body font")).toBeVisible();
        }
    });
});
