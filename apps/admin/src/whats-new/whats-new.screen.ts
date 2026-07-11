import { page, userEvent } from "vitest/browser";
import {
    dismissButton,
    whatsNewAvatarBadge,
    whatsNewBanner,
    whatsNewBannerExcerpt,
    whatsNewBannerTitle,
    whatsNewDialog,
    whatsNewEntry,
    whatsNewEntryImage,
    whatsNewMenuBadge,
    whatsNewMenuItem,
} from "@tryghost/test-data/selectors/whats-new";

/** What's-new banner, menu and dialog locators for acceptance specs; no assertions. */
export const whatsNewScreen = {
    banner: () => page.getByTestId(whatsNewBanner),
    bannerTitle: () => page.getByTestId(whatsNewBannerTitle),
    bannerExcerpt: () => page.getByTestId(whatsNewBannerExcerpt),
    dismissButton: () => page.getByRole("button", { name: dismissButton }),
    avatarBadge: () => page.getByTestId(whatsNewAvatarBadge),
    menuBadge: () => page.getByTestId(whatsNewMenuBadge),
    menuItem: () => page.getByRole("menuitem", { name: whatsNewMenuItem }),
    dialog: () => page.getByRole("dialog", { name: whatsNewDialog }),
    entries: () => page.getByTestId(whatsNewEntry),
    entry: (index: number) => page.getByTestId(whatsNewEntry).nth(index),
    entryImage: (index: number) => whatsNewScreen.entry(index).getByTestId(whatsNewEntryImage),

    /** The dialog has no close control; Escape is how users dismiss it. */
    async closeDialog(): Promise<void> {
        await userEvent.keyboard("{Escape}");
    },
};
