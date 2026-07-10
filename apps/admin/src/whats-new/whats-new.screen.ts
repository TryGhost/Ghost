import { page } from "vitest/browser";
import { whatsNewSelectors } from "@tryghost/test-data";

/** What's-new banner locators for acceptance specs; no assertions. */
export const whatsNewScreen = {
    banner: () => page.getByTestId(whatsNewSelectors.testIds.banner),
    bannerTitle: () => page.getByTestId(whatsNewSelectors.testIds.bannerTitle),
    bannerExcerpt: () => page.getByTestId(whatsNewSelectors.testIds.bannerExcerpt),
    dismissButton: () => page.getByRole("button", { name: whatsNewSelectors.names.dismissButton }),
};
