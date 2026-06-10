import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { JSONError, type ErrorResponse } from "@tryghost/admin-x-framework/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Signin from "./signin";

const mocks = vi.hoisted(() => ({
    bootstrapAdminAfterAuth: vi.fn(),
    createSessionMutateAsync: vi.fn(),
    navigate: vi.fn(),
    requestPasswordResetMutateAsync: vi.fn(),
}));

vi.mock("@tryghost/admin-x-framework", () => ({
    useNavigate: () => mocks.navigate,
}));

vi.mock("@tryghost/admin-x-framework/api/session", () => ({
    useCreateSession: () => ({
        isLoading: false,
        mutateAsync: mocks.createSessionMutateAsync,
    }),
}));

vi.mock("@tryghost/admin-x-framework/api/authentication", () => ({
    useRequestPasswordReset: () => ({
        isLoading: false,
        mutateAsync: mocks.requestPasswordResetMutateAsync,
    }),
}));

vi.mock("@tryghost/admin-x-framework/api/site", () => ({
    useBrowseSite: () => ({
        data: { site: { authX: true, title: "Test Site" } },
        isLoading: false,
    }),
}));

vi.mock("./reload", () => ({
    bootstrapAdminAfterAuth: mocks.bootstrapAdminAfterAuth,
}));

function jsonError(status: number, error: Partial<ErrorResponse["errors"][0]>) {
    const data = { errors: [error] } as ErrorResponse;
    return new JSONError(new Response(null, { status }), data);
}

function fillForm(email = "jamie@example.com", password = "secure-password-123") {
    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
        target: { value: email },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: password },
    });
}

function submit() {
    fireEvent.click(screen.getByRole("button", { name: "Sign in →" }));
}

describe("Signin", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows a validation message when the form is submitted empty", async () => {
        render(<Signin />);

        submit();

        expect(await screen.findByTestId("signin-flow-notification")).toHaveTextContent("Please fill out the form to sign in.");
        expect(mocks.createSessionMutateAsync).not.toHaveBeenCalled();
    });

    it("creates a session and bootstraps the admin on success", async () => {
        mocks.createSessionMutateAsync.mockResolvedValue("Created");
        render(<Signin />);

        fillForm();
        submit();

        await waitFor(() => {
            expect(mocks.createSessionMutateAsync).toHaveBeenCalledWith({
                username: "jamie@example.com",
                password: "secure-password-123",
            });
            expect(mocks.bootstrapAdminAfterAuth).toHaveBeenCalled();
        });
    });

    it("shows the API error message when the credentials are rejected", async () => {
        mocks.createSessionMutateAsync.mockRejectedValue(
            jsonError(401, { code: "", context: null, message: "Your password is incorrect.", type: "UnauthorizedError" }),
        );
        render(<Signin />);

        fillForm();
        submit();

        expect(await screen.findByTestId("signin-flow-notification")).toHaveTextContent("Your password is incorrect.");
        expect(mocks.bootstrapAdminAfterAuth).not.toHaveBeenCalled();
    });

    it("redirects to the verification screen when 2FA is required", async () => {
        mocks.createSessionMutateAsync.mockRejectedValue(
            jsonError(403, { code: "2FA_TOKEN_REQUIRED", context: null, message: "User must verify session to login.", type: "Needs2FAError" }),
        );
        render(<Signin />);

        fillForm();
        submit();

        await waitFor(() => {
            expect(mocks.navigate).toHaveBeenCalledWith("/signin/verify", {
                state: { errorCode: "2FA_TOKEN_REQUIRED" },
            });
        });
    });

    it("redirects to the verification screen when a new device is detected", async () => {
        mocks.createSessionMutateAsync.mockRejectedValue(
            jsonError(403, { code: "2FA_NEW_DEVICE_DETECTED", context: null, message: "User must verify session to login.", type: "Needs2FAError" }),
        );
        render(<Signin />);

        fillForm();
        submit();

        await waitFor(() => {
            expect(mocks.navigate).toHaveBeenCalledWith("/signin/verify", {
                state: { errorCode: "2FA_NEW_DEVICE_DETECTED" },
            });
        });
    });

    it("shows the reset-sent pane when a password reset is required", async () => {
        mocks.createSessionMutateAsync.mockRejectedValue(
            jsonError(401, { code: "", context: null, message: "Password must be reset.", type: "PasswordResetRequiredError" }),
        );
        render(<Signin />);

        fillForm();
        submit();

        expect(await screen.findByRole("heading", { name: "Update your password." })).toBeInTheDocument();
    });

    it("requires an email address before requesting a password reset", async () => {
        render(<Signin />);

        fireEvent.click(screen.getByRole("button", { name: "Forgot?" }));

        expect(await screen.findByTestId("signin-flow-notification")).toHaveTextContent("We need your email address to reset your password.");
        expect(mocks.requestPasswordResetMutateAsync).not.toHaveBeenCalled();
    });

    it("confirms when the password reset email was sent", async () => {
        mocks.requestPasswordResetMutateAsync.mockResolvedValue({});
        render(<Signin />);

        fillForm();
        fireEvent.click(screen.getByRole("button", { name: "Forgot?" }));

        expect(await screen.findByTestId("signin-flow-notification")).toHaveTextContent("An email with password reset instructions has been sent.");
    });

    it("shows the API error when the password reset request fails", async () => {
        mocks.requestPasswordResetMutateAsync.mockRejectedValue(
            jsonError(404, { code: "", context: null, message: "User not found.", type: "NotFoundError" }),
        );
        render(<Signin />);

        fillForm();
        fireEvent.click(screen.getByRole("button", { name: "Forgot?" }));

        expect(await screen.findByTestId("signin-flow-notification")).toHaveTextContent("User not found.");
    });
});
