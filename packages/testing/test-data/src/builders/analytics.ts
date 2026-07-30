import {createBuilder} from "../factory";
import {generateId} from "../utils";

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

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
    post_id: string;
    attribution_url: string;
    attribution_type: string;
    attribution_id: string;
    title: string;
    free_members: number;
    paid_members: number;
    mrr: number;
    published_at: string;
    url_exists?: boolean;
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

export interface NewsletterStat {
    post_id: string;
    post_title: string;
    send_date: string;
    sent_to: number;
    total_opens: number;
    open_rate: number;
    total_clicks: number;
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

export const analyticsKpi = createBuilder<AnalyticsKpi>(() => ({
    date: today(),
    visits: 0,
    pageviews: 0,
    bounce_rate: 0,
    avg_session_sec: 0
}));

export const analyticsActiveVisitors = createBuilder<AnalyticsActiveVisitors>(() => ({
    active_visitors: 0
}));

export const analyticsSource = createBuilder<AnalyticsSource>(() => ({
    source: "direct",
    visits: 0
}));

export const analyticsLocation = createBuilder<AnalyticsLocation>(() => ({
    location: "US",
    visits: 0
}));

export const analyticsDevice = createBuilder<AnalyticsDevice>(() => ({
    device: "desktop",
    visits: 0
}));

export const analyticsUtmSource = createBuilder<AnalyticsUtmSource>(() => ({
    utm_source: "newsletter",
    visits: 0
}));

export const analyticsUtmMedium = createBuilder<AnalyticsUtmMedium>(() => ({
    utm_medium: "email",
    visits: 0
}));

export const analyticsUtmCampaign = createBuilder<AnalyticsUtmCampaign>(() => ({
    utm_campaign: "launch",
    visits: 0
}));

export const analyticsUtmContent = createBuilder<AnalyticsUtmContent>(() => ({
    utm_content: "hero-link",
    visits: 0
}));

export const analyticsUtmTerm = createBuilder<AnalyticsUtmTerm>(() => ({
    utm_term: "ghost",
    visits: 0
}));

export const analyticsGiftLinkVisits = createBuilder<AnalyticsGiftLinkVisits>(() => ({
    gift_link: "gift-token",
    visits: 0,
    views: 0
}));

export const memberStatusStat = createBuilder<MemberStatusStat>(() => ({
    date: today(),
    paid: 0,
    free: 0,
    comped: 0,
    gift: 0,
    paid_subscribed: 0,
    paid_canceled: 0
}));

export const mrrHistoryStat = createBuilder<MrrHistoryStat>(() => ({
    date: today(),
    mrr: 0,
    currency: "usd"
}));

export const postStats = createBuilder<PostStats>(() => ({
    id: generateId(),
    recipient_count: null,
    opened_count: null,
    open_rate: null,
    member_delta: 0,
    free_members: 0,
    paid_members: 0,
    visitors: 0
}));

export const topPostViewsStat = createBuilder<TopPostViewsStat>(() => ({
    post_id: generateId(),
    title: "Analytics post",
    published_at: new Date().toISOString(),
    feature_image: null,
    status: "published",
    authors: "Ghost Author",
    views: 0,
    sent_count: null,
    opened_count: null,
    open_rate: null,
    clicked_count: 0,
    click_rate: null,
    members: 0,
    free_members: 0,
    paid_members: 0
}));

export const topContentStat = createBuilder<TopContentStat>(() => ({
    pathname: "/analytics-post/",
    title: "Analytics post",
    visits: 0
}));

export const topPostStat = createBuilder<TopPostStat>(() => {
    const postId = generateId();
    return {
        post_id: postId,
        attribution_url: "/analytics-post/",
        attribution_type: "post",
        attribution_id: postId,
        title: "Analytics post",
        free_members: 0,
        paid_members: 0,
        mrr: 0,
        published_at: new Date().toISOString()
    };
});

export const postReferrerStat = createBuilder<PostReferrerStat>(() => ({
    source: "Direct",
    free_members: 0,
    paid_members: 0,
    mrr: 0
}));

export const postGrowthStat = createBuilder<PostGrowthStat>(() => ({
    post_id: generateId(),
    free_members: 0,
    paid_members: 0,
    mrr: 0
}));

export const newsletterStat = createBuilder<NewsletterStat>(() => ({
    post_id: generateId(),
    post_title: "Newsletter post",
    send_date: new Date().toISOString(),
    sent_to: 0,
    total_opens: 0,
    open_rate: 0,
    total_clicks: 0,
    click_rate: 0
}));

export const newsletterSubscriberStat = createBuilder<NewsletterSubscriberStat>(() => ({
    total: 0,
    values: []
}));
