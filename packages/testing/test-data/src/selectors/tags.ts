/**
 * Selector strings for the admin tags screen, shared by every test tier.
 *
 * Source of truth is the component source (apps/admin/src/tags). The e2e
 * page objects (e2e/helpers/pages/admin/tags) and the admin screen helpers
 * (apps/admin/src/tags/tags.screen.ts) both consume this registry —
 * strings only: no locators, no runner imports.
 */
export const tagsSelectors = {
    testIds: {
        page: "tags-page",
        list: "tags-list",
        listRow: "tag-list-row",
        headerTabs: "tags-header-tabs"
    },
    /** Accessible names (aria-labels / visible control text). */
    names: {
        publicTab: "Public tags",
        internalTab: "Internal tags",
        newTagLink: "New tag",
        createNewTagLink: "Create a new tag"
    },
    text: {
        emptyState: "Start organizing your content"
    }
} as const;
