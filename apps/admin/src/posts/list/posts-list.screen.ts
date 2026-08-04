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
    newLink: (resource: "posts" | "pages", name: string) =>
        page.getByTestId(`${resource}-page`).getByRole("link", { name }),
    listItems: () => page.getByTestId("posts-list-item")
};
