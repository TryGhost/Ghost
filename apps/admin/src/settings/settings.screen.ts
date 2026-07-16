import { page } from "vitest/browser";
import * as sel from "@tryghost/test-data/selectors/settings";

/** Settings locators and gestures shared by the acceptance batches; no assertions. */
export const settingsScreen = {
    section: (testId: string) => page.getByTestId(testId),
    titleAndDescription: () => page.getByTestId(sel.titleAndDescription),
    design: () => page.getByTestId(sel.design),
    users: () => page.getByTestId(sel.users),
    portal: () => page.getByTestId(sel.portal),
    explore: () => page.getByTestId(sel.explore),
    network: () => page.getByTestId(sel.network),
    tipsAndDonations: () => page.getByTestId(sel.tipsAndDonations),
    publicationLanguage: () => page.getByTestId(sel.publicationLanguage),
    timezone: () => page.getByTestId(sel.timezone),
    socialAccounts: () => page.getByTestId(sel.socialAccounts),
    seoMeta: () => page.getByTestId(sel.seoMeta),
    localeSelect: () => page.getByTestId(sel.localeSelect),
    timezoneSelect: () => page.getByTestId(sel.timezoneSelect),
    seoTabView: () => page.getByTestId(sel.seoTabView),
    selectOption: (name: string) => page.getByTestId(sel.selectOption).filter({ hasText: name }),
    errorToast: () => page.getByTestId(sel.toastError),
    sidebar: () => page.getByTestId(sel.settingsSidebar),
    search: () => page.getByLabelText(sel.settingsSearchLabel),
    exitButton: () => page.getByTestId(sel.exitSettings),
    confirmationModal: () => page.getByTestId(sel.confirmationModal),
    confirmationAction: (name: "Leave" | "Stay") => settingsScreen.confirmationModal().getByRole("button", { name }),
    portalModal: () => page.getByTestId(sel.portalModal),
    userDetailModal: () => page.getByTestId(sel.userDetailModal),
    exploreToggle: () => page.getByTestId(sel.exploreToggle),
    exploreGrowthToggle: () => page.getByTestId(sel.exploreGrowthToggle),
    explorePreview: () => page.getByTestId(sel.explorePreview),
    testimonialsModal: () => page.getByTestId(sel.exploreTestimonialsModal),
    migratedFromSelect: () => page.getByTestId(sel.migratedFrom),
    testimonialContent: () => page.getByPlaceholder(sel.testimonialPlaceholder),
    donateUrl: () => settingsScreen.tipsAndDonations().getByTestId(sel.donateUrl),
    previewShareableLink: () => settingsScreen.tipsAndDonations().getByTestId(sel.previewShareableLink),
    copyShareableLink: () => settingsScreen.tipsAndDonations().getByTestId(sel.copyShareableLink),
    suggestedAmount: () => settingsScreen.tipsAndDonations().getByRole("textbox", { name: sel.suggestedAmountLabel }),
    navItem: (name: string) => settingsScreen.sidebar().getByText(name, { exact: true }),
    noSearchResults: () => settingsScreen.sidebar().getByText(sel.noSearchResultsText, { exact: true }),

    async editTitle(value: string): Promise<void> {
        const section = settingsScreen.titleAndDescription();
        await section.getByRole("button", { name: "Edit" }).click();
        await section.getByLabelText(sel.siteTitleLabel).fill(value);
    },
};
