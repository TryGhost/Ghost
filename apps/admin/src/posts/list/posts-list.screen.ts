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
    /** The <ul>. Carries `data-selection` so an inverted selection is observable. */
    listRoot: () => page.getByTestId("posts-list").element(),
    /**
     * Titles of the currently selected rows, keyed off the same `data-selected`
     * attribute Ember sets. Read as elements rather than as a locator because
     * Vitest's locators have no attribute selector; pair it with `expect.poll`
     * so it still retries while React settles.
     */
    selectedTitles: () => postsListScreen.listItems().elements()
        .filter(element => element.getAttribute("data-selected") === "true")
        .map(element => element.querySelector("h3")?.textContent ?? ""),
    /** The row's main link — the image and title region. */
    rowLink: () => page.getByTestId("post-list-item-link"),
    /** A metric column, found by its label ("Opens", "Members", …). */
    metricCell: (label: string) => page.getByTestId("posts-list-item").getByRole("link", { name: new RegExp(label) }).first(),
    /** The hover breakdown, which Radix portals out of the row. */
    metricPanel: () => page.getByTestId("post-metric-panel"),
    /** The trailing button at a row's end — Analytics, View, or Editor. */
    rowAction: () => page.getByTestId("post-list-item-action"),
    featuredMarkers: () => page.getByTestId("post-featured"),
    emptyCold: () => page.getByTestId("posts-empty-cold"),
    emptyFiltered: () => page.getByTestId("posts-empty-filtered"),
    showAllButton: (plural: string) => page.getByRole("button", { name: `Show all ${plural}` }),
    filterBar: () => page.getByTestId("posts-filters"),
    addFilterButton: () => page.getByTestId("posts-filters").getByRole("button", { name: "Filter" }),
    /** A field in the add-filter popover, which renders into a portal. */
    filterFieldOption: (label: string) => page.getByRole("option", { name: label, exact: true }),
    sortButton: () => page.getByTestId("posts-sort"),
    /** Radio items, so the active sort is announced and visibly checked. */
    sortOption: (label: string) => page.getByRole("menuitemradio", { name: label, exact: true })
};
