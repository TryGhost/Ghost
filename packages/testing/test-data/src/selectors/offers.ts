/**
 * Offers screen selector strings, consumed by the admin screen helpers.
 * Source of truth: apps/admin-x-settings/src/components/settings/growth/offers.
 */
export const offersSelectors = {
    testIds: {
        section: "offers",
        listModal: "offers-modal",
        tableBody: "offers-table-body",
        listRow: "offer-item",
        retentionRow: "retention-offer-item",
        retentionRedemptionsLink: (cadence: "monthly" | "yearly") => `retention-redemptions-link-${cadence}`,
        addModal: "add-offer-modal",
        addSidebar: "add-offer-sidebar",
        updateModal: "offer-update-modal",
        retentionModal: "retention-offer-modal",
        successModal: "offer-success-modal",
        durationMonthsInput: "duration-months-input",
        selectOption: "select-option",
        portalPreview: "portal-preview",
        toastError: "toast-error"
    },
    names: {
        manageOffersButton: "Manage offers",
        newOfferButton: "New offer",
        publishButton: "Publish",
        saveButton: "Save",
        cancelButton: "Cancel",
        filterOptionsButton: "Filter options",
        showArchivedToggle: "Show archived"
    }
} as const;
