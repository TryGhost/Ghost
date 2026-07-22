import { describe, expect, it } from "vitest";

import {
    activeThemeResponse,
    allowUnhandledRequests,
    currentRoute,
    fakeAdminEndpoint,
    fakeEndpoint,
    fakeTags,
    renderAdminApp,
    currentUserResponse,
    settingsResponse,
    type RenderAdminAppOptions,
} from "@test-utils/acceptance";
import { sidebarScreen } from "./sidebar.screen";

// The site fixture's URL roots the ActivityPub API (see use-activity-pub-queries.ts).
const UNREAD_COUNT_URL = "http://test.com/.ghost/activitypub/v1/notifications/unread/count";

function socialWebEnabled(): RenderAdminAppOptions {
    return { boot: { browseSettings: { response: settingsResponse({ settings: { social_web_enabled: true } }) } } };
}

function fakeUnreadNotifications(count: number): void {
    fakeAdminEndpoint("GET", "/identities/", { identities: [{ token: "test-token" }] });
    fakeEndpoint("GET", UNREAD_COUNT_URL, { count });
}

describe("Sidebar navigation", () => {
    it("renders the navigation for the current user", async () => {
        await renderAdminApp("/");

        await expect.element(sidebarScreen.navLink("Analytics")).toBeVisible();
        await expect.element(sidebarScreen.navLink("View site")).toBeVisible();
        await expect.element(sidebarScreen.navLink("Posts")).toBeVisible();
        await expect.element(sidebarScreen.navLink("Pages")).toBeVisible();
        await expect.element(sidebarScreen.navLink("Tags")).toBeVisible();
        await expect.element(sidebarScreen.navLink("Members")).toBeVisible();
        await expect.element(sidebarScreen.navLink("Settings")).toBeVisible();
        await expect.element(sidebarScreen.userMenuTrigger()).toBeVisible();
        // The Network item requires the social_web_enabled setting, off by default.
        await expect.element(sidebarScreen.navLink("Network")).not.toBeInTheDocument();
    });

    it("clicking a nav item navigates and updates the active state", async () => {
        fakeTags([]);
        await renderAdminApp("/");

        await sidebarScreen.navLink("Tags").click();
        await expect.poll(currentRoute).toBe("/tags");
        await expect.element(sidebarScreen.navLink("Tags")).toHaveAttribute("aria-current", "page");

        await sidebarScreen.navLink("View site").click();
        await expect.poll(currentRoute).toBe("/site");
        await expect.element(sidebarScreen.navLink("View site")).toHaveAttribute("aria-current", "page");
        await expect.element(sidebarScreen.navLink("Tags")).not.toHaveAttribute("aria-current");
    });

    it("clicking Posts and Pages navigates to the Ember-owned lists", async () => {
        // Posts/Pages active states come from the Ember routing bridge, absent in this tier.
        await renderAdminApp("/");

        await sidebarScreen.navLink("Posts").click();
        await expect.poll(currentRoute).toBe("/posts");

        await sidebarScreen.navLink("Pages").click();
        await expect.poll(currentRoute).toBe("/pages");
    });

    it("shows the default post views and collapses them with the toggle", async () => {
        await renderAdminApp("/posts");

        await expect.element(sidebarScreen.postsToggle()).toHaveAttribute("aria-expanded", "true");
        await expect.element(sidebarScreen.navLink("Drafts")).toBeVisible();
        await expect.element(sidebarScreen.navLink("Scheduled")).toBeVisible();
        await expect.element(sidebarScreen.navLink("Published")).toBeVisible();

        await sidebarScreen.postsToggle().click();

        await expect.element(sidebarScreen.postsToggle()).toHaveAttribute("aria-expanded", "false");
        await expect.element(sidebarScreen.navLink("Drafts")).not.toBeInTheDocument();
    });

    it("clicking a posts submenu item navigates to the filtered list", async () => {
        // The submenu item's active state comes from the Ember routing bridge, absent in this tier.
        await renderAdminApp("/posts");

        await sidebarScreen.navLink("Scheduled").click();

        await expect.poll(currentRoute).toBe("/posts?type=scheduled");
    });

    it("navigates to settings from the sidebar footer", async () => {
        // The settings app owns its request graph; this spec asserts only the shell navigation.
        allowUnhandledRequests();
        await renderAdminApp("/");

        await sidebarScreen.navLink("Settings").click();

        await expect.poll(currentRoute).toMatch(/^\/settings/);
    });
});

