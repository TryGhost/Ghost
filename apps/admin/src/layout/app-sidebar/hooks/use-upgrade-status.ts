import { useSubscriptionStatus } from "@/ember-bridge/EmberBridge";

export interface UpgradeStatus {
    showUpgradeBanner: boolean;
    trialDaysRemaining: number;
}

export function useUpgradeStatus(): UpgradeStatus {
    const subscriptionStatus = useSubscriptionStatus();
    const showUpgradeBanner = !!subscriptionStatus?.subscription.isActiveTrial;
    const trialDaysRemaining = subscriptionStatus?.subscription.trial_end ? Math.ceil((new Date(subscriptionStatus.subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

    return {
        showUpgradeBanner,
        trialDaysRemaining,
    }
}
