import { page } from 'vitest/browser';
import * as sel from '@tryghost/test-data/selectors/post-analytics';

/** Post analytics screen locators for acceptance specs; no assertions. */
export const postAnalyticsScreen = {
  postTitle: (title: string) => page.getByRole('heading', { level: 1 }).getByText(title),

  // Header tabs (PageMenu renders buttons)
  overviewTab: () => page.getByRole('button', { name: sel.overviewTab, exact: true }),
  webTrafficTab: () => page.getByRole('button', { name: sel.webTrafficTab }),
  newsletterTab: () => page.getByRole('button', { name: sel.newsletterTab, exact: true }),
  growthTab: () => page.getByRole('button', { name: sel.growthTab, exact: true }),

  // Overview
  webPerformanceCard: () => page.getByTestId(sel.webPerformance),
  uniqueVisitors: () => page.getByTestId(sel.uniqueVisitors),
  growthCard: () => page.getByTestId(sel.growth),

  // Web — the post view's row testids carry the lowercased country code and
  // the source with non-alphanumerics dashed ("google.com" → "google-com").
  locationsCard: () => page.getByTestId(sel.locationsCard),
  locationRow: (countryCode: string) =>
    page.getByTestId(`${sel.locationRowPrefix}${countryCode.toLowerCase()}`),
  topSourcesCard: () => page.getByTestId(sel.topSourcesCard),
  sourceRow: (source: string) =>
    page.getByTestId(`${sel.sourceRowPrefix}${source.toLowerCase().replace(/[^a-z0-9]/g, '-')}`),
  filterContainer: () => page.getByTestId(sel.statsFilterContainer),

  // Growth
  membersCard: () => page.getByTestId(sel.membersCard),
};
