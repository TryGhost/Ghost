import { page } from 'vitest/browser';
import {
  automationListRow,
  automationsList,
  automationsPage,
} from '@tryghost/test-data/selectors/automations';

/** Automations screen locators for acceptance specs; no assertions. */
export const automationsScreen = {
  heading: () => page.getByTestId(automationsPage).getByRole('heading', { name: 'Automations' }),
  list: () => page.getByTestId(automationsList),
  columnHeader: (name: string) =>
    page.getByTestId(automationsList).getByRole('columnheader', { name }),
  rows: () => page.getByTestId(automationListRow),
  link: (name: string) => page.getByRole('link', { name, exact: true }),
  showPerformanceButton: () => page.getByRole('button', { name: 'Show performance', exact: true }),
  hidePerformanceButton: () => page.getByRole('button', { name: 'Hide performance', exact: true }),
  performanceHeading: () => page.getByRole('heading', { name: 'Performance', exact: true }),
  emailPerformancePanel: () =>
    page.getByRole('complementary', { name: 'Email performance', exact: true }),
  emailCard: (name = 'First') =>
    page
      .getByRole('region', { name: 'Editing canvas' })
      .getByRole('article', { name: `Send email: ${name}` }),
  viewEmailAnalyticsButton: (name = 'First') =>
    automationsScreen.emailCard(name).getByRole('button', { name: 'View email analytics' }),
};
