import { useState, type FormEvent } from "react";
import { useNavigate } from "@tryghost/admin-x-framework";
import { useRequestPasswordReset } from "@tryghost/admin-x-framework/api/authentication";
import { useCreateSession } from "@tryghost/admin-x-framework/api/session";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { Button, Input, Label } from "@tryghost/shade/components";
import { getFirstApiError, getTwoFactorErrorCode } from "./api-errors";
import { AuthLayout, FlowNotification } from "./auth-layout";
import { bootstrapAdminAfterAuth } from "./reload";
import { isValidEmail } from "./validation";

export default function Signin() {
    const navigate = useNavigate();
    const { data: siteData } = useBrowseSite();
    const createSession = useCreateSession();
    const requestPasswordReset = useRequestPasswordReset();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [flowError, setFlowError] = useState("");
    const [flowNotification, setFlowNotification] = useState("");
    const [passwordResetEmailSent, setPasswordResetEmailSent] = useState(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        setFlowError("");
        setFlowNotification("");

        if (!isValidEmail(email) || !password) {
            setFlowError("Please fill out the form to sign in.");
            return;
        }

        try {
            await createSession.mutateAsync({ username: email.trim(), password });
            bootstrapAdminAfterAuth();
        } catch (error) {
            const twoFactorCode = getTwoFactorErrorCode(error);
            if (twoFactorCode) {
                // Sign in succeeded but email verification is required; the
                // verification code email has already been sent by the API
                navigate("/signin/verify", { state: { errorCode: twoFactorCode } });
                return;
            }

            const apiError = getFirstApiError(error);
            if (!apiError) {
                setFlowError("There was a problem on the server.");
                return;
            }

            if (apiError.type === "PasswordResetRequiredError") {
                // The API has already sent the password reset email
                setPasswordResetEmailSent(true);
                return;
            }

            if (apiError.type === "TooManyRequestsError") {
                setFlowError(apiError.message);
                return;
            }

            setFlowError(apiError.context || apiError.message);
        }
    };

    const handleForgotPassword = async () => {
        setFlowError("");
        setFlowNotification("");

        if (!isValidEmail(email)) {
            setFlowError("We need your email address to reset your password.");
            return;
        }

        try {
            await requestPasswordReset.mutateAsync({ email: email.trim() });
            setFlowNotification("An email with password reset instructions has been sent.");
        } catch (error) {
            const apiError = getFirstApiError(error);
            setFlowError(apiError?.message || "There was a problem with the reset, please try again.");
        }
    };

    if (passwordResetEmailSent) {
        return (
            <AuthLayout heading="Update your password.">
                <p className="text-center text-muted-foreground">
                    For security, you need to create a new password. An email has been sent to you with instructions.
                </p>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout heading={siteData?.site.title}>
            <form className="flex flex-col gap-5" noValidate onSubmit={event => void handleSubmit(event)}>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="identification">Email address</Label>
                    <Input
                        autoCapitalize="off"
                        autoComplete="username"
                        autoCorrect="off"
                        id="identification"
                        name="identification"
                        placeholder="jamie@example.com"
                        type="email"
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Button
                            className="h-auto p-0"
                            disabled={requestPasswordReset.isLoading}
                            type="button"
                            variant="link"
                            onClick={() => void handleForgotPassword()}
                        >
                            Forgot?
                        </Button>
                    </div>
                    <Input
                        autoComplete="current-password"
                        autoCorrect="off"
                        id="password"
                        name="password"
                        placeholder="•••••••••••••••"
                        type="password"
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                    />
                </div>
                <Button disabled={createSession.isLoading} type="submit">
                    {"Sign in →"}
                </Button>
            </form>
            <FlowNotification isError={Boolean(flowError)} testId="signin-flow-notification">
                {flowError || flowNotification}
            </FlowNotification>
        </AuthLayout>
    );
}
