import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { currentRoute, fakeSettingsScreens, renderAdminApp } from "@test-utils/acceptance";
import { settingsScreen } from "./settings.screen";

describe("Settings search", () => {
    it("hides and shows groups based on the search term", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        await settingsScreen.search().fill("design");
        await expect.element(settingsScreen.design()).toBeVisible();
        await expect.element(settingsScreen.titleAndDescription()).not.toBeVisible();

        await settingsScreen.search().fill("title");
        await expect.element(settingsScreen.design()).not.toBeVisible();
        await expect.element(settingsScreen.titleAndDescription()).toBeVisible();
    });

    it("shows the empty-search state without hiding the settings groups", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        await settingsScreen.search().fill("no-setting-matches-this");

        await expect.element(settingsScreen.noSearchResults()).toBeVisible();
        await expect.element(settingsScreen.design()).toBeVisible();
        await expect.element(settingsScreen.titleAndDescription()).toBeVisible();
    });

    it("keeps the search in place when Escape blurs it and focuses it again with slash", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        const search = settingsScreen.search();
        await search.fill("design");
        await userEvent.keyboard("{Escape}");

        await expect.poll(() => document.activeElement === search.element()).toBe(false);
        await expect.element(search).toHaveValue("design");
        await expect.poll(currentRoute).toBe("/settings");

        await userEvent.keyboard("/");
        await expect.poll(() => document.activeElement === search.element()).toBe(true);
    });

    it("clears the search when navigating from a matching sidebar item", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        await settingsScreen.search().fill("design");
        await settingsScreen.navItem("Design & branding").click();

        await expect.element(settingsScreen.search()).toHaveValue("");
        await expect.poll(currentRoute).toBe("/settings/design");
        await expect.element(settingsScreen.titleAndDescription()).toBeVisible();
    });
});
