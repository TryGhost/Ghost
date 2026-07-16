/** Acceptance-harness public surface — see README.md for the spec anatomy. */
export { currentRoute, renderAdminApp } from "./render-admin-app";
export type { RenderAdminAppOptions } from "./render-admin-app";
export { defineResource, fakeAutomations, fakeComments, fakeEditSettings, fakeInvites, fakeMembers, fakeOffers, fakeRoles, fakeSettingsScreens, fakeTags, fakeTiers, fakeUsers } from "./resources";
export type { BrowseQuery, EditSettingsCapture, FakeMembersOptions, ResourceCapture, ResourceOptions, ResourceSemantics, RespondWith } from "./resources";
export { allowUnhandledRequests, fakeAdminEndpoint, fakeEndpoint } from "./worker";
export type { CapturedEndpointRequest, EndpointCapture, FakeAdminEndpointResponse, FakeEndpointOptions } from "./worker";

// Test-data re-exports, so a spec needs a single import surface.
export { activeThemeResponse, automation, browseResponse, changelogEntry, comment, commentThread, configResponse, currentUserResponse, label, member, offer, reply, retentionOffer, settingsResponse, siteResponse, staffInvite, staffRole, staffUser, tag, tier } from "@tryghost/test-data";
export type { ActiveThemeResponse, Automation, ChangelogEntry, Comment, CommentThread, CurrentUserResponse, Label, Member, Offer, ReplySpec, SettingsResponse, StaffInvite, StaffRole, StaffRoleName, StaffUser, Tag, Tier } from "@tryghost/test-data";