describe("Sidebar user menu", () => {
    it("opens the user menu with profile, appearance and sign-out items", async () => {
        await renderAdminApp("/");

        await sidebarScreen.userMenuTrigger().click();

        await expect.element(sidebarScreen.profileMenuItem()).toBeVisible();
        await expect.element(sidebarScreen.appearanceMenuItem()).toBeVisible();
        await expect.element(sidebarScreen.signOutMenuItem()).toBeVisible();
    });

    it("navigates to the profile settings from the user menu", async () => {
        // The settings app owns its request graph; this spec asserts only the shell navigation.
        allowUnhandledRequests();
        await renderAdminApp("/");

        await sidebarScreen.userMenuTrigger().click();
        await sidebarScreen.profileMenuItem().click();

        await expect.poll(currentRoute).toMatch(/^\/settings\/staff\//);
    });

    it("switches the appearance and shows the current choice", async () => {
        // Without the Ember bridge the app itself toggles the root dark class.
        const isDarkMode = () => document.documentElement.classList.contains("dark");
        await renderAdminApp("/");

        await sidebarScreen.selectAppearance("dark");
        await expect.poll(isDarkMode).toBe(true);

        await sidebarScreen.userMenuTrigger().click();
        await expect.element(sidebarScreen.appearanceMenuItem()).toHaveTextContent("Dark");
        await sidebarScreen.appearanceMenuItem().click();
        await sidebarScreen.appearanceOption("light").click();
        await expect.poll(isDarkMode).toBe(false);

        await sidebarScreen.userMenuTrigger().click();
        await expect.element(sidebarScreen.appearanceMenuItem()).toHaveTextContent("Light");
        await sidebarScreen.appearanceMenuItem().click();
        await sidebarScreen.appearanceOption("system").click();
        await expect.poll(isDarkMode).toBe(false);

        await sidebarScreen.userMenuTrigger().click();
        await expect.element(sidebarScreen.appearanceMenuItem()).toHaveTextContent("System");
    });
});

describe("Network notification badge", () => {
    it("shows the unread notifications count on the Network nav item", async () => {
        fakeUnreadNotifications(5);
        await renderAdminApp("/", socialWebEnabled());

        await expect.element(sidebarScreen.navLink("Network")).toBeVisible();
        await expect.element(sidebarScreen.networkBadge()).toHaveTextContent("5");
    });

    it("does not show a badge when there are no unread notifications", async () => {
        fakeUnreadNotifications(0);
        await renderAdminApp("/", socialWebEnabled());

        await expect.element(sidebarScreen.navLink("Network")).toBeVisible();
        await expect.element(sidebarScreen.networkBadge()).not.toBeInTheDocument();
    });

    it("hides the badge on the network route and restores it after navigating away", async () => {
        // The ActivityPub app owns its request graph; this spec asserts only the shell badge.
        allowUnhandledRequests();
        fakeUnreadNotifications(5);
        fakeAdminEndpoint("GET", "/users/?limit=100&include=roles", currentUserResponse());
        await renderAdminApp("/", socialWebEnabled());

        await expect.element(sidebarScreen.networkBadge()).toBeVisible();

        await sidebarScreen.navLink("Network").click();
        await expect.poll(currentRoute).toBe("/activitypub/welcome/1");
        await expect.element(sidebarScreen.networkBadge()).not.toBeInTheDocument();

        await sidebarScreen.navLink("Posts").click();
        await expect.poll(currentRoute).toBe("/posts");
        await expect.element(sidebarScreen.networkBadge()).toBeVisible();
    });
});

describe("Theme error notification", () => {
    const DEPRECATED_HELPER_ERROR = {
        code: "GS001-DEPR-PURL",
        rule: "Replace deprecated helper",
        details: "The <code>{{pageUrl}}</code> helper has been deprecated.",
        failures: [{ ref: "default.hbs", message: "deprecated usage" }],
        fatal: false,
        level: "error",
    };

    // Surfaced inline in the design settings panel instead of the sidebar banner.
    const PAGE_BUILDER_ERROR = {
        code: "GS110-NO-MISSING-PAGE-BUILDER-USAGE",
        rule: "Check page builder usage",
        details: "Missing page builder helper usage.",
        failures: [{ ref: "post.hbs", message: "show_title_and_feature_image" }],
        fatal: false,
        level: "error",
    };

    it("shows a banner when the active theme has errors", async () => {
        await renderAdminApp("/", {
            boot: { browseActiveTheme: { response: activeThemeResponse({ errors: [DEPRECATED_HELPER_ERROR] }) } },
        });

        await expect.element(sidebarScreen.themeErrorsBanner()).toBeVisible();
    });

    it("opens the theme errors dialog when the banner is clicked", async () => {
        await renderAdminApp("/", {
            boot: { browseActiveTheme: { response: activeThemeResponse({ errors: [DEPRECATED_HELPER_ERROR] }) } },
        });

        await sidebarScreen.themeErrorsBanner().click();

        await expect.element(sidebarScreen.themeErrorsDialog()).toBeVisible();
        await expect.element(sidebarScreen.themeErrorsDialog()).toHaveTextContent("Replace deprecated helper");
    });

    it("shows no banner when the active theme has no errors", async () => {
        // The default boot serves an error-free active theme.
        await renderAdminApp("/");

        await expect.element(sidebarScreen.userMenuTrigger()).toBeVisible();
        await expect.element(sidebarScreen.themeErrorsBanner()).not.toBeInTheDocument();
    });

    it("does not show a banner for page-builder errors handled inline in design settings", async () => {
        await renderAdminApp("/", {
            boot: { browseActiveTheme: { response: activeThemeResponse({ errors: [PAGE_BUILDER_ERROR] }) } },
        });

        await expect.element(sidebarScreen.userMenuTrigger()).toBeVisible();
        await expect.element(sidebarScreen.themeErrorsBanner()).not.toBeInTheDocument();
    });
});
