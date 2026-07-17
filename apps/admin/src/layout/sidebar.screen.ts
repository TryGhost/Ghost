import { page } from "vitest/browser";
import {
    appearanceMenuItem,
    darkAppearanceOption,
    lightAppearanceOption,
    networkNotificationBadge,
    postsToggle,
    profileMenuItem,
    signOutMenuItem,
    systemAppearanceOption,
    themeErrorsBannerText,
    themeErrorsDialog,
    userMenuTrigger,
} from "@tryghost/test-data/selectors/sidebar";

const appearanceOptions = {
    dark: darkAppearanceOption,
    light: lightAppearanceOption,
    system: systemAppearanceOption,
} as const;

/** Admin sidebar locators and gestures for acceptance specs; no assertions. */
export const sidebarScreen = {
    navLink: (name: string) => page.getByRole("navigation").getByRole("link", { name, exact: true }),
    postsToggle: () => page.getByRole("button", { name: postsToggle }),
    networkBadge: () => page.getByTestId(networkNotificationBadge),
    userMenuTrigger: () => page.getByRole("button", { name: userMenuTrigger }),
    profileMenuItem: () => page.getByRole("menuitem", { name: profileMenuItem }),
    signOutMenuItem: () => page.getByRole("menuitem", { name: signOutMenuItem }),
    appearanceMenuItem: () => page.getByRole("menuitem", { name: appearanceMenuItem }),
    appearanceOption: (option: "dark" | "light" | "system") =>
        page.getByRole("menuitem", { name: appearanceOptions[option] }),
    themeErrorsBanner: () => page.getByRole("status").filter({ hasText: themeErrorsBannerText }),
    themeErrorsDialog: () => page.getByRole("dialog", { name: themeErrorsDialog }),

    /** Open the user menu and select the appearance choice from its submenu. */
    async selectAppearance(option: "dark" | "light" | "system"): Promise<void> {
        await sidebarScreen.userMenuTrigger().click();
        await sidebarScreen.appearanceMenuItem().click();
        await sidebarScreen.appearanceOption(option).click();
    },
};
