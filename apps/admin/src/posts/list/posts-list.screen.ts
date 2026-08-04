import { page } from "vitest/browser";

/**
 * Locator vocabulary for the React posts and pages list screens.
 *
 * Page-scoped locators go through `page(resource)`: the admin sidebar carries
 * its own "Create new post" link, so an unscoped role query matches twice.
 *
 * `emberList` deliberately targets the *Ember* list's testid: with the flag on
 * it must not be in the DOM at all, which is the whole point of the Ember route
 * aborting its transition.
 */
export const postsListScreen = {
    page: (resource: "posts" | "pages") => page.getByTestId(`${resource}-page`),
    title: (resource: "posts" | "pages", name: string) =>
        page.getByTestId(`${resource}-page`).getByRole("heading", { name }),
    newLink: (resource: "posts" | "pages", name: string) =>
        page.getByTestId(`${resource}-page`).getByRole("link", { name }),
    emberList: () => page.getByTestId("posts-list"),
    emberFilters: () => page.getByTestId("posts-filters")
};
