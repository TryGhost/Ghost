import { page, userEvent } from "vitest/browser";
import { whatsNewSelectors } from "@tryghost/test-data";

/** What's-new banner, menu and dialog locators for acceptance specs; no assertions. */
export const whatsNewScreen = {
    banner: () => page.getByTestId(whatsNewSelectors.testIds.banner),
    bannerTitle: () => page.getByTestId(whatsNewSelectors.testIds.bannerTitle),
    bannerExcerpt: () => page.getByTestId(whatsNewSelectors.testIds.bannerExcerpt),
    dismissButton: () => page.getByRole("button", { name: whatsNewSelectors.names.dismissButton }),
    avatarBadge: () => page.getByTestId(whatsNewSelectors.testIds.avatarBadge),
    menuBadge: () => page.getByTestId(whatsNewSelectors.testIds.menuBadge),
    menuItem: () => page.getByRole("menuitem", { name: whatsNewSelectors.names.menuItem }),
    dialog: () => page.getByRole("dialog", { name: whatsNewSelectors.names.dialog }),
    entries: () => page.getByTestId(whatsNewSelectors.testIds.entry),
    entry: (index: number) => page.getByTestId(whatsNewSelectors.testIds.entry).nth(index),
    entryImage: (index: number) => whatsNewScreen.entry(index).getByTestId(whatsNewSelectors.testIds.entryImage),

    /** The dialog has no close control; Escape is how users dismiss it. */
    async closeDialog(): Promise<void> {
        await userEvent.keyboard("{Escape}");
    },
};
