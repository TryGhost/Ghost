import { page } from 'vitest/browser';
import {
  automationListRow,
  automationsList,
  automationsPage,
} from '@tryghost/test-data/selectors/automations';

/** Automations screen locators for acceptance specs; no assertions. */
export const automationsScreen = {
  heading: () => page.getByTestId(automationsPage).getByRole('heading', { name: /^Automations/ }),
  list: () => page.getByTestId(automationsList),
  columnHeader: (name: string) =>
    page.getByTestId(automationsList).getByRole('columnheader', { name }),
  rows: () => page.getByTestId(automationListRow),
  link: (name: string) => page.getByRole('link', { name, exact: true }),
  showAutomationSidebarButton: () =>
    page.getByRole('button', { name: 'Show automation sidebar', exact: true }),
  hideAutomationSidebarButton: () =>
    page.getByRole('button', { name: 'Hide automation sidebar', exact: true }),
  performanceHeading: () => page.getByRole('heading', { name: 'Performance', exact: true }),
  emailCard: (name = 'First') =>
    page
      .getByRole('region', { name: 'Editing canvas' })
      .getByRole('article', { name: `Send email: ${name}` }),
  emailAnalyticsToggle: (name = 'First') =>
    automationsScreen.emailCard(name).getByRole('button', { name: 'Email analytics', exact: true }),
};
