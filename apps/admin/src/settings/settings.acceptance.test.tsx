import { describe, expect, it } from "vitest";

import { mockEditSettings, mockSettingsScreens, renderAdminApp } from "@test-utils/acceptance";

// Probe: admin-x-settings screens driven through the real admin shell — the
// lazy /settings/* route, the legacy RoutingProvider and design system
// included. Mirrors the legacy Playwright spec
// apps/admin-x-settings/test/acceptance/general/title-and-description.test.ts.

describe("Settings", () => {
    it("shows the General settings populated from the API", async () => {
        mockSettingsScreens();
        const screen = await renderAdminApp({ route: "/settings" });

        const section = screen.getByTestId("title-and-description");
        await expect.element(section).toBeVisible();
        await expect.element(section).toHaveTextContent("Test Site");
        await expect.element(section).toHaveTextContent("Thoughts, stories and ideas.");

        // The staff section renders from the users request — asserting on it
        // proves the settings-chrome requests resolved inside the test window
        // (they land after the settings groups above render from cached boot
        // data, so title assertions alone would pass before they fire).
        await expect.element(screen.getByTestId("users")).toHaveTextContent("Owner User");
    });

    it("saves an edited site title and sends only the changed settings", async () => {
        mockSettingsScreens();
        const editSettings = mockEditSettings();
        const screen = await renderAdminApp({ route: "/settings" });

        const section = screen.getByTestId("title-and-description");
        await expect.element(section).toHaveTextContent("Test Site");

        await section.getByRole("button", { name: "Edit" }).click();
        await section.getByLabelText("Site title").fill("New Site Title");
        await section.getByRole("button", { name: "Save" }).click();

        // Saving flips the group back to view mode with the new value.
        await expect.element(section).toHaveTextContent("New Site Title");
        expect(editSettings.lastRequest).toEqual({
            settings: [{ key: "title", value: "New Site Title" }],
        });
    });
});
