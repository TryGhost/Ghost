/** Acceptance-harness public surface — see README.md for the spec anatomy. */
export { currentRoute, renderAdminApp } from "./render-admin-app";
export type { RenderAdminAppOptions } from "./render-admin-app";
export { defineResource, fakeActions, fakeAutomations, fakeComments, fakeEditSettings, fakeIntegrations, fakeInvites, fakeLabels, fakeMembers, fakeNewsletters, fakeOffers, fakePosts, fakeRoles, fakeSettingsScreens, fakeTags, fakeThemes, fakeTiers, fakeUsers } from "./resources";
export type { BrowseQuery, EditSettingsCapture, FakeMembersOptions, ResourceCapture, ResourceOptions, ResourceSemantics, RespondWith } from "./resources";
export { allowUnhandledRequests, fakeAdminEndpoint, fakeEndpoint, fakeSitePreview } from "./worker";
export type { CapturedEndpointRequest, EndpointCapture, FakeAdminEndpointResponse, FakeEndpointOptions, SitePreviewCapture, SitePreviewRequest } from "./worker";
export { TINYBIRD_SITE_UUID, fakeTinybirdPipe, fakeTinybirdToken, webAnalyticsBootOverrides } from "./tinybird";
export type { TinybirdPipeCapture, TinybirdPipeQuery } from "./tinybird";

// Test-data re-exports, so a spec needs a single import surface.
export { activeThemeResponse, analyticsActiveVisitors, analyticsDevice, analyticsGiftLinkVisits, analyticsKpi, analyticsLocation, analyticsSource, analyticsUtmCampaign, analyticsUtmContent, analyticsUtmMedium, analyticsUtmSource, analyticsUtmTerm, automation, browseResponse, changelogEntry, comment, commentThread, configResponse, currentUserResponse, defaultThemesResponse, label, member, memberStatusStat, mrrHistoryStat, newsletter, newsletterStat, newsletterSubscriberStat, offer, post, postGrowthStat, postReferrerStat, postStats, reply, retentionOffer, settingsResponse, siteResponse, staffInvite, staffRole, staffUser, tag, theme, tier, topContentStat, topPostStat, topPostViewsStat } from "@tryghost/test-data";
export type { ActiveThemeResponse, AnalyticsActiveVisitors, AnalyticsDevice, AnalyticsGiftLinkVisits, AnalyticsKpi, AnalyticsLocation, AnalyticsSource, AnalyticsUtmCampaign, AnalyticsUtmContent, AnalyticsUtmMedium, AnalyticsUtmSource, AnalyticsUtmTerm, Automation, ChangelogEntry, Comment, CommentThread, CurrentUserResponse, Label, Member, MemberStatusStat, MrrHistoryStat, Newsletter, NewsletterStat, NewsletterSubscriberStat, Offer, Post, PostGrowthStat, PostReferrerStat, PostStats, ReplySpec, SettingsResponse, StaffInvite, StaffRole, StaffRoleName, StaffUser, Tag, Theme, Tier, TinybirdPipeName, TinybirdPipeRows, TopContentStat, TopPostStat, TopPostViewsStat } from "@tryghost/test-data";
