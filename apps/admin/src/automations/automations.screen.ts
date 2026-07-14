import { page } from "vitest/browser";
import { automationListRow, automationsList, automationsPage } from "@tryghost/test-data/selectors/automations";

/** Automations screen locators for acceptance specs; no assertions. */
export const automationsScreen = {
    heading: () => page.getByTestId(automationsPage).getByRole("heading", { name: "Automations" }),
    list: () => page.getByTestId(automationsList),
    rows: () => page.getByTestId(automationListRow),
    link: (name: string) => page.getByRole("link", { name, exact: true }),
};
