import { page } from "vitest/browser";
import { automationsSelectors } from "@tryghost/test-data";

/** Automations screen locators for acceptance specs; no assertions. */
export const automationsScreen = {
    heading: () => page.getByTestId(automationsSelectors.testIds.page).getByRole("heading", { name: "Automations" }),
    list: () => page.getByTestId(automationsSelectors.testIds.list),
    rows: () => page.getByTestId(automationsSelectors.testIds.listRow),
    link: (name: string) => page.getByRole("link", { name, exact: true }),
};
