/**
 * Tags screen selector strings, consumed by the admin screen helpers and the
 * e2e page objects. Source of truth: apps/admin/src/tags.
 */
export const tagsSelectors = {
    testIds: {
        page: "tags-page",
        list: "tags-list",
        listRow: "tag-list-row",
        headerTabs: "tags-header-tabs"
    },
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
