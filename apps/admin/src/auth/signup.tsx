import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "@tryghost/admin-x-framework";
import { getInvitationValidity, getTokenEmail, useAcceptInvitation } from "@tryghost/admin-x-framework/api/authentication";
import { useCreateSession } from "@tryghost/admin-x-framework/api/session";
import { Button, Input, Label } from "@tryghost/shade/components";
import { getFirstApiError, getTwoFactorErrorCode } from "./api-errors";
import { AuthLayout, FlowNotification } from "./auth-layout";
import { bootstrapAdminAfterAuth } from "./reload";
import { MIN_PASSWORD_LENGTH } from "./validation";

/**
 * Ember bounced invalid invites to signin with a floating alert; the React
 * screen explains the problem in place instead (the silent-looking redirect
 * left invitees wondering why they were asked to sign in).
 */
function InvalidInvitation({ message }: { message: string }) {
    return (
        <AuthLayout heading="Create your account.">
            <FlowNotification isError testId="signup-flow-notification">
                {message}
            </FlowNotification>
            <p className="text-center text-muted-foreground">
                Ask the person who invited you to send a new invitation, or{" "}
                <Link className="underline" to="/signin">sign in</Link> if you already have an account.
            </p>
        </AuthLayout>
    );
}

export default function Signup() {
    const navigate = useNavigate();
    const { token = "" } = useParams<{ token: string }>();
    const email = getTokenEmail(token);

    const invitation = getInvitationValidity(email || "", { enabled: Boolean(email) });
    const acceptInvitation = useAcceptInvitation();
    const createSession = useCreateSession();

    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [flowError, setFlowError] = useState("");

    // An unparseable token can never produce a valid invitation
    if (!email) {
        return <InvalidInvitation message="Invalid invitation link." />;
    }

    // While the check is loading the form is shown optimistically; a failed
    // check is treated as valid, like Ember's catch handler.
    if (invitation.data?.invitation?.[0]?.valid === false) {
        return <InvalidInvitation message="The invitation does not exist or is no longer valid." />;
    }

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        setFlowError("");

        if (!name.trim() || !password || password.length < MIN_PASSWORD_LENGTH) {
            setFlowError("Please fill out the form to complete your signup");
            return;
        }

        try {
            await acceptInvitation.mutateAsync({ name: name.trim(), email, password, token });
        } catch (error) {
            const apiError = getFirstApiError(error);
            setFlowError(apiError?.message || "There was a problem completing your signup, please try again.");
            return;
        }

        try {
            await createSession.mutateAsync({ username: email, password });
            bootstrapAdminAfterAuth();
        } catch (error) {
            const twoFactorCode = getTwoFactorErrorCode(error);
            if (twoFactorCode) {
                navigate("/signin/verify", { state: { errorCode: twoFactorCode } });
                return;
            }

            const apiError = getFirstApiError(error);
            setFlowError(apiError?.message || "Signup complete, but we could not sign you in. Please sign in manually.");
        }
    };

    return (
        <AuthLayout heading="Create your account.">
            <form className="flex flex-col gap-5" noValidate onSubmit={event => void handleSubmit(event)}>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                        autoComplete="name"
                        autoCorrect="off"
                        id="name"
                        name="name"
                        placeholder="Jamie Larson"
                        type="text"
                        value={name}
                        onChange={event => setName(event.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                        readOnly
                        autoComplete="username email"
                        autoCorrect="off"
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        autoComplete="new-password"
                        autoCorrect="off"
                        id="password"
                        name="password"
                        placeholder="At least 10 characters"
                        type="password"
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                    />
                </div>
                <Button disabled={acceptInvitation.isLoading || createSession.isLoading} type="submit">
                    {"Create Account →"}
                </Button>
            </form>
            <FlowNotification isError={Boolean(flowError)} testId="signup-flow-notification">
                {flowError}
            </FlowNotification>
        </AuthLayout>
    );
}
