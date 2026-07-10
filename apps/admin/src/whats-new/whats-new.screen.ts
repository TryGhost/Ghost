import { page } from "vitest/browser";
import { whatsNewSelectors } from "@tryghost/test-data";

/**
 * Screen helper for the what's-new banner: locator factories for the
 * acceptance specs. Selector strings come from the `@tryghost/test-data`
 * registry; assertions stay in the specs.
 */
export const whatsNewScreen = {
    banner: () => page.getByTestId(whatsNewSelectors.testIds.banner),
    bannerTitle: () => page.getByTestId(whatsNewSelectors.testIds.bannerTitle),
    bannerExcerpt: () => page.getByTestId(whatsNewSelectors.testIds.bannerExcerpt),
    dismissButton: () => page.getByRole("button", { name: whatsNewSelectors.names.dismissButton }),
};
