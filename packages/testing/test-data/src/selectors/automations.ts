/**
 * Automations screen selector strings, consumed by the admin screen helpers
 * and the e2e page objects. Source of truth: apps/admin/src/automations.
 */
export const automationsSelectors = {
    testIds: {
        page: "automations-page",
        list: "automations-list",
        listRow: "automation-list-row",
        listLoading: "automations-list-loading"
    }
} as const;
