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
  // The header's date-range select (the only combobox on the stats views).
  dateRangeSelect: () => page.getByRole('combobox'),
  rangeOption: (name: string) => page.getByRole('option', { name }),
};
