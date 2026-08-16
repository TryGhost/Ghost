import {beforeEach, describe, expect, it} from "vitest";

import {
    allowUnhandledRequests,
    currentRoute,
    currentUserResponse,
    fakeAdminEndpoint,
    renderAdminApp,
    staffRole,
    type CapturedEndpointRequest,
    type EndpointCapture,
    type RenderAdminAppOptions,
} from "@test-utils/acceptance";
import type {StaffRoleName} from "@tryghost/test-data";
import {onboardingScreen} from "@/onboarding/onboarding.screen";

function asRole(name: StaffRoleName): RenderAdminAppOptions {
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({name})];
    return {boot: {browseMe: {response: me}}};
}

const homeHandoff = (): unknown => JSON.parse(document.body.dataset.externalNavigate ?? "null");

function fakePreferenceEdits(): EndpointCapture {
    return fakeAdminEndpoint("PUT", /^\/users\/\w+\/\?include=roles/, ({body}) => body);
}

function onboardingPreferencesOf(request: CapturedEndpointRequest | undefined): Record<string, unknown> | undefined {
    const body = request?.body as {users?: Array<{accessibility?: string}>} | undefined;
    const accessibility = body?.users?.[0]?.accessibility;
    if (!accessibility) {
        return undefined;
    }
    return (JSON.parse(accessibility) as {onboarding?: Record<string, unknown>}).onboarding;
}

describe("Home route", () => {
    beforeEach(() => {
        delete document.body.dataset.externalNavigate;
    });

    it("sends admins to Analytics", async () => {
        // The analytics screens own their request graph; these specs assert only the dispatch.
        allowUnhandledRequests();
        await renderAdminApp("/", asRole("Administrator"));

        await expect.poll(currentRoute).toBe("/analytics");
    });

    it("sends contributors to Posts", async () => {
        await renderAdminApp("/", asRole("Contributor"));

        await expect.poll(homeHandoff).toMatchObject({route: "/posts", isExternal: true, replace: true});
    });

    it("sends other staff roles to Site", async () => {
        await renderAdminApp("/", asRole("Author"));

        await expect.poll(homeHandoff).toMatchObject({route: "/site", isExternal: true, replace: true});
    });

    it("starts the owner checklist and continues to onboarding on firstStart", async () => {
        const preferencesApi = fakePreferenceEdits();
        await renderAdminApp("/?firstStart=true");

        await expect.element(onboardingScreen.checklist()).toBeVisible();
        await expect.poll(currentRoute).toBe("/setup/onboarding?returnTo=/analytics");
        await expect.poll(() => onboardingPreferencesOf(preferencesApi.lastRequest)).toMatchObject({
            checklistState: "started",
            completedSteps: [],
        });
        expect(typeof onboardingPreferencesOf(preferencesApi.lastRequest)?.startedAt).toBe("string");
    });

    it("continues admins to Analytics without starting the checklist on firstStart", async () => {
        allowUnhandledRequests();
        const preferencesApi = fakePreferenceEdits();
        await renderAdminApp("/?firstStart=true", asRole("Administrator"));

        await expect.poll(currentRoute).toBe("/analytics");
        // Unrelated preference writes (e.g. the what's-new init) may happen,
        // but none of them may start the checklist for a non-owner.
        const checklistStates = preferencesApi.requests.map(request => onboardingPreferencesOf(request)?.checklistState);
        expect(checklistStates).not.toContain("started");
    });
});

describe("Dashboard route", () => {
    it("redirects to Analytics", async () => {
        // The analytics screens own their request graph; this spec asserts only the redirect.
        allowUnhandledRequests();
        await renderAdminApp("/dashboard");

        await expect.poll(currentRoute).toBe("/analytics");
    });
});
