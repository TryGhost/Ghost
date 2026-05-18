import type React from "react";
import {Navigate, useLocation} from "@tryghost/admin-x-framework";
import {useOnboarding} from "@/onboarding/hooks/use-onboarding";

interface OnboardingRedirectProps {
    children: React.ReactNode;
}

export function OnboardingRedirect({children}: OnboardingRedirectProps) {
    const location = useLocation();
    const onboarding = useOnboarding();

    if (onboarding.isLoading) {
        return null;
    }

    if (onboarding.shouldShowChecklist) {
        const returnTo = `${location.pathname}${location.search}`;
        return <Navigate replace to={`/setup/onboarding?returnTo=${encodeURIComponent(returnTo)}`} />;
    }

    return children;
}
