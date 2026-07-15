import { describe, expect, it } from "vitest";

import { fakeAdminEndpoint, fakeEditSettings, fakeSettingsScreens, renderAdminApp, settingsResponse } from "@test-utils/acceptance";
import { settingsScreen } from "@/settings/settings.screen";

function imageFile(): File {
    return new File([new Uint8Array([137, 80, 78, 71])], "image.png", { type: "image/png" });
}

function fakeImageUpload(url: string): void {
    fakeAdminEndpoint("POST", "/images/upload/", { images: [{ url, ref: null }] });
}

describe("SEO meta settings", () => {
    it("toggles LLM structured data when the feature flag is on", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings", {
            labs: { llmsTxt: true },
        });

        const section = settingsScreen.seoMeta();
        const toggle = section.getByLabelText("Enable structured data for LLMs and AI search engines");
        await expect.element(toggle).toBeVisible();
        await expect.element(toggle).toBeChecked();
        await toggle.click();
        await section.getByRole("button", { name: "Save" }).click();

        await expect(settingsApi).toHaveEditedSettings([{ key: "llms_enabled", value: false }]);
    });

    it("re-enables persisted-disabled LLM structured data", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings", {
            labs: { llmsTxt: true },
            boot: { browseSettings: { response: settingsResponse({ labs: { llmsTxt: true }, settings: { llms_enabled: false } }) } },
        });

        const section = settingsScreen.seoMeta();
        const toggle = section.getByLabelText("Enable structured data for LLMs and AI search engines");
        await expect.element(toggle).not.toBeChecked();
        await toggle.click();
        await section.getByRole("button", { name: "Save" }).click();

        await expect(settingsApi).toHaveEditedSettings([{ key: "llms_enabled", value: true }]);
    });

    it("hides LLM structured data when the feature flag is off", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        const section = settingsScreen.seoMeta();
        await expect.element(section.getByLabelText("Meta title")).toBeVisible();
        await expect(section.getByLabelText("Enable structured data for LLMs and AI search engines")).toHaveCount(0);
    });

    it("edits search metadata", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        const section = settingsScreen.seoMeta();
        await section.getByLabelText("Meta title").fill("Alternative title");
        await section.getByLabelText("Meta description").fill("Alternative description");
        await section.getByRole("button", { name: "Save" }).click();

        await expect.element(section.getByLabelText("Meta title")).toHaveValue("Alternative title");
        await expect(settingsApi).toHaveEditedSettings([
            { key: "meta_title", value: "Alternative title" },
            { key: "meta_description", value: "Alternative description" },
        ]);
    });

    it("edits the Facebook card", async () => {
        fakeSettingsScreens();
        fakeImageUpload("http://example.com/image.png");
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        const section = settingsScreen.seoMeta();
        await section.getByRole("tab", { name: "Facebook card" }).click();
        await section.getByLabelText("Upload Facebook image").upload(imageFile());
        await expect.poll(() => document.getElementById("facebook-image")?.getAttribute("src")).toBe("http://example.com/image.png");
        await section.getByLabelText("Facebook title").fill("Facetitle");
        await section.getByLabelText("Facebook description").fill("Facescription");
        await section.getByRole("button", { name: "Save" }).click();

        await expect(settingsApi).toHaveEditedSettings([
            { key: "og_image", value: "http://example.com/image.png" },
            { key: "og_title", value: "Facetitle" },
            { key: "og_description", value: "Facescription" },
        ]);
    });

    it("edits the X card", async () => {
        fakeSettingsScreens();
        fakeImageUpload("http://example.com/image.png");
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        const section = settingsScreen.seoMeta();
        await section.getByRole("tab", { name: "X card" }).click();
        await section.getByLabelText("Upload X image").upload(imageFile());
        await expect.poll(() => document.getElementById("twitter-image")?.getAttribute("src")).toBe("http://example.com/image.png");
        await section.getByLabelText("X title").fill("Twititle");
        await section.getByLabelText("X description").fill("Twitscription");
        await section.getByRole("button", { name: "Save" }).click();

        await expect(settingsApi).toHaveEditedSettings([
            { key: "twitter_image", value: "http://example.com/image.png" },
            { key: "twitter_title", value: "Twititle" },
            { key: "twitter_description", value: "Twitscription" },
        ]);
    });

    it("shows an error when an image has an unsupported file type", async () => {
        fakeSettingsScreens();
        const uploadApi = fakeAdminEndpoint("POST", "/images/upload/", {
            errors: [{ message: "Unsupported image", type: "UnsupportedMediaTypeError" }],
        }, { status: 415 });
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        const section = settingsScreen.seoMeta();
        await section.getByRole("tab", { name: "Facebook card" }).click();
        await section.getByLabelText("Upload Facebook image").upload(imageFile());

        await expect.element(settingsScreen.errorToast()).toHaveTextContent("Unsupported file type");
        expect(uploadApi.requests).toHaveLength(1);
        expect(settingsApi.requests).toHaveLength(0);
        await expect(section.getByTestId("image-upload-container")).toHaveCount(0);
    });

    it("saves metadata edited across all tabs in one request", async () => {
        fakeSettingsScreens();
        fakeImageUpload("http://example.com/facebook.png");
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        const section = settingsScreen.seoMeta();
        await section.getByLabelText("Meta title").fill("SEO Title");
        await section.getByLabelText("Meta description").fill("SEO Description");
        await section.getByRole("tab", { name: "Facebook card" }).click();
        await section.getByLabelText("Upload Facebook image").upload(imageFile());
        await section.getByLabelText("Facebook title").fill("FB Title");
        await section.getByLabelText("Facebook description").fill("FB Description");
        await section.getByRole("tab", { name: "X card" }).click();
        await section.getByLabelText("X title").fill("X Title");
        await section.getByLabelText("X description").fill("X Description");
        await section.getByRole("button", { name: "Save" }).click();

        await section.getByRole("tab", { name: "Search" }).click();
        await expect.element(section.getByLabelText("Meta title")).toHaveValue("SEO Title");
        await section.getByRole("tab", { name: "Facebook card" }).click();
        await expect.element(section.getByLabelText("Facebook title")).toHaveValue("FB Title");
        await section.getByRole("tab", { name: "X card" }).click();
        await expect.element(section.getByLabelText("X title")).toHaveValue("X Title");
        await expect(settingsApi).toHaveEditedSettings([
            { key: "meta_title", value: "SEO Title" },
            { key: "meta_description", value: "SEO Description" },
            { key: "og_image", value: "http://example.com/facebook.png" },
            { key: "og_title", value: "FB Title" },
            { key: "og_description", value: "FB Description" },
            { key: "twitter_title", value: "X Title" },
            { key: "twitter_description", value: "X Description" },
        ]);
    });

    it("navigates between card tabs", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        const section = settingsScreen.seoMeta();
        const tabs = settingsScreen.seoTabView();
        await expect.element(tabs.getByRole("tab", { name: "Search" })).toHaveAttribute("aria-selected", "true");
        await expect.element(section.getByLabelText("Meta title")).toBeVisible();

        await section.getByRole("tab", { name: "Facebook card" }).click();
        await expect.element(tabs.getByRole("tab", { name: "Facebook card" })).toHaveAttribute("aria-selected", "true");
        await expect.element(section.getByLabelText("Facebook title")).toBeVisible();
        await expect(section.getByLabelText("Meta title")).toHaveCount(0);

        await section.getByRole("tab", { name: "X card" }).click();
        await expect.element(tabs.getByRole("tab", { name: "X card" })).toHaveAttribute("aria-selected", "true");
        await expect.element(section.getByLabelText("X title")).toBeVisible();
        await expect(section.getByLabelText("Facebook title")).toHaveCount(0);

        await section.getByRole("tab", { name: "Search" }).click();
        await expect.element(tabs.getByRole("tab", { name: "Search" })).toHaveAttribute("aria-selected", "true");
        await expect.element(section.getByLabelText("Meta title")).toBeVisible();
        await expect(section.getByLabelText("X title")).toHaveCount(0);
    });

    it("deletes an existing Facebook card image", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings", {
            boot: { browseSettings: { response: settingsResponse({ settings: { og_image: "http://example.com/original.png" } }) } },
        });

        const section = settingsScreen.seoMeta();
        await section.getByRole("tab", { name: "Facebook card" }).click();
        await expect.poll(() => document.getElementById("facebook-image")?.getAttribute("src")).toBe("http://example.com/original.png");
        await section.getByTestId("image-delete-button").click();
        await section.getByRole("button", { name: "Save" }).click();

        await expect(settingsApi).toHaveEditedSettings([{ key: "og_image", value: "" }]);
    });
});
