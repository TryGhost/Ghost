import { page } from "vitest/browser";
import { sidebarSelectors } from "@tryghost/test-data";

/** Admin sidebar locators and gestures for acceptance specs; no assertions. */
export const sidebarScreen = {
    navLink: (name: string) => page.getByRole("navigation").getByRole("link", { name, exact: true }),
    postsToggle: () => page.getByRole("button", { name: sidebarSelectors.names.postsToggle }),
    networkBadge: () => page.getByTestId(sidebarSelectors.testIds.networkBadge),
    userMenuTrigger: () => page.getByRole("button", { name: sidebarSelectors.names.userMenuTrigger }),
    profileMenuItem: () => page.getByRole("menuitem", { name: sidebarSelectors.names.profileMenuItem }),
    signOutMenuItem: () => page.getByRole("menuitem", { name: sidebarSelectors.names.signOutMenuItem }),
    appearanceMenuItem: () => page.getByRole("menuitem", { name: sidebarSelectors.names.appearanceMenuItem }),
    appearanceOption: (option: "dark" | "light" | "system") =>
        page.getByRole("menuitem", { name: sidebarSelectors.names[`${option}AppearanceOption`] }),
    themeErrorsBanner: () => page.getByRole("status").filter({ hasText: sidebarSelectors.text.themeErrorsBanner }),
    themeErrorsDialog: () => page.getByRole("dialog", { name: sidebarSelectors.names.themeErrorsDialog }),

    /** Open the user menu and select the appearance choice from its submenu. */
    async selectAppearance(option: "dark" | "light" | "system"): Promise<void> {
        await sidebarScreen.userMenuTrigger().click();
        await sidebarScreen.appearanceMenuItem().click();
        await sidebarScreen.appearanceOption(option).click();
    },
};
