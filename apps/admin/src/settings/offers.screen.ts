import { page } from "vitest/browser";
import { offersSelectors } from "@tryghost/test-data/selectors/offers";

const { testIds, names } = offersSelectors;

/** Offers screen locators and gestures for acceptance specs; no assertions. */
export const offersScreen = {
    section: () => page.getByTestId(testIds.section),
    manageOffersButton: () => page.getByTestId(testIds.section).getByRole("button", { name: names.manageOffersButton }),

    listModal: () => page.getByTestId(testIds.listModal),
    listRows: () => page.getByTestId(testIds.listRow),
    tableRows: () => page.getByTestId(testIds.tableBody).getByRole("row"),
    retentionRows: () => page.getByTestId(testIds.retentionRow),
    retentionRedemptionsLink: (cadence: "monthly" | "yearly") => page.getByTestId(testIds.retentionRedemptionsLink(cadence)),
    newOfferButton: () => page.getByTestId(testIds.listModal).getByRole("button", { name: names.newOfferButton }),

    addModal: () => page.getByTestId(testIds.addModal),
    addSidebar: () => page.getByTestId(testIds.addSidebar),
    publishButton: () => page.getByTestId(testIds.addModal).getByRole("button", { name: names.publishButton }),
    successModal: () => page.getByTestId(testIds.successModal),

    updateModal: () => page.getByTestId(testIds.updateModal),
    retentionModal: () => page.getByTestId(testIds.retentionModal),

    durationMonthsInput: () => page.getByTestId(testIds.durationMonthsInput),
    selectOptions: () => page.getByRole("option"),
    selectOption: (label: string) => page.getByRole("option").filter({ hasText: label }),
    portalPreview: () => page.getByTestId(testIds.portalPreview),
    errorToast: () => page.getByRole("region", { name: /Notifications/ }).getByRole("listitem"),

    /** Open the offers list modal from the Growth section's button. */
    async openListModal(): Promise<void> {
        await offersScreen.manageOffersButton().click();
    },

    /** Open the archived-offers toggle from the list modal's filter menu. */
    async showArchivedOffers(): Promise<void> {
        await offersScreen.listModal().getByRole("button", { name: names.filterOptionsButton }).click();
        await page.getByRole("menuitemcheckbox", { name: names.showArchivedToggle }).click();
    },

    async sortOffersBy(option: "Date added" | "Name" | "Redemptions"): Promise<void> {
        await offersScreen.listModal().getByRole("button", { name: names.filterOptionsButton }).click();
        await page.getByRole("menuitemradio", { name: option }).click();
    },

    async toggleSortDirection(direction: "Ascending" | "Descending"): Promise<void> {
        await offersScreen.listModal().getByRole("button", { name: names.filterOptionsButton }).click();
        await page.getByRole("menuitem").filter({ hasText: direction }).click();
    },
};
