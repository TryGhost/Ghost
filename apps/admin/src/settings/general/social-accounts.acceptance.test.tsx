import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { fakeEditSettings, fakeSettingsScreens, renderAdminApp, settingsResponse, type SettingsResponse } from "@test-utils/acceptance";
import { settingsScreen } from "@/settings/settings.screen";

const newPlatformKeys = ["threads", "bluesky", "mastodon", "tiktok", "youtube", "instagram", "linkedin"];
const platformLabels = ["Facebook", "X", "LinkedIn", "Bluesky", "Threads", "Mastodon", "TikTok", "YouTube", "Instagram"];

const editedSocialSettings = [
    { key: "facebook", value: "fb", label: "Facebook", displayValue: "https://www.facebook.com/fb" },
    { key: "twitter", value: "@tw", label: "X", displayValue: "https://x.com/tw" },
    { key: "linkedin", value: "ghost-team", label: "LinkedIn", displayValue: "https://www.linkedin.com/in/ghost-team" },
    { key: "bluesky", value: "ghost.bsky.social", label: "Bluesky", displayValue: "https://bsky.app/profile/ghost.bsky.social" },
    { key: "threads", value: "@ghostteam", label: "Threads", displayValue: "https://www.threads.net/@ghostteam" },
    { key: "mastodon", value: "mastodon.social/@ghost", label: "Mastodon", displayValue: "https://mastodon.social/@ghost" },
    { key: "tiktok", value: "@ghostteam", label: "TikTok", displayValue: "https://www.tiktok.com/@ghostteam" },
    { key: "youtube", value: "@ghostteam", label: "YouTube", displayValue: "https://www.youtube.com/@ghostteam" },
    { key: "instagram", value: "ghostteam", label: "Instagram", displayValue: "https://www.instagram.com/ghostteam" },
] as const;

function withoutSettings(keys: string[]): SettingsResponse {
    const response = settingsResponse();
    response.settings = response.settings.filter(({ key }) => !keys.includes(key));
    return response;
}

