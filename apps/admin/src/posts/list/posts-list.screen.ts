import { page } from "vitest/browser";

/**
 * Locator vocabulary for the React posts and pages list screens.
 *
 * Page-scoped locators go through `page(resource)`: the admin sidebar carries
 * its own "Create new post" link, so an unscoped role query matches twice.
 *
 * `listItems` uses the same testid the Ember list does, on both resources — the
 * e2e page objects and visual-regression baselines are written against it, and
 * the two implementations can never both be mounted (the Ember route aborts).
 * Which implementation is serving a route is asserted via `page(resource)`,
 * which only the React screen renders.
 */
export const postsListScreen = {
    page: (resource: "posts" | "pages") => page.getByTestId(`${resource}-page`),
    title: (resource: "posts" | "pages", name: string) =>
        page.getByTestId(`${resource}-page`).getByRole("heading", { name }),
    // `exact` matters: the cold empty state also offers "Write a new post",
    // which a substring match on "New post" would pick up too.
    newLink: (resource: "posts" | "pages", name: string) =>
        page.getByTestId(`${resource}-page`).getByRole("link", { name, exact: true }),
    listItems: () => page.getByTestId("posts-list-item"),
    featuredMarkers: () => page.getByTestId("post-featured"),
    emptyCold: () => page.getByTestId("posts-empty-cold"),
    emptyFiltered: () => page.getByTestId("posts-empty-filtered"),
    showAllButton: (plural: string) => page.getByRole("button", { name: `Show all ${plural}` }),
    filterBar: () => page.getByTestId("posts-filters"),
    addFilterButton: () => page.getByTestId("posts-filters").getByRole("button", { name: "Filter" }),
    /** A field in the add-filter popover, which renders into a portal. */
    filterFieldOption: (label: string) => page.getByRole("option", { name: label, exact: true }),
    sortButton: () => page.getByRole("button", { name: "Sort" }),
    sortOption: (label: string) => page.getByRole("menuitem", { name: label, exact: true })
};
