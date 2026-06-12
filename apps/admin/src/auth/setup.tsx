import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "@tryghost/admin-x-framework";
import { getSetupStatus, useCompleteSetup } from "@tryghost/admin-x-framework/api/authentication";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { useCreateSession } from "@tryghost/admin-x-framework/api/session";
import { isOwnerUser, useEditUser } from "@tryghost/admin-x-framework/api/users";
import { Button, Input, Label } from "@tryghost/shade/components";
import { getFirstApiError } from "./api-errors";
import { AuthLayout, FlowNotification } from "./auth-layout";
import { clearSigninRedirect } from "./signin-redirect";
import { reloadAdmin } from "./reload";
import { MIN_PASSWORD_LENGTH, isValidEmail } from "./validation";

function decodeSetupValue(value?: string): string {
    return (value || "").replace(/&apos;/gim, "'");
}

export default function Setup() {
    const setupStatus = getSetupStatus();
    const completeSetup = useCompleteSetup();
    const createSession = useCreateSession();
    const { refetch: refetchCurrentUser } = useCurrentUser();
    const { mutateAsync: editUser } = useEditUser();

    const [blogTitle, setBlogTitle] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [flowError, setFlowError] = useState("");

    // Config-provided defaults (mirrors Ember's setup route prefill)
    const setup = setupStatus.data?.setup?.[0];
    useEffect(() => {
        if (!setup || setup.status) {
            return;
        }

        setBlogTitle(current => current || decodeSetupValue(setup.title));
        setName(current => current || decodeSetupValue(setup.name));
        setEmail(current => current || (setup.email || ""));
    }, [setup]);

    if (!setupStatus.data) {
        return null;
    }

    // Mirrors Ember's setup route: once the site is set up, /setup redirects
    // to the signin screen
    if (setup?.status) {
        return <Navigate replace to="/signin" />;
    }

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        setFlowError("");

        if (!blogTitle.trim() || !name.trim() || !isValidEmail(email) || !password || password.length < MIN_PASSWORD_LENGTH) {
            setFlowError("Please fill out every field correctly to set up your site.");
            return;
        }

        try {
            await completeSetup.mutateAsync({
                name: name.trim(),
                email: email.trim(),
                password,
                blogTitle: blogTitle.trim(),
            });
        } catch (error) {
            const apiError = getFirstApiError(error);
            setFlowError(apiError ? [apiError.message, apiError.context].filter(Boolean).join(" ") : "There was a problem on the server.");
            return;
        }

        try {
            await createSession.mutateAsync({ username: email.trim(), password });
        } catch (error) {
            const apiError = getFirstApiError(error);
            setFlowError(apiError ? [apiError.message, apiError.context].filter(Boolean).join(" ") : "There was a problem on the server.");
            return;
        }

        // Ember's setup _afterAuthentication starts the owner's onboarding
        // checklist (services/onboarding.js startChecklist) before sending
        // them onward — without it the onboarding route sees the default
        // "pending" state and bounces to /analytics. Like home-redirect.tsx's
        // firstStart handling it must COMPLETE before the navigation, but a
        // failure never strands the new owner on the setup screen.
        try {
            // the session only exists since createSession above, so the
            // current-user query (mounted signed-out) must be refetched first
            const { data: user } = await refetchCurrentUser();
            if (user && isOwnerUser(user)) {
                let accessibility: Record<string, unknown> = {};
                try {
                    const parsed: unknown = JSON.parse(user.accessibility || "{}");
                    if (parsed && typeof parsed === "object") {
                        accessibility = parsed as Record<string, unknown>;
                    }
                } catch {
                    // unreadable settings are overwritten, like Ember would throw away
                }
                accessibility.onboarding = {
                    completedSteps: [],
                    checklistState: "started",
                    startedAt: new Date().toISOString(),
                };
                await editUser({ ...user, accessibility: JSON.stringify(accessibility) });
            }
        } catch (error) {
            console.error(error);
        }

        // Same destination Ember uses after setup completes
        clearSigninRedirect();
        reloadAdmin("/setup/onboarding?returnTo=/analytics");
    };

    return (
        <AuthLayout heading="Welcome to Ghost.">
            <p className="text-center text-muted-foreground">
                All over the world, people have started 3,000,000+ incredible sites with Ghost. Today, we’re starting yours.
            </p>
            <form className="flex flex-col gap-5" noValidate onSubmit={event => void handleSubmit(event)}>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="blog-title">Site title</Label>
                    <Input
                        autoCorrect="off"
                        id="blog-title"
                        name="blog-title"
                        placeholder="The Daily Awesome"
                        type="text"
                        value={blogTitle}
                        onChange={event => setBlogTitle(event.target.value)}
                    />
                </div>
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
                        autoComplete="username email"
                        autoCorrect="off"
                        id="email"
                        name="email"
                        placeholder="jamie@example.com"
                        type="email"
                        value={email}
                        onChange={event => setEmail(event.target.value)}
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
                <Button disabled={completeSetup.isLoading || createSession.isLoading} type="submit">
                    {"Create account & start publishing →"}
                </Button>
            </form>
            <FlowNotification isError={Boolean(flowError)} testId="setup-flow-notification">
                {flowError}
            </FlowNotification>
        </AuthLayout>
    );
}
