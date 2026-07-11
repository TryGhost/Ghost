/** Acceptance-harness public surface — see README.md for the spec anatomy. */
export { currentRoute, renderAdminApp } from "./render-admin-app";
export type { RenderAdminAppOptions } from "./render-admin-app";
export { defineResource, fakeMembers, fakeTags } from "./resources";
export type { BrowseQuery, FakeMembersOptions, ResourceCapture, ResourceOptions, ResourceSemantics, RespondWith } from "./resources";
export { allowUnhandledRequests, fakeAdminEndpoint, fakeEndpoint } from "./worker";
export type { CapturedEndpointRequest, EndpointCapture, FakeAdminEndpointResponse, FakeEndpointOptions } from "./worker";

// Test-data re-exports, so a spec needs a single import surface.
export { activeThemeResponse, changelogEntry, currentUserResponse, label, member, settingsResponse, tag } from "@tryghost/test-data";
export type { ActiveThemeResponse, ChangelogEntry, CurrentUserResponse, Label, Member, SettingsResponse, Tag } from "@tryghost/test-data";
