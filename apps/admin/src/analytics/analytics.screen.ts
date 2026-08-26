import { page } from 'vitest/browser';
import * as sel from '@tryghost/test-data/selectors/analytics';

/** Site analytics screen locators for acceptance specs; no assertions. */
export const analyticsScreen = {
  // Overview
  uniqueVisitorsCard: () => page.getByTestId(sel.uniqueVisitors),
  uniqueVisitorsValue: () =>
    page.getByTestId(sel.uniqueVisitors).getByTestId(sel.kpiCardHeaderValue),
  membersCard: () => page.getByTestId(sel.members),
  membersValue: () => page.getByTestId(sel.members).getByTestId(sel.kpiCardHeaderValue),
  mrrValue: () => page.getByTestId(sel.mrr).getByTestId(sel.kpiCardHeaderValue),
  latestPost: () => page.getByTestId(sel.latestPost),
  topPostsCard: () => page.getByTestId(sel.topPostsCard),

  // Web
  webGraph: () => page.getByTestId(sel.webGraph),
  topContentCard: () => page.getByTestId(sel.topContentCard),
  topSourcesCard: () => page.getByTestId(sel.topSourcesCard),
  sourceRow: (source: string) => page.getByTestId(`${sel.sourceRowPrefix}${source}`),
  locationsCard: () => page.getByTestId(sel.visitorsCard),
  locationRow: (countryCode: string) => page.getByTestId(`${sel.locationRowPrefix}${countryCode}`),

  // Growth
  totalMembersCard: () => page.getByTestId(sel.totalMembersCard),

  // Newsletters
  newslettersCard: () => page.getByTestId(sel.newslettersCard),
  totalSubscribersValue: () => page.getByTestId(sel.totalSubscribersValue),
  topNewslettersCard: () => page.getByTestId(sel.topNewslettersCard),

  // Header
  activeVisitors: () => page.getByText(/\d+ online/),
  // The header's date-range select (the only combobox on the stats views).
  dateRangeSelect: () => page.getByRole('combobox'),
  rangeOption: (name: string) => page.getByRole('option', { name }),
};
