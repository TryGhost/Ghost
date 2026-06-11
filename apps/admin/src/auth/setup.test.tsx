import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@tryghost/admin-x-framework/api/users";
import Setup from "./setup";

const mocks = vi.hoisted(() => ({
    completeSetupMutateAsync: vi.fn(),
    createSessionMutateAsync: vi.fn(),
    editUserMutateAsync: vi.fn(),
    refetchCurrentUser: vi.fn(),
    reloadAdmin: vi.fn(),
    setupStatus: vi.fn(() => ({ data: { setup: [{ status: false }] } })),
}));

vi.mock("@tryghost/admin-x-framework", () => ({
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}));

vi.mock("@tryghost/admin-x-framework/api/authentication", () => ({
    getSetupStatus: () => mocks.setupStatus(),
    useCompleteSetup: () => ({
        isLoading: false,
        mutateAsync: mocks.completeSetupMutateAsync,
    }),
}));

vi.mock("@tryghost/admin-x-framework/api/session", () => ({
    useCreateSession: () => ({
        isLoading: false,
        mutateAsync: mocks.createSessionMutateAsync,
    }),
}));

vi.mock("@tryghost/admin-x-framework/api/current-user", () => ({
    useCurrentUser: () => ({
        data: undefined,
        refetch: mocks.refetchCurrentUser,
    }),
}));

vi.mock("@tryghost/admin-x-framework/api/users", () => ({
    isOwnerUser: (user: { roles?: Array<{ name: string }> }) => {
        return user.roles?.some(role => role.name === "Owner") ?? false;
    },
    useEditUser: () => ({ mutateAsync: mocks.editUserMutateAsync }),
}));

vi.mock("./reload", () => ({
    reloadAdmin: mocks.reloadAdmin,
}));

function makeOwner(overrides: Partial<User> = {}): User {
    return {
        id: "user-1",
        email: "jamie@example.com",
        accessibility: null,
        roles: [{ id: "role-1", name: "Owner" }],
        ...overrides,
    } as unknown as User;
}

function fillForm() {
    fireEvent.change(screen.getByRole("textbox", { name: "Site title" }), {
        target: { value: "The Daily Awesome" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), {
        target: { value: "Jamie Larson" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
        target: { value: "jamie@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "thisislongenough" },
    });
}

function submit() {
    fireEvent.click(screen.getByRole("button", { name: /Create account/ }));
}

describe("Setup", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.setupStatus.mockReturnValue({ data: { setup: [{ status: false }] } });
        mocks.completeSetupMutateAsync.mockResolvedValue({});
        mocks.createSessionMutateAsync.mockResolvedValue("Created");
        mocks.refetchCurrentUser.mockResolvedValue({ data: makeOwner() });
        mocks.editUserMutateAsync.mockResolvedValue({});
    });

    it("redirects to signin when the site is already set up", () => {
        mocks.setupStatus.mockReturnValue({ data: { setup: [{ status: true }] } });

        render(<Setup />);

        expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/signin");
    });

    // Ember's setup _afterAuthentication awaits onboarding.startChecklist()
    // before sending the new owner onward; without it the onboarding route
    // sees the default "pending" checklist and bounces to /analytics
    it("starts the owner onboarding checklist before reloading into onboarding", async () => {
        render(<Setup />);
        fillForm();
        submit();

        await waitFor(() => {
            expect(mocks.reloadAdmin).toHaveBeenCalledWith("/setup/onboarding?returnTo=/analytics");
        });

        // the checklist start PUTs the user with the started onboarding state
        expect(mocks.editUserMutateAsync).toHaveBeenCalledTimes(1);
        const savedUser = mocks.editUserMutateAsync.mock.calls[0][0] as User;
        expect(savedUser.id).toBe("user-1");
        const accessibility = JSON.parse(savedUser.accessibility!) as {
            onboarding: { checklistState: string; completedSteps: string[]; startedAt: string };
        };
        expect(accessibility.onboarding.checklistState).toBe("started");
        expect(accessibility.onboarding.completedSteps).toEqual([]);
        expect(Date.parse(accessibility.onboarding.startedAt)).not.toBeNaN();

        // ...and completes before the reload (mirrors home-redirect.tsx)
        expect(mocks.editUserMutateAsync.mock.invocationCallOrder[0])
            .toBeLessThan(mocks.reloadAdmin.mock.invocationCallOrder[0]);
    });

    it("merges the onboarding state into existing accessibility settings", async () => {
        mocks.refetchCurrentUser.mockResolvedValue({
            data: makeOwner({ accessibility: JSON.stringify({ nightShift: true }) }),
        });

        render(<Setup />);
        fillForm();
        submit();

        await waitFor(() => {
            expect(mocks.reloadAdmin).toHaveBeenCalled();
        });

        const savedUser = mocks.editUserMutateAsync.mock.calls[0][0] as User;
        const accessibility = JSON.parse(savedUser.accessibility!) as Record<string, unknown>;
        expect(accessibility.nightShift).toBe(true);
        expect(accessibility.onboarding).toMatchObject({ checklistState: "started" });
    });

    it("still reloads into onboarding when starting the checklist fails", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
            mocks.editUserMutateAsync.mockRejectedValue(new Error("network down"));

            render(<Setup />);
            fillForm();
            submit();

            await waitFor(() => {
                expect(mocks.reloadAdmin).toHaveBeenCalledWith("/setup/onboarding?returnTo=/analytics");
            });
        } finally {
            consoleError.mockRestore();
        }
    });

    it("does not start the checklist when setup fails", async () => {
        mocks.completeSetupMutateAsync.mockRejectedValue(new Error("boom"));

        render(<Setup />);
        fillForm();
        submit();

        await waitFor(() => {
            expect(screen.getByTestId("setup-flow-notification")).toHaveTextContent("There was a problem on the server.");
        });
        expect(mocks.editUserMutateAsync).not.toHaveBeenCalled();
        expect(mocks.reloadAdmin).not.toHaveBeenCalled();
    });
});
