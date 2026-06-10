import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "@tryghost/admin-x-framework";
import { useSendVerificationCode, useVerifySession } from "@tryghost/admin-x-framework/api/session";
import { Button, Input, Label } from "@tryghost/shade/components";
import { getFirstApiError, isUnauthorizedError } from "./api-errors";
import { AuthLayout, FlowNotification } from "./auth-layout";
import { bootstrapAdminAfterAuth } from "./reload";

const RESEND_AVAILABILITY_DELAY_MS = 15_000;

export default function SigninVerify() {
    const location = useLocation();
    const verifySession = useVerifySession();
    const sendVerificationCode = useSendVerificationCode();

    // Signin passes the 403 error code along so we can distinguish "user has
    // 2FA enabled" from "new device detected" (mirrors Ember's session.errorCode)
    const errorCode = (location.state as { errorCode?: string } | null)?.errorCode;
    const twoFactorRequired = errorCode === "2FA_TOKEN_REQUIRED";

    const [token, setToken] = useState("");
    const [flowError, setFlowError] = useState("");
    const [resendDelayed, setResendDelayed] = useState(false);

    useEffect(() => {
        if (!resendDelayed) {
            return;
        }

        const timeout = setTimeout(() => setResendDelayed(false), RESEND_AVAILABILITY_DELAY_MS);
        return () => clearTimeout(timeout);
    }, [resendDelayed]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        setFlowError("");

        const trimmedToken = token.trim();
        if (!trimmedToken) {
            setFlowError("Verification code is required");
            return;
        }
        if (!/^\d{6}$/.test(trimmedToken)) {
            setFlowError("Verification code must be 6 numbers");
            return;
        }

        try {
            await verifySession.mutateAsync({ token: trimmedToken });
            bootstrapAdminAfterAuth();
        } catch (error) {
            if (isUnauthorizedError(error)) {
                setFlowError("Your verification code is incorrect.");
                return;
            }

            const apiError = getFirstApiError(error);
            setFlowError(apiError?.message || "There was a problem verifying the code. Please try again.");
        }
    };

    const handleResend = async () => {
        setFlowError("");

        try {
            await sendVerificationCode.mutateAsync();
            setResendDelayed(true);
        } catch (error) {
            const apiError = getFirstApiError(error);
            setFlowError(apiError?.message || "There was a problem resending the verification token.");
        }
    };

    const resendLabel = sendVerificationCode.isLoading ? "Sending" : (resendDelayed ? "Sent" : "Resend");

    return (
        <AuthLayout heading={twoFactorRequired ? "2FA confirmation" : "Verify it's really you"}>
            <p className="text-center text-muted-foreground">
                {twoFactorRequired
                    ? "Enter the sign-in verification code sent to your email."
                    : "It looks like you're signing in from a new device. A 6-digit sign-in verification code has been sent to your email to keep your account safe."}
            </p>
            <form className="flex flex-col gap-5" noValidate onSubmit={event => void handleSubmit(event)}>
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="token">Verification code</Label>
                        <Button
                            className="h-auto p-0"
                            disabled={sendVerificationCode.isLoading || resendDelayed}
                            type="button"
                            variant="link"
                            onClick={() => void handleResend()}
                        >
                            {resendLabel}
                        </Button>
                    </div>
                    <Input
                        autoComplete="one-time-code"
                        data-1p-ignore
                        id="token"
                        inputMode="numeric"
                        name="token"
                        pattern="[0-9]*"
                        placeholder="• • • • • •"
                        type="text"
                        value={token}
                        onChange={(event) => {
                            setFlowError("");
                            setToken(event.target.value);
                        }}
                    />
                </div>
                <Button disabled={verifySession.isLoading} type="submit">
                    {"Verify →"}
                </Button>
            </form>
            <FlowNotification isError={Boolean(flowError)} testId="signin-verify-flow-notification">
                {flowError}
            </FlowNotification>
        </AuthLayout>
    );
}
