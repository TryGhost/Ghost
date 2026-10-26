import { type FakeScenarioId } from './scenario';

// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// The numbers behind each scenario: today's totals and how fast things move.
// Everything else (daily series, lists, posts) is generated from these, so a
// scenario is consistent across every screen. Rough, plausible ballparks, not
// any real publisher's figures; tweak freely.

export interface Profile {
  // Members today
  free: number;
  paid: number;
  comped: number;
  gift: number;
  // Average net new members per day
  freePerDay: number;
  paidPerDay: number;
  // Paid subscriptions started and cancelled per day
  paidSignupsPerDay: number;
  paidCancelsPerDay: number;
  // Share of paid members on annual plans
  annualShare: number;
  mrrPerPaidCents: number;
  // Web traffic
  visitorsPerDay: number;
  pagesPerVisit: number;
  activeVisitors: number;
  // Newsletter
  subscribers: number;
  subscribersPerDay: number;
  openRate: number;
  clickRate: number;
  sendEveryDays: number;
  // How many published posts exist
  posts: number;
  // How jumpy the daily numbers are, 0–1. Small sites are spiky.
  noise: number;
}

export const PROFILES: Record<FakeScenarioId, Profile> = {
  empty: {
    free: 0,
    paid: 0,
    comped: 0,
    gift: 0,
    freePerDay: 0,
    paidPerDay: 0,
    paidSignupsPerDay: 0,
    paidCancelsPerDay: 0,
    annualShare: 0,
    mrrPerPaidCents: 0,
    visitorsPerDay: 0,
    pagesPerVisit: 0,
    activeVisitors: 0,
    subscribers: 0,
    subscribersPerDay: 0,
    openRate: 0,
    clickRate: 0,
    sendEveryDays: 0,
    posts: 0,
    noise: 0,
  },
  small: {
    free: 164,
    paid: 9,
    comped: 2,
    gift: 0,
    freePerDay: 0.6,
    paidPerDay: 0.05,
    paidSignupsPerDay: 0.12,
    paidCancelsPerDay: 0.06,
    annualShare: 0.3,
    mrrPerPaidCents: 600,
    visitorsPerDay: 38,
    pagesPerVisit: 1.4,
    activeVisitors: 1,
    subscribers: 152,
    subscribersPerDay: 0.5,
    openRate: 0.64,
    clickRate: 0.12,
    sendEveryDays: 7,
    posts: 14,
    noise: 0.65,
  },
  medium: {
    free: 19_829,
    paid: 1_246,
    comped: 14,
    gift: 3,
    freePerDay: 6.3,
    paidPerDay: 1.3,
    paidSignupsPerDay: 2.2,
    paidCancelsPerDay: 0.9,
    annualShare: 0.35,
    mrrPerPaidCents: 520,
    visitorsPerDay: 420,
    pagesPerVisit: 1.6,
    activeVisitors: 9,
    subscribers: 17_024,
    subscribersPerDay: 4.8,
    openRate: 0.55,
    clickRate: 0.09,
    sendEveryDays: 4,
    posts: 180,
    noise: 0.2,
  },
  large: {
    free: 438_400,
    paid: 21_650,
    comped: 310,
    gift: 120,
    freePerDay: 410,
    paidPerDay: 24,
    paidSignupsPerDay: 48,
    paidCancelsPerDay: 24,
    annualShare: 0.42,
    mrrPerPaidCents: 640,
    visitorsPerDay: 46_000,
    pagesPerVisit: 1.8,
    activeVisitors: 612,
    subscribers: 452_300,
    subscribersPerDay: 380,
    openRate: 0.46,
    clickRate: 0.04,
    sendEveryDays: 1,
    posts: 2_400,
    noise: 0.12,
  },
};
