import { type Locator, page } from 'vitest/browser';
import * as sel from '@tryghost/test-data/selectors/analytics';

/** Site analytics screen locators for acceptance specs; no assertions. */
export const analyticsScreen = {
  // Overview
  uniqueVisitorsCard: () => page.getByTestId(sel.uniqueVisitors),
  uniqueVisitorsValue: () =>
    page.getByTestId(sel.uniqueVisitors).getByTestId(sel.kpiCardHeaderValue),
  membersCard: () => page.getByTestId(sel.members),
  membersValue: () => page.getByTestId(sel.members).getByTestId(sel.kpiCardHeaderValue),
  membersViewMoreButton: () =>
    page.getByTestId(sel.members).getByRole('button', { name: 'View more' }),
  mrrValue: () => page.getByTestId(sel.mrr).getByTestId(sel.kpiCardHeaderValue),
  uniqueVisitorsViewMoreButton: () =>
    page.getByTestId(sel.uniqueVisitors).getByRole('button', { name: 'View more' }),
  latestPost: () => page.getByTestId(sel.latestPost),
  latestPostVisitors: () => page.getByTestId(sel.latestPost).getByTestId(sel.latestPostVisitors),
  latestPostMembers: () => page.getByTestId(sel.latestPost).getByTestId(sel.latestPostMembers),
  topPostsCard: () => page.getByTestId(sel.topPostsCard),
  topPostsVisitorsStatistics: () =>
    page.getByTestId(sel.topPostsCard).getByTestId(sel.statisticsVisitors),
  topPostsMembersStatistics: () =>
    page.getByTestId(sel.topPostsCard).getByTestId(sel.statisticsMembers),

  // Web
  webGraph: () => page.getByTestId(sel.webGraph),
  uniqueVisitorsTab: () =>
    page.getByTestId(sel.webGraph).getByRole('tab', { name: 'Unique visitors' }),
  totalViewsTab: () => page.getByTestId(sel.webGraph).getByRole('tab', { name: 'Total views' }),
  topContentCard: () => page.getByTestId(sel.topContentCard),
  topContentTab: (name: string) =>
    page.getByTestId(sel.topContentCard).getByRole('tab', { name, exact: true }),
  topSourcesCard: () => page.getByTestId(sel.topSourcesCard),
  sourceRow: (source: string) => page.getByTestId(`${sel.sourceRowPrefix}${source}`),
  locationsCard: () => page.getByTestId(sel.visitorsCard),
  locationRow: (countryCode: string) => page.getByTestId(`${sel.locationRowPrefix}${countryCode}`),

  // Growth
  totalMembersCard: () => page.getByTestId(sel.totalMembersCard),

  // Newsletters
  newslettersCard: () => page.getByTestId(sel.newslettersCard),
  newslettersCardTab: (name: string) =>
    page.getByTestId(sel.newslettersCard).getByRole('tab', { name }),
  totalSubscribersValue: () => page.getByTestId(sel.totalSubscribersValue),
  topNewslettersCard: () => page.getByTestId(sel.topNewslettersCard),

  // Header
  activeVisitors: () => page.getByText(/\d+ online/),
  // The header's date range button, and the picker it opens: presets beside
  // a calendar
  dateRangeSelect: () => page.getByRole('button', { name: 'Date range' }),
  rangeOption: (name: string) => page.getByRole('option', { name, exact: true }),
  customRangePicker: () => page.getByRole('dialog', { name: 'Date range' }),
  /** A month's dropdowns in the custom range calendar: 0 is the left-hand month. */
  calendarYearSelect: (month = 0) =>
    analyticsScreen
      .customRangePicker()
      .getByRole('combobox', { name: 'Choose the Year' })
      .nth(month),
  calendarMonthSelect: (month = 0) =>
    analyticsScreen
      .customRangePicker()
      .getByRole('combobox', { name: 'Choose the Month' })
      .nth(month),
  /** Every YYYY-MM-DD day the custom range calendar shows, with whether it can be picked. */
  calendarDays: () =>
    Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] td[data-day]')).map(
      (cell) => ({ date: cell.dataset.day!, disabled: cell.dataset.disabled === 'true' }),
    ),
  /**
   * A day of the custom range calendar by its YYYY-MM-DD date. Days of the
   * neighbouring months repeat in each grid, so this skips those copies.
   */
  calendarDay: (isoDate: string): Locator | null => {
    const element = document.querySelector<HTMLElement>(
      `[role="dialog"] td[data-day="${isoDate}"]:not([data-outside]) button`,
    );
    return element && page.elementLocator(element);
  },
};
