import { describe, expect, it } from "vitest";

import {
    fakeAdminEndpoint,
    fakeEditSettings,
    fakeSettingsScreens,
    fakeSitePreview,
    post,
    renderAdminApp,
    siteResponse,
} from "@test-utils/acceptance";
import * as sel from "@tryghost/test-data/selectors/settings";
import { settingsScreen } from "@/settings/settings.screen";

const previewHtml = "<html><head><style></style></head><body>preview</body></html>";

function latestPost(): string {
    const latest = post({ url: "http://test.com/latest/" });
    if (!latest.url) {
        throw new Error("Post fixture requires a URL");
    }
    fakeAdminEndpoint("GET", /^\/posts\/.+limit=1/, { posts: [latest] });
    return latest.url;
}

function siteUrl(): string {
    const url = siteResponse().site.url;
    if (typeof url !== "string") {
        throw new Error("Site fixture requires a URL");
    }
    return url;
}

describe("Announcement bar", () => {
    it("requests homepage and post previews and switches device size", async () => {
        fakeSettingsScreens();
        const latestUrl = latestPost();
        const homepagePreview = fakeSitePreview(siteUrl(), previewHtml);
        const postPreview = fakeSitePreview(latestUrl, previewHtml);
        await renderAdminApp("/settings/announcement-bar/edit");

        const modal = settingsScreen.announcementBarModal();
        await expect.element(modal.getByTestId(sel.announcementBarPreviewIframe)).toBeVisible();
        await expect(homepagePreview).toHaveRequestedPreview({ announcement_bg: "dark", announcement: "" });

        await modal.getByTestId(sel.designToolbar).getByRole("tab", { name: "Post" }).click();
        await expect(postPreview).toHaveRequestedPreview({ announcement_bg: "dark", announcement: "" });
        expect(homepagePreview.requests[0]?.accept).toContain("text/html");

        await modal.getByRole("radio", { name: "Mobile" }).click();
        await expect.element(modal.getByTestId(sel.previewMobile)).toBeVisible();
        await modal.getByRole("radio", { name: "Desktop" }).click();
        await expect(modal.getByTestId(sel.previewMobile)).toHaveCount(0);
    });

    it("saves the selected background colour", async () => {
        fakeSettingsScreens();
        latestPost();
        fakeSitePreview(siteUrl(), previewHtml);
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/announcement-bar/edit");

        const modal = settingsScreen.announcementBarModal();
        await modal.getByRole("button", { name: "Light" }).click();
        await modal.getByRole("button", { name: "Save" }).click();

        await expect(settingsApi).toHaveEditedSettings([
            { key: "announcement_background", value: "light" },
        ]);
    });

    it("saves audience visibility", async () => {
        fakeSettingsScreens();
        latestPost();
        fakeSitePreview(siteUrl(), previewHtml);
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/announcement-bar/edit");

        const modal = settingsScreen.announcementBarModal();
        await modal.getByRole("checkbox", { name: "Free members" }).click();
        await modal.getByRole("button", { name: "Save" }).click();

        await expect(settingsApi).toHaveEditedSettings([
            { key: "announcement_visibility", value: '["free_members"]' },
        ]);
    });
});
