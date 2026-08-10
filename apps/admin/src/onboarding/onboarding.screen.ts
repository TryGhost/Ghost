import {page} from "vitest/browser";
import {
    allSetHeading,
    getStartedHeading,
    onboardingChecklist,
    onboardingComplete,
    onboardingShareModal,
    onboardingSkip,
    onboardingStepPrefix,
} from "@tryghost/test-data/selectors/onboarding";

/** Onboarding screen locators and gestures for acceptance specs; no assertions. */
export const onboardingScreen = {
    checklist: () => page.getByTestId(onboardingChecklist),
    getStartedHeading: () => page.getByRole("heading", {name: getStartedHeading}),
    allSetHeading: () => page.getByRole("heading", {name: allSetHeading}),
    step: (stepId: string) => page.getByTestId(`${onboardingStepPrefix}${stepId}`),
    shareModal: () => page.getByTestId(onboardingShareModal),
    skipButton: () => page.getByTestId(onboardingSkip),
    completeButton: () => page.getByTestId(onboardingComplete),
};
