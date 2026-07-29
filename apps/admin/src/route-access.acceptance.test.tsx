import { beforeEach, describe, expect, it } from "vitest";

import {
    allowUnhandledRequests,
    currentRoute,
    currentUserResponse,
    fakeTags,
    renderAdminApp,
    staffRole,
    type RenderAdminAppOptions,
} from "@test-utils/acceptance";
import type { StaffRoleName } from "@tryghost/test-data";

function asRole(name: StaffRoleName): RenderAdminAppOptions {
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name })];
    return { boot: { browseMe: { response: me } } };
}

// The home route is Ember-owned and picks the landing view per role, so a
// denied route hands off with a cross-app navigation rather than a React one.
const homeHandoff = (): unknown => JSON.parse(document.body.dataset.externalNavigate ?? "null");

const OWNER_SLUG = currentUserResponse().users[0].slug as string;

describe("Route access", () => {
    // The recorded handoff lives on the host page, which outlives a single test.
    beforeEach(() => {
        delete document.body.dataset.externalNavigate;
    });

    it("redirects a contributor away from settings", async () => {
        await renderAdminApp("/settings/design", asRole("Contributor"));

        await expect.poll(homeHandoff).toMatchObject({ route: "/", isExternal: true });
    });

    it("keeps a contributor on their own profile settings", async () => {
        // The settings app owns its request graph; this spec asserts only the shell routing.
        allowUnhandledRequests();
        await renderAdminApp(`/settings/staff/${OWNER_SLUG}`, asRole("Contributor"));

        await expect.poll(currentRoute).toBe(`/settings/staff/${OWNER_SLUG}`);
        expect(homeHandoff()).toBe(null);
    });

    it("redirects an author away from another staff member's profile settings", async () => {
        await renderAdminApp("/settings/staff/someone-else", asRole("Author"));

        await expect.poll(homeHandoff).toMatchObject({ route: "/", isExternal: true });
    });

    it("redirects a contributor away from tags", async () => {
        await renderAdminApp("/tags", asRole("Contributor"));

        await expect.poll(homeHandoff).toMatchObject({ route: "/", isExternal: true });
    });

    it("redirects an editor away from members", async () => {
        await renderAdminApp("/members", asRole("Editor"));

        await expect.poll(homeHandoff).toMatchObject({ route: "/", isExternal: true });
    });

    it("leaves an authorized user on the route", async () => {
        fakeTags([]);
        await renderAdminApp("/tags");

        await expect.poll(currentRoute).toBe("/tags");
        expect(homeHandoff()).toBe(null);
    });
});
