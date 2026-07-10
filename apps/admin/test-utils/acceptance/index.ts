/**
 * Acceptance-harness public surface. A typical spec:
 *
 *   import {expect, it} from "vitest";
 *   import {mockTags, renderAdminApp, tag} from "@test-utils/acceptance";
 *   import {tagsScreen} from "./tags.screen";
 *
 *   it("lists tags", async () => {
 *       mockTags([tag({name: "News"})]);
 *       await renderAdminApp("/tags");
 *       await expect.element(tagsScreen.rowLink("News")).toBeVisible();
 *   });
 */
export { renderAdminApp } from "./render-admin-app";
export type { RenderAdminAppOptions } from "./render-admin-app";
export { defineResource, mockMembers, mockTags } from "./resources";
export type { BrowseQuery, MockMembersOptions, ResourceCapture, ResourceOptions, ResourceSemantics, RespondWith } from "./resources";
export { allowUnmockedRequests, mockEndpoint } from "./worker";

// The builders specs declare their world with, re-exported so a spec needs
// only this module (plus vitest and its screen helper).
export { label, member, tag } from "@tryghost/test-data";
export type { Label, Member, Tag } from "@tryghost/test-data";
