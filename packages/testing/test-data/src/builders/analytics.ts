import { createBuilder, createRequiredBuilder } from '../factory';
import type { RequiredBuilderInput } from '../factory';

export interface AnalyticsKpi {
  date: string;
  visits: number;
  pageviews: number;
  bounce_rate: number;
  avg_session_sec: number;
}

export interface AnalyticsActiveVisitors {
  active_visitors: number;
}

export interface AnalyticsSource {
  source: string;
  visits: number;
}

export interface AnalyticsLocation {
  location: string;
  visits: number;
}

export interface AnalyticsDevice {
  device: string;
  visits: number;
}

export interface AnalyticsUtmSource {
  utm_source: string;
  visits: number;
}

export interface AnalyticsUtmMedium {
  utm_medium: string;
  visits: number;
}

export interface AnalyticsUtmCampaign {
  utm_campaign: string;
  visits: number;
}

export interface AnalyticsUtmContent {
  utm_content: string;
  visits: number;
}

export interface AnalyticsUtmTerm {
  utm_term: string;
  visits: number;
}

export interface AnalyticsGiftLinkVisits {
  gift_link: string;
  visits: number | string;
  views: number | string;
}

/** Row returned by each Tinybird pipe used by the analytics acceptance harness. */
export interface TinybirdPipeRows {
  api_kpis: AnalyticsKpi;
  api_active_visitors: AnalyticsActiveVisitors;
  api_top_sources: AnalyticsSource;
  api_top_locations: AnalyticsLocation;
  api_top_devices: AnalyticsDevice;
  api_top_utm_sources: AnalyticsUtmSource;
  api_top_utm_mediums: AnalyticsUtmMedium;
  api_top_utm_campaigns: AnalyticsUtmCampaign;
  api_top_utm_contents: AnalyticsUtmContent;
  api_top_utm_terms: AnalyticsUtmTerm;
  api_gift_link_visits: AnalyticsGiftLinkVisits;
}

export type TinybirdPipeName = keyof TinybirdPipeRows;

export interface MemberStatusStat {
  date: string;
  paid: number;
  free: number;
  comped: number;
  gift: number;
  paid_subscribed: number;
  paid_canceled: number;
}

export interface MrrHistoryStat {
  date: string;
  mrr: number;
  currency: string;
}

export interface SubscriptionStat {
  date: string;
  tier: string;
  cadence: string;
  positive_delta: number;
  negative_delta: number;
  signups: number;
  cancellations: number;
  count: number;
}

export interface PostStats {
  id: string;
  recipient_count: number | null;
  opened_count: number | null;
  open_rate: number | null;
  member_delta: number;
  free_members: number;
  paid_members: number;
  visitors: number;
}

export interface TopPostViewsStat {
  post_id: string;
  title: string;
  published_at: string;
  feature_image: string | null;
  status: string;
  authors: string;
  views: number;
  sent_count: number | null;
  opened_count: number | null;
  open_rate: number | null;
  clicked_count: number;
  click_rate: number | null;
  members: number;
  free_members: number;
  paid_members: number;
}

export interface TopContentStat {
  pathname: string;
  visits: number;
  title?: string;
  post_uuid?: string;
  post_id?: string;
  post_type?: string;
  url_exists?: boolean;
}

export interface TopPostStat {
  post_id: string | null;
  attribution_url: string;
  attribution_type: string | null;
  attribution_id: string | null;
  title: string;
  free_members: number;
  paid_members: number;
  mrr: number;
  published_at: string | null;
  post_type: string | null;
  url_exists: boolean;
}

export interface PostReferrerStat {
  source: string;
  referrer_url?: string;
  free_members: number;
  paid_members: number;
  mrr: number;
}

export interface PostGrowthStat {
  post_id: string;
  free_members: number;
  paid_members: number;
  mrr: number;
}

export interface NewsletterBasicStat {
  post_id: string;
  post_title: string;
  send_date: string;
  sent_to: number;
  total_opens: number;
  open_rate: number;
  total_clicks?: number;
  click_rate?: number;
}

export interface NewsletterClickStat {
  post_id: string;
  total_clicks: number;
  email_count: number;
  click_rate: number;
}

export interface NewsletterSubscriberValue {
  date: string;
  value: number;
}

export interface NewsletterSubscriberStat {
  total: number;
  values: NewsletterSubscriberValue[];
}

