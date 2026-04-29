import {Navigate, useNavigate, useSearchParams} from "@tryghost/admin-x-framework";
import {getSettingValue, useBrowseSettings} from "@tryghost/admin-x-framework/api/settings";
import {useBrowseSite} from "@tryghost/admin-x-framework/api/site";
import {useRef, useState} from "react";
import {OnboardingChecklist} from "@/onboarding/components/onboarding-checklist";
import {SharePublicationDialog} from "@/onboarding/components/share-publication-dialog";
import {useOnboarding} from "@/onboarding/hooks/use-onboarding";
import {ONBOARDING_STEPS, type OnboardingStep} from "./constants";

function getSafeReturnTo(value: string | null) {
    return value && /^\/analytics(?:\/|\?|$)/.test(value) ? value : "/analytics";
}

export default function OnboardingRoute() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
    const onboarding = useOnboarding();
    const settings = useBrowseSettings();
    const site = useBrowseSite();
    const isLeavingRef = useRef(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);

    const siteTitle = String(getSettingValue(settings.data?.settings, "title") || site.data?.site.title || "your publication");
    const description = String(getSettingValue(settings.data?.settings, "description") || site.data?.site.description || "");
    const imageUrl = String(getSettingValue(settings.data?.settings, "cover_image") || "");
    const siteUrl = site.data?.site.url || "/";

    const {
        allStepsCompleted,
        completeChecklist,
        completedSteps,
        dismissChecklist,
        shouldShowChecklist,
        isLoading,
        markStepCompleted,
        nextStep,
    } = onboarding;

    if (isLoading || site.isLoading || isLeaving || isLeavingRef.current) {
        return null;
    }

    if (!shouldShowChecklist) {
        return <Navigate crossApp replace to={returnTo} />;
    }

    const navigateAfterUpdate = async (update: () => Promise<unknown>) => {
        isLeavingRef.current = true;
        setIsLeaving(true);
        try {
            await update();
            navigate(returnTo, {crossApp: true, replace: true});
        } catch (error) {
            isLeavingRef.current = false;
            setIsLeaving(false);
            console.error(error);
        }
    };

    const handleStepClick = async (step: OnboardingStep) => {
        if (step === "share-publication") {
            await markStepCompleted(step);
            setShareDialogOpen(true);
            return;
        }

        await markStepCompleted(step);

        const stepRoute = ONBOARDING_STEPS.find(({id}) => id === step)?.route;
        if (stepRoute) {
            navigate(stepRoute, {crossApp: true});
        }
    };

    return (
        <>
            <OnboardingChecklist
                allStepsCompleted={allStepsCompleted}
                completedSteps={completedSteps}
                nextStep={nextStep}
                siteTitle={siteTitle}
                onComplete={() => {
                    void navigateAfterUpdate(completeChecklist);
                }}
                onDismiss={() => {
                    void navigateAfterUpdate(dismissChecklist);
                }}
                onStepClick={(step) => {
                    void handleStepClick(step);
                }}
            />

            <SharePublicationDialog
                description={description}
                imageUrl={imageUrl}
                open={shareDialogOpen}
                siteTitle={siteTitle}
                siteUrl={siteUrl}
                onOpenChange={setShareDialogOpen}
            />
        </>
    );
}
