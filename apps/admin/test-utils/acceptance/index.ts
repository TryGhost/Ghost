/**
 * Acceptance-harness public surface. A typical spec:
 *
 *   import {mockTags, renderAdminApp} from "@test-utils/acceptance";
 *   import {tag} from "@tryghost/test-data";
 *
 *   it("lists tags", async () => {
 *       mockTags([tag({name: "News"})]);
 *       const screen = await renderAdminApp({route: "/tags"});
 *       await expect.element(screen.getByRole("link", {name: "News"})).toBeVisible();
 *   });
 */
export { renderAdminApp } from "./render-admin-app";
export type { RenderAdminAppOptions } from "./render-admin-app";
export { defineResource, mockTags } from "./resources";
export type { BrowseQuery, ResourceCapture, ResourceOptions, ResourceSemantics, RespondWith } from "./resources";
export { allowUnmockedRequests } from "./worker";
