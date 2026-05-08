import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, test as baseTest} from "vitest";
import {HttpResponse, http} from "msw";
import {mockUser} from "@test-utils/factories";
import {queryClientFixtures, type TestWrapperComponent} from "@test-utils/fixtures/query-client";
import {serverFixture} from "@test-utils/fixtures/msw";
import {useOnboarding} from "./use-onboarding";
import type {QueryClient} from "@tanstack/react-query";
import type {SetupServer} from "msw/node";
import type {UpdateUserRequestBody, UsersResponseType, User} from "@tryghost/admin-x-framework/api/users";

const USERS_API_URL = "/ghost/api/admin/users/me/";
const USER_UPDATE_API_URL = "/ghost/api/admin/users/:id/";

const ownerRole = {
    id: "owner-role",
    name: "Owner",
    description: "Owner",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
} as const;

async function setupOnboarding(
    server: SetupServer,
    wrapper: TestWrapperComponent,
    userOverrides: Partial<User> = {}
) {
    server.use(
        http.get(USERS_API_URL, () => {
            return HttpResponse.json({
                users: [{
                    ...mockUser,
                    roles: [ownerRole],
                    ...userOverrides,
                }],
            });
        }),
        http.put<{ id: string }, UpdateUserRequestBody, UsersResponseType>(
            USER_UPDATE_API_URL,
            async ({request}) => {
                const body = await request.json();
                return HttpResponse.json({
                    users: [{
                        ...mockUser,
                        roles: [ownerRole],
                        accessibility: body.users[0]?.accessibility ?? "",
                    }],
                });
            }
        )
    );

    const {result} = renderHook(() => useOnboarding(), {wrapper});
    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    });
    return result;
}

const onboardingTest = baseTest.extend<{
    server: SetupServer;
    queryClient: QueryClient;
    wrapper: TestWrapperComponent;
    setup: (userOverrides?: Partial<User>) => ReturnType<typeof setupOnboarding>;
}>({
    ...serverFixture,
    ...queryClientFixtures,
    setup: async ({server, wrapper}, provide) => {
        await provide((userOverrides) => setupOnboarding(server, wrapper, userOverrides));
    },
});

describe("useOnboarding", () => {
    onboardingTest("shows checklist for owners when onboarding is started", async ({setup}) => {
        const result = await setup({
            accessibility: JSON.stringify({
                onboarding: {
                    completedSteps: ["customize-design"],
                    checklistState: "started",
                    startedAt: "2026-04-30T10:00:00.000Z",
                },
            }),
        });

        expect(result.current.shouldShowChecklist).toBe(true);
        expect(result.current.nextStep).toBe("first-post");
        expect(result.current.allStepsCompleted).toBe(false);
    });

    onboardingTest("does not show checklist for non-owner users", async ({setup}) => {
        const result = await setup({
            accessibility: JSON.stringify({
                onboarding: {
                    completedSteps: [],
                    checklistState: "started",
                    startedAt: "2026-04-30T10:00:00.000Z",
                },
            }),
            roles: [{
                id: "admin-role",
                name: "Administrator",
                description: "Admin",
                created_at: "2024-01-01T00:00:00.000Z",
                updated_at: "2024-01-01T00:00:00.000Z",
            }],
        });

        expect(result.current.shouldShowChecklist).toBe(false);
    });

    onboardingTest("updates completed steps without duplicating existing steps", async ({setup}) => {
        const result = await setup({
            accessibility: JSON.stringify({
                onboarding: {
                    completedSteps: ["customize-design"],
                    checklistState: "started",
                    startedAt: "2026-04-30T10:00:00.000Z",
                },
            }),
        });

        await act(async () => {
            await result.current.markStepCompleted("customize-design");
            await result.current.markStepCompleted("first-post");
        });

        await waitFor(() => {
            expect(result.current.completedSteps).toEqual(["customize-design", "first-post"]);
        });
    });

    onboardingTest("updates checklist state", async ({setup}) => {
        const result = await setup({
            accessibility: JSON.stringify({
                onboarding: {
                    completedSteps: [],
                    checklistState: "started",
                    startedAt: "2026-04-30T10:00:00.000Z",
                },
            }),
        });

        await act(async () => {
            await result.current.dismissChecklist();
        });

        await waitFor(() => {
            expect(result.current.checklistState).toBe("dismissed");
            expect(result.current.shouldShowChecklist).toBe(false);
        });
    });

    onboardingTest("starts checklist with a start date", async ({setup}) => {
        const result = await setup({
            accessibility: JSON.stringify({
                onboarding: {
                    completedSteps: ["customize-design"],
                    checklistState: "pending",
                },
            }),
        });

        await act(async () => {
            await result.current.startChecklist();
        });

        await waitFor(() => {
            expect(result.current.checklistState).toBe("started");
            expect(result.current.completedSteps).toEqual([]);
            expect(result.current.hasActiveStartedAt).toBe(true);
            expect(result.current.shouldShowChecklist).toBe(true);
        });
    });

    onboardingTest("dismisses started checklist when startedAt is missing", async ({setup}) => {
        const result = await setup({
            accessibility: JSON.stringify({
                onboarding: {
                    completedSteps: [],
                    checklistState: "started",
                },
            }),
        });

        expect(result.current.shouldShowChecklist).toBe(false);

        await waitFor(() => {
            expect(result.current.checklistState).toBe("dismissed");
        });
    });

    onboardingTest("dismisses started checklist when startedAt is before the cutoff", async ({setup}) => {
        const result = await setup({
            accessibility: JSON.stringify({
                onboarding: {
                    completedSteps: [],
                    checklistState: "started",
                    startedAt: "2026-04-29T23:59:59.999Z",
                },
            }),
        });

        expect(result.current.shouldShowChecklist).toBe(false);

        await waitFor(() => {
            expect(result.current.checklistState).toBe("dismissed");
        });
    });
});
