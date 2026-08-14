import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import {
    activeThemeResponse,
    fakeAdminEndpoint,
    fakeEditSettings,
    fakeEndpoint,
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

        await modal.getByRole("radio", { name: "Mobile" }).click();
        await expect.element(modal.getByTestId(sel.previewMobile)).toBeVisible();
        await modal.getByRole("radio", { name: "Desktop" }).click();
        await expect(modal.getByTestId(sel.previewMobile)).toHaveCount(0);
    });

    it("confirms before discarding unsaved brand changes", async () => {
        const { homepagePreview } = fakeDesignWorld();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/design/edit");

        const modal = settingsScreen.designModal();
        const color = modal.getByTestId(sel.accentColorPicker);
        await color.getByRole("button").click();
        await page.getByRole("textbox", { name: "Hex color" }).fill("#cd5786");
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
        await page.getByRole("textbox", { name: "Hex color" }).fill("#cd5786");

        await expect(homepagePreview).toHaveRequestedPreview({ c: "#cd5786" });
        await expect.element(modal.getByTestId(sel.toggleUnsplashButton)).toBeVisible();
        await modal.getByRole("button", { name: "Save" }).click();
        await expect(settingsApi).toHaveEditedSettings([{ key: "accent_color", value: "#cd5786" }]);
    });

    it("confirms before discarding unsaved theme-tab changes", async () => {
        const emailSignupText: CustomThemeSetting = { id: "email-signup-text", key: "email_signup_text", type: "text", default: null, value: null };
        fakeDesignWorld([navigationLayout(), emailSignupText]);
        const settingsApi = fakeEditSettings();
        const editThemeApi = fakeAdminEndpoint("PUT", "/custom_theme_settings/", ({ body }) => body);
        await renderAdminApp("/settings/design/edit");

        const modal = await openThemeTab();
        await modal.getByLabelText("Email signup text").fill("test");
        await modal.getByRole("button", { name: "Close" }).click();

        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
        await settingsScreen.confirmationAction("Leave").click();
        await expect(settingsScreen.designModal()).toHaveCount(0);
        expect(settingsApi.requests).toHaveLength(0);
        expect(editThemeApi.requests).toHaveLength(0);
    });

    it("picks a cover image from the Unsplash photo grid", async () => {
        const testImage = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
        const unsplashPhoto = {
            id: "test-unsplash-photo",
            slug: "test-unsplash-photo",
            created_at: "2026-06-22T00:00:00Z",
            updated_at: "2026-06-22T00:00:00Z",
            promoted_at: null,
            width: 1200,
            height: 800,
            color: "#f0f0f0",
            blur_hash: "LKO2?U%2Tw=w]~RBVZRi};RPxuwH",
            description: null,
            alt_description: "A fake Unsplash test image",
            urls: { raw: testImage, full: testImage, regular: testImage, small: testImage, thumb: testImage },
            links: {
                self: "https://api.unsplash.com/photos/test-unsplash-photo",
                html: "https://unsplash.com/photos/test-unsplash-photo",
                download: "https://unsplash.com/photos/test-unsplash-photo/download",
                download_location: "https://api.unsplash.com/photos/test-unsplash-photo/download",
            },
            likes: 1,
            liked_by_user: false,
            current_user_collections: [],
            sponsorship: null,
            topic_submissions: {},
            user: {
                id: "test-user",
                updated_at: "2026-06-22T00:00:00Z",
                username: "testuser",
                name: "Test User",
                first_name: "Test",
                last_name: "User",
                links: { self: "https://api.unsplash.com/users/testuser", html: "https://unsplash.com/@testuser" },
                profile_image: { small: testImage, medium: testImage, large: testImage },
                total_photos: 1,
            },
        };
        const { homepagePreview } = fakeDesignWorld();
        fakeEndpoint("GET", "https://api.unsplash.com/photos", [unsplashPhoto]);
        const downloadApi = fakeEndpoint("GET", unsplashPhoto.links.download_location, { url: testImage });
        await renderAdminApp("/settings/design/edit");

        const modal = settingsScreen.designModal();
        await modal.getByTestId(sel.toggleUnsplashButton).click();
        const galleryImage = page.getByAltText(unsplashPhoto.alt_description);
        await expect.element(galleryImage).toBeVisible();

        // The hover overlay covers the image, so target its action directly.
        await page.getByText("Insert image").click();

        await expect.element(modal.getByTestId("publication-cover").getByTestId("image-upload-container")).toBeVisible();
        await expect(homepagePreview).toHaveRequestedPreview({ cover: testImage });
        await expect.poll(() => downloadApi.requests.length).toBe(1);
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
