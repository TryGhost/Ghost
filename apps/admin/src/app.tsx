import { Outlet, useLocation, useNavigate } from "@tryghost/admin-x-framework";
import { useState } from "react";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { TrialPrivateSiteSimulatorProvider, TrialPrivateSiteSimulatorToolbar } from "@tryghost/admin-x-settings/src/components/trial-private-site-simulator/trial-private-site-simulator";
import { EmberProvider, EmberFallback, EmberRoot } from "./ember-bridge";
import { AdminLayout } from "./layout/admin-layout";
import { useEmberAuthSync, useEmberDataSync } from "./ember-bridge";
import { useOnboarding } from "./onboarding/hooks/use-onboarding";

function OnboardingSimulatorToggle() {
    const location = useLocation();
    const navigate = useNavigate();
    const onboarding = useOnboarding();
    const [isSaving, setIsSaving] = useState(false);

    const isOnboardingMode = onboarding.checklistState === "started" && onboarding.hasActiveStartedAt;

    const handleToggle = async () => {
        setIsSaving(true);

        try {
            if (isOnboardingMode) {
                await onboarding.dismissChecklist();

                if (location.pathname === "/setup/onboarding") {
                    navigate("/analytics", { crossApp: true, replace: true });
                }

                return;
            }

            await onboarding.startChecklist();
            navigate("/setup/onboarding?returnTo=%2Fanalytics", { crossApp: true });
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <button
            className={`h-7 rounded px-3 text-sm font-semibold transition ${isOnboardingMode ? "bg-black text-white dark:bg-white dark:text-black" : "bg-grey-100 text-grey-700 hover:text-black dark:bg-grey-900 dark:text-grey-400 dark:hover:text-white"}`}
            disabled={isSaving || onboarding.isLoading || !onboarding.isOwner}
            title={onboarding.isOwner ? "Toggle onboarding flow preview" : "Only owners can preview onboarding"}
            type="button"
            onClick={() => {
                void handleToggle();
            }}
        >
            {isSaving ? "Saving..." : "Onboarding"}
        </button>
    );
}

function App() {
    const { data: currentUser } = useCurrentUser();
    useEmberAuthSync();
    useEmberDataSync();

    return (
        <EmberProvider>
            {currentUser ?
                <TrialPrivateSiteSimulatorProvider>
                    <TrialPrivateSiteSimulatorToolbar>
                        <OnboardingSimulatorToggle />
                    </TrialPrivateSiteSimulatorToolbar>
                    <AdminLayout>
                        <Outlet />
                        <EmberRoot />
                    </AdminLayout>
                </TrialPrivateSiteSimulatorProvider>
                :
                <>
                    <EmberFallback />
                    <EmberRoot />
                </>
            }
        </EmberProvider>
    );
}

export default App;
