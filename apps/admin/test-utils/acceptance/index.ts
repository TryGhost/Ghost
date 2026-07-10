/**
 * Acceptance-harness public surface. A typical spec:
 *
 *   import {expect, it} from "vitest";
 *   import {fakeTags, renderAdminApp, tag} from "@test-utils/acceptance";
 *   import {tagsScreen} from "./tags.screen";
 *
 *   it("lists tags", async () => {
 *       fakeTags([tag({name: "News"})]);
 *       await renderAdminApp("/tags");
 *       await expect.element(tagsScreen.rowLink("News")).toBeVisible();
 *   });
 */
export { renderAdminApp } from "./render-admin-app";
export type { RenderAdminAppOptions } from "./render-admin-app";
export { defineResource, fakeMembers, fakeTags } from "./resources";
export type { BrowseQuery, FakeMembersOptions, ResourceCapture, ResourceOptions, ResourceSemantics, RespondWith } from "./resources";
export { allowUnhandledRequests, fakeEndpoint } from "./worker";

// The builders specs declare their world with, re-exported so a spec needs
// only this module (plus vitest and its screen helper).
export { label, member, tag } from "@tryghost/test-data";
export type { Label, Member, Tag } from "@tryghost/test-data";
