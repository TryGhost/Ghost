import {describe, expect, it} from "vitest";

import {
    currentRoute,
    currentUserResponse,
    fakeAdminEndpoint,
    fakeMembers,
    renderAdminApp,
    type CurrentUserResponse,
    type EndpointCapture,
} from "@test-utils/acceptance";
import {onboardingScreen} from "./onboarding.screen";

type ChecklistState = "pending" | "started" | "completed" | "dismissed";

const activeStartedAt = "2026-05-01T00:00:00.000Z";

function onboardingUser(
    checklistState: ChecklistState,
    completedSteps: string[] = [],
    startedAt: string | null | undefined = checklistState === "started" ? activeStartedAt : undefined
): CurrentUserResponse {
    const response = currentUserResponse();
    response.users[0].accessibility = JSON.stringify({
        onboarding: {
            checklistState,
            completedSteps,
            ...(startedAt && {startedAt}),
        },
    });
    return response;
}

function fakePreferenceEdits(): EndpointCapture {
    return fakeAdminEndpoint("PUT", /^\/users\/\w+\/\?include=roles/, ({body}) => body);
}

function sentOnboardingPreferences(capture: EndpointCapture): Record<string, unknown> | undefined {
    const body = capture.lastRequest?.body as {users?: Array<{accessibility?: string}>} | undefined;
    const accessibility = body?.users?.[0]?.accessibility;
    if (!accessibility) {
        return undefined;
    }
    return (JSON.parse(accessibility) as {onboarding?: Record<string, unknown>}).onboarding;
}

describe("Onboarding redirects", () => {
    it("redirects active onboarding from Analytics", async () => {
        await renderAdminApp("/analytics", {
            boot: {browseMe: {response: onboardingUser("started")}},
        });

        await expect.element(onboardingScreen.checklist()).toBeVisible();
        await expect.poll(currentRoute).toBe("/setup/onboarding?returnTo=%2Fanalytics");
    });

    it("preserves the Analytics subroute when redirecting", async () => {
        await renderAdminApp("/analytics/web", {
            boot: {browseMe: {response: onboardingUser("started")}},
        });

        await expect.element(onboardingScreen.checklist()).toBeVisible();
        await expect.poll(currentRoute).toBe("/setup/onboarding?returnTo=%2Fanalytics%2Fweb");
    });

});

describe("Onboarding checklist", () => {
    it("build-audience marks complete and navigates to Members", async () => {
        fakeMembers([]);
        const preferencesApi = fakePreferenceEdits();
        await renderAdminApp("/setup/onboarding?returnTo=%2Fanalytics", {
            boot: {browseMe: {response: onboardingUser("started")}},
        });

        await onboardingScreen.step("build-audience").click();

        await expect.poll(() => sentOnboardingPreferences(preferencesApi)?.completedSteps).toEqual(["build-audience"]);
        await expect.poll(currentRoute).toBe("/members");
    });

    it("opens the share dialog and marks the share step complete", async () => {
        const preferencesApi = fakePreferenceEdits();
        await renderAdminApp("/setup/onboarding?returnTo=%2Fanalytics", {
            boot: {browseMe: {response: onboardingUser("started")}},
        });

        await onboardingScreen.step("share-publication").click();

        await expect.element(onboardingScreen.shareModal()).toBeVisible();
        await expect.poll(() => sentOnboardingPreferences(preferencesApi)?.completedSteps).toEqual(["share-publication"]);
    });

});
