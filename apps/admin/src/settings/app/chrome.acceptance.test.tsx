import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { currentRoute, enableShadeSettingsMode, fakeSettingsScreens, isShadeSettingsRun, renderAdminApp } from "@test-utils/acceptance";
import { settingsScreen } from "@/settings/settings.screen";

// Passes in both modes: the flag is forced on via `labs` here, so default
// (legacy) runs exercise the Shade chrome too, and SHADE_SETTINGS=1 runs
// pick the file up through the opt-in below.
enableShadeSettingsMode();

const SHADE_LABS = { shadeSettings: true };

describe("Shade settings chrome", () => {
    it("boots the settings UI this run targets without per-test labs", async () => {
        // Exercises the dual-mode boot-table injection: no `labs` override, so
        // SHADE_SETTINGS=1 runs mount the Shade shell purely through the
        // opted-in boot defaults — the path rebuilt area suites rely on.
        // Default runs mount the legacy app; both need the screen fakes.
        fakeSettingsScreens();
        await renderAdminApp("/settings");

        await expect.element(settingsScreen.sidebar()).toBeVisible();
        await expect.element(settingsScreen.titleAndDescription()).toBeVisible();
        if (isShadeSettingsRun) {
            await expect.element(settingsScreen.section("settings-area-general")).toBeVisible();
        } else {
            await expect(settingsScreen.section("settings-area-general")).toHaveCount(0);
        }
    });

    it("renders the sidebar groups, native areas and placeholder area sections", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", { labs: SHADE_LABS });

        await expect.element(settingsScreen.sidebar()).toBeVisible();
        for (const group of ["General settings", "Site", "Membership", "Growth", "Advanced"]) {
            await expect.element(settingsScreen.sidebar().getByText(group, { exact: true })).toBeVisible();
        }
        await expect.element(settingsScreen.navItem("Design & branding")).toBeVisible();

        // The general, site, membership, email and growth areas are rebuilt
        // natively; the rest still render placeholders.
        await expect.element(settingsScreen.section("settings-area-general")).toBeVisible();
        await expect.element(settingsScreen.titleAndDescription()).toBeVisible();
        await expect(settingsScreen.section("settings-area-general-placeholder")).toHaveCount(0);
        await expect.element(settingsScreen.section("settings-area-site")).toBeVisible();
        await expect.element(settingsScreen.design()).toBeVisible();
        await expect(settingsScreen.section("settings-area-site-placeholder")).toHaveCount(0);
        await expect.element(settingsScreen.section("settings-area-membership")).toBeVisible();
        await expect.element(settingsScreen.access()).toBeVisible();
        await expect(settingsScreen.section("settings-area-membership-placeholder")).toHaveCount(0);
        await expect.element(settingsScreen.section("settings-area-email")).toBeVisible();
        await expect.element(settingsScreen.enableNewsletters()).toBeVisible();
        await expect(settingsScreen.section("settings-area-email-placeholder")).toHaveCount(0);
        await expect.element(settingsScreen.section("settings-area-growth")).toBeVisible();
        await expect.element(settingsScreen.network()).toBeVisible();
        await expect(settingsScreen.section("settings-area-growth-placeholder")).toHaveCount(0);
        await expect.element(settingsScreen.section("settings-area-advanced")).toBeVisible();
        await expect.element(settingsScreen.section("settings-area-advanced-placeholder")).toBeVisible();
        await expect.element(settingsScreen.section("settings-area-advanced-placeholder")).toHaveTextContent("#/settings/integrations");
    });

    it("filters the sidebar and sections by keyword and shows the no-result state", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", { labs: SHADE_LABS });

        await settingsScreen.search().fill("design");
        await expect.element(settingsScreen.navItem("Design & branding")).toBeVisible();
        await expect(settingsScreen.navItem("Timezone")).toHaveCount(0);
        await expect.element(settingsScreen.section("settings-area-site")).toBeVisible();
        // Filtered-out sections hide but stay in the DOM (legacy contract).
        await expect.element(settingsScreen.section("settings-area-advanced")).not.toBeVisible();

        await settingsScreen.search().fill("no-setting-matches-this");
        await expect.element(settingsScreen.noSearchResults()).toBeVisible();
        // The nothing-matched state keeps every section visible, mirroring legacy.
        await expect.element(settingsScreen.section("settings-area-site")).toBeVisible();
        await expect.element(settingsScreen.section("settings-area-general")).toBeVisible();
    });

    it("navigates to an area from the sidebar and clears the search", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", { labs: SHADE_LABS });

        await settingsScreen.search().fill("design");
        await settingsScreen.navItem("Design & branding").click();

        await expect.poll(currentRoute).toBe("/settings/design");
        await expect.element(settingsScreen.search()).toHaveValue("");
        await expect.element(settingsScreen.section("settings-area-general")).toBeVisible();
    });

    it("focuses the search with slash and blurs it with Escape, keeping the value", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", { labs: SHADE_LABS });

        const search = settingsScreen.search();
        await search.fill("design");
        await userEvent.keyboard("{Escape}");

        await expect.poll(() => document.activeElement === search.element()).toBe(false);
        await expect.element(search).toHaveValue("design");
        await expect.poll(currentRoute).toBe("/settings");

        await userEvent.keyboard("/");
        await expect.poll(() => document.activeElement === search.element()).toBe(true);
    });

    it("exits settings with Escape when no modal is open", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", { labs: SHADE_LABS });

        await expect.element(settingsScreen.sidebar()).toBeVisible();
        await userEvent.keyboard("{Escape}");

        await expect.poll(currentRoute).toBe("/");
    });

    it("leaves settings from the exit button", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", { labs: SHADE_LABS });

        await settingsScreen.exitButton().click();

        await expect.poll(currentRoute).toBe("/");
    });

    it("keeps known legacy deep links and redirects unknown ones to the index", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings/design", { labs: SHADE_LABS });
        await expect.element(settingsScreen.section("settings-area-site")).toBeVisible();
        await expect.poll(currentRoute).toBe("/settings/design");
    });

    it("redirects not-yet-rebuilt deep links to the settings index", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings/history/view/123", { labs: SHADE_LABS });

        await expect.poll(currentRoute).toBe("/settings");
        await expect.element(settingsScreen.sidebar()).toBeVisible();
    });
});