describe("Social account settings", () => {
    it("edits all publication social URLs", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        const section = settingsScreen.socialAccounts();
        await expect.element(section.getByLabelText("Facebook")).toHaveValue("https://www.facebook.com/ghost");
        await expect.element(section.getByLabelText("X")).toHaveValue("https://x.com/ghost");

        for (const field of editedSocialSettings) {
            await section.getByLabelText(field.label).fill(field.displayValue);
        }
        await section.getByRole("button", { name: "Save" }).click();

        for (const field of editedSocialSettings) {
            await expect.element(section.getByLabelText(field.label)).toHaveValue(field.displayValue);
        }
        await expect(settingsApi).toHaveEditedSettings(
            editedSocialSettings.map(({ key, value }) => ({ key, value })),
        );
    });

    it("hides new platforms when the backend has not deployed them", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", {
            boot: { browseSettings: { response: withoutSettings(newPlatformKeys) } },
        });

        const section = settingsScreen.socialAccounts();
        await expect.element(section.getByLabelText("Facebook")).toBeVisible();
        await expect.element(section.getByLabelText("X")).toBeVisible();
        for (const label of platformLabels.slice(2)) {
            await expect(section.getByLabelText(label)).toHaveCount(0);
        }
    });

    it("shows all new platforms when any migrated key is present", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", {
            boot: { browseSettings: { response: withoutSettings(newPlatformKeys.filter(key => key !== "threads")) } },
        });

        for (const label of platformLabels) {
            await expect.element(settingsScreen.socialAccounts().getByLabelText(label)).toBeVisible();
        }
    });

    it("restores values on cancel", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        const section = settingsScreen.socialAccounts();
        const linkedin = section.getByLabelText("LinkedIn");
        const instagram = section.getByLabelText("Instagram");
        await linkedin.fill("https://www.linkedin.com/in/ghost-team");
        await instagram.fill("https://www.instagram.com/ghostteam");
        await section.getByRole("button", { name: "Cancel" }).click();

        await expect.element(linkedin).toHaveValue("");
        await expect.element(instagram).toHaveValue("");
    });

    it("normalizes and validates social URLs", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        const section = settingsScreen.socialAccounts();
        const cases = [
            ["Facebook", "facebook.com/username", "https://www.facebook.com/username"],
            ["Facebook", "testuser", "https://www.facebook.com/testuser"],
            ["Facebook", "ab99", "https://www.facebook.com/ab99"],
            ["Facebook", "page/ab99", "https://www.facebook.com/page/ab99"],
            ["Facebook", "page/*(&*(%%))", "https://www.facebook.com/page/*(&*(%%))"],
            ["Facebook", "facebook.com/pages/some-facebook-page/857469375913?ref=ts", "https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts"],
            ["Facebook", "https://www.facebook.com/groups/savethecrowninn", "https://www.facebook.com/groups/savethecrowninn"],
            ["Facebook", "http://github.com/username", "http://github.com/username", "The URL must be in a format like https://www.facebook.com/yourPage"],
            ["Facebook", "facebook.com/valid", "https://www.facebook.com/valid"],
            ["Facebook", "http://github.com/pages/username", "http://github.com/pages/username", "The URL must be in a format like https://www.facebook.com/yourPage"],
            ["X", "twitter.com/username", "https://x.com/username"],
            ["X", "testuser", "https://x.com/testuser"],
            ["X", "http://github.com/username", "http://github.com/username", "The URL must be in a format like https://x.com/yourUsername"],
            ["X", "*(&*(%%))", "*(&*(%%))", "Your Username is not a valid Twitter Username"],
            ["X", "testuser", "https://x.com/testuser"],
            ["X", "thisusernamehasmorethan15characters", "thisusernamehasmorethan15characters", "Your Username is not a valid Twitter Username"],
            ["LinkedIn", "ghost-team", "https://www.linkedin.com/in/ghost-team"],
            ["LinkedIn", "https://github.com/ghost", "https://github.com/ghost", "The URL must be in a format like https://www.linkedin.com/in/yourUsername"],
            ["Bluesky", "ghost.bsky.social", "https://bsky.app/profile/ghost.bsky.social"],
            ["Threads", "@ghostteam", "https://www.threads.net/@ghostteam"],
            ["Mastodon", "@ghost@mastodon.social", "https://mastodon.social/@ghost"],
            ["TikTok", "ghostteam", "https://www.tiktok.com/@ghostteam"],
            ["YouTube", "@ghostteam", "https://www.youtube.com/@ghostteam"],
            ["Instagram", "ghostteam", "https://www.instagram.com/ghostteam"],
        ] as const;

        for (const [label, input, expected, error] of cases) {
            const field = section.getByLabelText(label);
            await field.fill(input);
            await userEvent.tab();
            await expect.element(field).toHaveValue(expected);
            if (error) {
                await expect.element(section).toHaveTextContent(error);
            }
        }
    });

    it("keeps invalid input after a valid value", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        const section = settingsScreen.socialAccounts();
        const instagram = section.getByLabelText("Instagram");
        await instagram.fill("ghostteam");
        await userEvent.tab();
        await expect.element(instagram).toHaveValue("https://www.instagram.com/ghostteam");

        await instagram.fill("https://www.instagram.com/ghostteam.");
        await expect.element(instagram).toHaveValue("https://www.instagram.com/ghostteam.");
        await expect.element(section).toHaveTextContent("Your Username is not a valid Instagram Username");
    });

    it("does not rewrite a Mastodon handle while typing", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        const mastodon = settingsScreen.socialAccounts().getByLabelText("Mastodon");
        await mastodon.click();
        await userEvent.type(mastodon.element(), "@ghost@example.com");
        await expect.element(mastodon).toHaveValue("@ghost@example.com");
        await userEvent.tab();
        await expect.element(mastodon).toHaveValue("https://example.com/@ghost");
    });

    it("allows a federated Mastodon URL", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        const section = settingsScreen.socialAccounts();
        const mastodon = section.getByLabelText("Mastodon");
        await mastodon.click();
        await userEvent.type(mastodon.element(), "https://mastodon.social/@ghost@example.com");
        await expect.element(mastodon).toHaveValue("https://mastodon.social/@ghost@example.com");
        await userEvent.tab();
        await expect.element(mastodon).toHaveValue("https://mastodon.social/@ghost@example.com");
        await expect.element(section).not.toHaveTextContent("The URL must be in a format");
    });

    it("does not block unrelated saves on a stale stored value", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings", {
            boot: { browseSettings: { response: settingsResponse({ settings: { threads: "@ghost.tld." } }) } },
        });

        const section = settingsScreen.socialAccounts();
        await expect.element(section.getByLabelText("Threads")).toHaveValue("@ghost.tld.");
        await expect.element(section).not.toHaveTextContent("The URL must be in a format like https://www.threads.net/@yourUsername");
        await section.getByLabelText("Facebook").fill("fb");
        await section.getByRole("button", { name: "Save" }).click();

        await expect(settingsApi).toHaveEditedSettings([{ key: "facebook", value: "fb" }]);
    });

    it("blocks a first invalid edit when another field is dirty", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings");

        const section = settingsScreen.socialAccounts();
        await section.getByLabelText("Facebook").fill("fb");
        await section.getByLabelText("Instagram").fill("john..smith");
        await section.getByRole("button", { name: "Save" }).click();

        await expect.element(section).toHaveTextContent("Your Username is not a valid Instagram Username");
        expect(settingsApi.requests).toHaveLength(0);
    });
});