export const analyticsKpi = createRequiredBuilder<AnalyticsKpi, 'date'>(() => ({
  visits: 0,
  pageviews: 0,
  bounce_rate: 0,
  avg_session_sec: 0,
}));

export const analyticsActiveVisitors = createBuilder<AnalyticsActiveVisitors>(() => ({
  active_visitors: 0,
}));

export const analyticsSource = createRequiredBuilder<AnalyticsSource, 'source'>(() => ({
  visits: 0,
}));

export const analyticsLocation = createRequiredBuilder<AnalyticsLocation, 'location'>(() => ({
  visits: 0,
}));

export const analyticsDevice = createRequiredBuilder<AnalyticsDevice, 'device'>(() => ({
  visits: 0,
}));

export const analyticsUtmSource = createRequiredBuilder<AnalyticsUtmSource, 'utm_source'>(() => ({
  visits: 0,
}));

export const analyticsUtmMedium = createRequiredBuilder<AnalyticsUtmMedium, 'utm_medium'>(() => ({
  visits: 0,
}));

export const analyticsUtmCampaign = createRequiredBuilder<AnalyticsUtmCampaign, 'utm_campaign'>(
  () => ({
    visits: 0,
  }),
);

export const analyticsUtmContent = createRequiredBuilder<AnalyticsUtmContent, 'utm_content'>(
  () => ({
    visits: 0,
  }),
);

export const analyticsUtmTerm = createRequiredBuilder<AnalyticsUtmTerm, 'utm_term'>(() => ({
  visits: 0,
}));

export const analyticsGiftLinkVisits = createRequiredBuilder<AnalyticsGiftLinkVisits, 'gift_link'>(
  () => ({
    visits: 0,
    views: 0,
  }),
);

export const memberStatusStat = createRequiredBuilder<MemberStatusStat, 'date'>(() => ({
  paid: 0,
  free: 0,
  comped: 0,
  gift: 0,
  paid_subscribed: 0,
  paid_canceled: 0,
}));

export const mrrHistoryStat = createRequiredBuilder<MrrHistoryStat, 'date'>(() => ({
  mrr: 0,
  currency: 'usd',
}));

export const subscriptionStat = createRequiredBuilder<
  SubscriptionStat,
  'date' | 'tier' | 'cadence'
>(() => ({
  positive_delta: 0,
  negative_delta: 0,
  signups: 0,
  cancellations: 0,
  count: 0,
}));

export const postStats = createRequiredBuilder<PostStats, 'id'>((input) => {
  const recipientCount = input.recipient_count ?? null;
  const openedCount = input.opened_count ?? null;
  const freeMembers = input.free_members ?? 0;
  const paidMembers = input.paid_members ?? 0;

  return {
    recipient_count: null,
    opened_count: null,
    open_rate: recipientCount && openedCount !== null ? (openedCount / recipientCount) * 100 : null,
    member_delta: freeMembers + paidMembers,
    free_members: 0,
    paid_members: 0,
    visitors: 0,
  };
});

export const topPostViewsStat = createRequiredBuilder<TopPostViewsStat, 'post_id' | 'published_at'>(
  (input) => {
    const freeMembers = input.free_members ?? 0;
    const paidMembers = input.paid_members ?? 0;
    const sentCount = input.sent_count ?? null;
    const openedCount = input.opened_count ?? null;
    const clickedCount = input.clicked_count ?? 0;

    return {
      title: 'Analytics post',
      feature_image: null,
      status: 'published',
      authors: 'Ghost Author',
      views: 0,
      sent_count: null,
      opened_count: null,
      open_rate: sentCount && openedCount !== null ? (openedCount / sentCount) * 100 : null,
      clicked_count: 0,
      click_rate: sentCount ? (clickedCount / sentCount) * 100 : null,
      members: freeMembers + paidMembers,
      free_members: 0,
      paid_members: 0,
    };
  },
);

export const topContentStat = createRequiredBuilder<TopContentStat, 'pathname'>(() => ({
  title: 'Analytics post',
  visits: 0,
}));

export const topPostStat = createRequiredBuilder<TopPostStat, 'attribution_url'>(() => {
  return {
    post_id: null,
    attribution_type: null,
    attribution_id: null,
    title: 'Analytics post',
    free_members: 0,
    paid_members: 0,
    mrr: 0,
    published_at: null,
    post_type: null,
    url_exists: true,
  };
});

