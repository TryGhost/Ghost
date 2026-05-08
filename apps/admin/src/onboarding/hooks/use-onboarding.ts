import {useCallback, useEffect, useMemo, useRef} from "react";
import {useCurrentUser} from "@tryghost/admin-x-framework/api/current-user";
import {isOwnerUser} from "@tryghost/admin-x-framework/api/users";
import {useEditUserPreferences, useUserPreferences} from "@/hooks/user-preferences";
import type {OnboardingPreferences} from "@/hooks/user-preferences";
import {ONBOARDING_STEPS, type OnboardingStep} from "@/onboarding/constants";

const ONBOARDING_STARTED_AT_CUTOFF = new Date("2026-04-30T00:00:00.000Z");

function isAfterOnboardingStartedAtCutoff(date: Date | undefined) {
    if (!date) {
        return false;
    }

    return date >= ONBOARDING_STARTED_AT_CUTOFF;
}

export function useOnboarding() {
    const {data: currentUser, isLoading: isUserLoading} = useCurrentUser();
    const {data: preferences, isLoading: isPreferencesLoading} = useUserPreferences();
    const {mutateAsync: editPreferences} = useEditUserPreferences();
    const hasAttemptedInvalidStartedStateDismissalRef = useRef(false);

    const completedSteps = useMemo(() => preferences?.onboarding.completedSteps || [], [preferences?.onboarding.completedSteps]);
    const completedStepSet = useMemo(() => new Set(completedSteps), [completedSteps]);
    const checklistState = preferences?.onboarding.checklistState || "pending";
    const startedAt = preferences?.onboarding.startedAt;
    const hasActiveStartedAt = isAfterOnboardingStartedAtCutoff(startedAt);
    const isOwner = currentUser ? isOwnerUser(currentUser) : false;
    const shouldShowChecklist = isOwner && checklistState === "started" && hasActiveStartedAt;
    const nextStep = ONBOARDING_STEPS.find(step => !completedStepSet.has(step.id))?.id;
    const allStepsCompleted = ONBOARDING_STEPS.every(step => completedStepSet.has(step.id));

    const updateOnboarding = useCallback((updates: {
        completedSteps?: string[];
        checklistState?: OnboardingPreferences["checklistState"];
        startedAt?: Date;
    }) => {
        return editPreferences({
            onboarding: updates,
        });
    }, [editPreferences]);

    const markStepCompleted = useCallback(async (step: OnboardingStep) => {
        if (completedStepSet.has(step)) {
            return;
        }

        await updateOnboarding({
            completedSteps: [...completedSteps, step],
        });
    }, [completedStepSet, completedSteps, updateOnboarding]);

    const dismissChecklist = useCallback(() => {
        return updateOnboarding({checklistState: "dismissed"});
    }, [updateOnboarding]);

    useEffect(() => {
        if (isUserLoading || isPreferencesLoading || !isOwner || checklistState !== "started" || hasActiveStartedAt || hasAttemptedInvalidStartedStateDismissalRef.current) {
            return;
        }

        hasAttemptedInvalidStartedStateDismissalRef.current = true;
        void dismissChecklist().catch((error) => {
            hasAttemptedInvalidStartedStateDismissalRef.current = false;
            console.error(error);
        });
    }, [checklistState, dismissChecklist, hasActiveStartedAt, isOwner, isPreferencesLoading, isUserLoading]);

    const startChecklist = useCallback(() => {
        return updateOnboarding({
            completedSteps: [],
            checklistState: "started",
            startedAt: new Date(),
        });
    }, [updateOnboarding]);

    const completeChecklist = useCallback(() => {
        return updateOnboarding({checklistState: "completed"});
    }, [updateOnboarding]);

    return {
        allStepsCompleted,
        checklistState,
        completeChecklist,
        completedSteps,
        dismissChecklist,
        hasActiveStartedAt,
        isOwner,
        shouldShowChecklist,
        isLoading: isUserLoading || isPreferencesLoading,
        markStepCompleted,
        nextStep,
        startChecklist,
    };
}
