import { useState, type FormEvent } from "react";
import { useParams } from "@tryghost/admin-x-framework";
import { useResetPassword } from "@tryghost/admin-x-framework/api/authentication";
import { Button, Input } from "@tryghost/shade/components";
import { getFirstApiError } from "./api-errors";
import { AuthLayout, FlowNotification } from "./auth-layout";
import { bootstrapAdminAfterAuth } from "./reload";

export default function Reset() {
    const { token = "" } = useParams<{ token: string }>();
    const resetPassword = useResetPassword();

    const [newPassword, setNewPassword] = useState("");
    const [ne2Password, setNe2Password] = useState("");
    const [flowError, setFlowError] = useState("");

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        setFlowError("");

        // Client-side checks matching the Ember reset validator; the API
        // enforces the full password rules and its message is surfaced below
        if (!newPassword) {
            setFlowError("Please enter a password.");
            return;
        }
        if (newPassword !== ne2Password) {
            setFlowError("The two new passwords don't match.");
            return;
        }
        if (newPassword.length < 10) {
            setFlowError("Password must be at least 10 characters long.");
            return;
        }

        try {
            // On success the API mints a verified session in the same
            // response, so all that is left is to boot the admin with it
            await resetPassword.mutateAsync({ newPassword, ne2Password, token });
            bootstrapAdminAfterAuth();
        } catch (error) {
            const apiError = getFirstApiError(error);
            setFlowError(apiError?.message || "There was a problem resetting your password, please try again.");
        }
    };

    return (
        <AuthLayout heading="Reset your password.">
            <form className="flex flex-col gap-5" noValidate onSubmit={event => void handleSubmit(event)}>
                <Input
                    aria-label="New password"
                    autoCorrect="off"
                    name="newPassword"
                    placeholder="New password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => {
                        setFlowError("");
                        setNewPassword(event.target.value);
                    }}
                />
                <Input
                    aria-label="Confirm new password"
                    autoCorrect="off"
                    name="ne2Password"
                    placeholder="Confirm new password"
                    type="password"
                    value={ne2Password}
                    onChange={(event) => {
                        setFlowError("");
                        setNe2Password(event.target.value);
                    }}
                />
                <Button disabled={resetPassword.isLoading} type="submit">
                    Save new password
                </Button>
            </form>
            <FlowNotification isError={Boolean(flowError)} testId="reset-flow-notification">
                {flowError}
            </FlowNotification>
        </AuthLayout>
    );
}