export const postReferrerStat = createRequiredBuilder<PostReferrerStat, 'source'>(() => ({
  free_members: 0,
  paid_members: 0,
  mrr: 0,
}));

export const postGrowthStat = createRequiredBuilder<PostGrowthStat, 'post_id'>(() => ({
  free_members: 0,
  paid_members: 0,
  mrr: 0,
}));

export const newsletterBasicStat = createRequiredBuilder<
  NewsletterBasicStat,
  'post_id' | 'send_date'
>((input) => {
  const sentTo = input.sent_to ?? 0;
  const totalOpens = input.total_opens ?? 0;
  const totalClicks = input.total_clicks ?? 0;
  const includesClicks = input.total_clicks !== undefined || input.click_rate !== undefined;

  return {
    post_title: 'Newsletter post',
    sent_to: 0,
    total_opens: 0,
    open_rate: sentTo ? totalOpens / sentTo : 0,
    ...(includesClicks
      ? {
          total_clicks: totalClicks,
          click_rate: sentTo ? totalClicks / sentTo : 0,
        }
      : {}),
  };
});

export const newsletterClickStat = createRequiredBuilder<NewsletterClickStat, 'post_id'>(
  (input) => {
    const emailCount = input.email_count ?? 0;
    const totalClicks = input.total_clicks ?? 0;

    return {
      total_clicks: 0,
      email_count: 0,
      click_rate: emailCount ? totalClicks / emailCount : 0,
    };
  },
);

export const newsletterSubscriberValue = createRequiredBuilder<NewsletterSubscriberValue, 'date'>(
  () => ({
    value: 0,
  }),
);

export const newsletterSubscriberStat = createRequiredBuilder<NewsletterSubscriberStat, 'total'>(
  () => ({
    values: [],
  }),
);

export interface TinybirdPipeInputs {
  api_kpis: RequiredBuilderInput<AnalyticsKpi, 'date'>;
  api_active_visitors: Partial<AnalyticsActiveVisitors>;
  api_top_sources: RequiredBuilderInput<AnalyticsSource, 'source'>;
  api_top_locations: RequiredBuilderInput<AnalyticsLocation, 'location'>;
  api_top_devices: RequiredBuilderInput<AnalyticsDevice, 'device'>;
  api_top_utm_sources: RequiredBuilderInput<AnalyticsUtmSource, 'utm_source'>;
  api_top_utm_mediums: RequiredBuilderInput<AnalyticsUtmMedium, 'utm_medium'>;
  api_top_utm_campaigns: RequiredBuilderInput<AnalyticsUtmCampaign, 'utm_campaign'>;
  api_top_utm_contents: RequiredBuilderInput<AnalyticsUtmContent, 'utm_content'>;
  api_top_utm_terms: RequiredBuilderInput<AnalyticsUtmTerm, 'utm_term'>;
  api_gift_link_visits: RequiredBuilderInput<AnalyticsGiftLinkVisits, 'gift_link'>;
}

type TinybirdPipeBuilders = {
  [Pipe in TinybirdPipeName]: (input: TinybirdPipeInputs[Pipe]) => TinybirdPipeRows[Pipe];
};

const tinybirdPipeBuilders = {
  api_kpis: analyticsKpi,
  api_active_visitors: analyticsActiveVisitors,
  api_top_sources: analyticsSource,
  api_top_locations: analyticsLocation,
  api_top_devices: analyticsDevice,
  api_top_utm_sources: analyticsUtmSource,
  api_top_utm_mediums: analyticsUtmMedium,
  api_top_utm_campaigns: analyticsUtmCampaign,
  api_top_utm_contents: analyticsUtmContent,
  api_top_utm_terms: analyticsUtmTerm,
  api_gift_link_visits: analyticsGiftLinkVisits,
} satisfies TinybirdPipeBuilders;

export function buildTinybirdPipeRows<Pipe extends TinybirdPipeName>(
  pipe: Pipe,
  inputs: Array<TinybirdPipeInputs[Pipe]>,
): Array<TinybirdPipeRows[Pipe]> {
  const builder = tinybirdPipeBuilders[pipe] as unknown as (
    input: TinybirdPipeInputs[Pipe],
  ) => TinybirdPipeRows[Pipe];
  return inputs.map((input) => builder(input));
}
