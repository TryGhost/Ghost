/** Acceptance-harness public surface — see README.md for the spec anatomy. */
export { currentRoute, renderAdminApp } from "./render-admin-app";
export type { RenderAdminAppOptions } from "./render-admin-app";
export { defineResource, fakeActions, fakeAutomations, fakeComments, fakeEditSettings, fakeIntegrations, fakeInvites, fakeLabels, fakeMembers, fakeNewsletters, fakeOffers, fakeRoles, fakeSettingsScreens, fakeTags, fakeThemes, fakeTiers, fakeUsers } from "./resources";
export type { BrowseQuery, EditSettingsCapture, FakeMembersOptions, ResourceCapture, ResourceOptions, ResourceSemantics, RespondWith } from "./resources";
export { allowUnhandledRequests, fakeAdminEndpoint, fakeEndpoint, fakeSitePreview } from "./worker";
export type { CapturedEndpointRequest, EndpointCapture, FakeAdminEndpointResponse, FakeEndpointOptions, SitePreviewCapture, SitePreviewRequest } from "./worker";

// Test-data re-exports, so a spec needs a single import surface.
export { activeThemeResponse, automation, browseResponse, changelogEntry, comment, commentThread, configResponse, currentUserResponse, defaultThemesResponse, label, member, newsletter, offer, post, reply, retentionOffer, settingsResponse, siteResponse, staffInvite, staffRole, staffUser, tag, theme, tier } from "@tryghost/test-data";
export type { ActiveThemeResponse, Automation, ChangelogEntry, Comment, CommentThread, CurrentUserResponse, Label, Member, Newsletter, Offer, ReplySpec, SettingsResponse, StaffInvite, StaffRole, StaffRoleName, StaffUser, Tag, Theme, Tier } from "@tryghost/test-data";
