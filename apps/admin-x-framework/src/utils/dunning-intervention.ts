const CURRENT_DUNNING_STATUSES = new Set(['past_due', 'unpaid']);

export type DunningAudience = 'owner' | 'staff';
export type DunningCopyVariant = 'owner-counted' | 'owner-generic' | 'staff';
export type DunningBillingHandoff = 'none' | 'owner-reminder' | 'locked-owner' | 'locked-staff';

export interface DunningInterventionInput {
    subscriptionStatus: unknown;
    paymentAttempts: unknown;
    forceUpgrade: boolean;
    audience: DunningAudience;
    modalDismissed: boolean;
}

export interface DunningInterventionDecision {
    isCurrentDunning: boolean;
    bannerVisible: boolean;
    reminderModalVisible: boolean;
    copyVariant: DunningCopyVariant | null;
    visiblePaymentAttempts: number | null;
    billingHandoff: DunningBillingHandoff;
}

function getVisiblePaymentAttempts(paymentAttempts: unknown, audience: DunningAudience): number | null {
    if (audience !== 'owner') {
        return null;
    }

    if (!Number.isSafeInteger(paymentAttempts) || (paymentAttempts as number) <= 0) {
        return null;
    }

    return paymentAttempts as number;
}

export function decideDunningIntervention({
    subscriptionStatus,
    paymentAttempts,
    forceUpgrade,
    audience,
    modalDismissed
}: DunningInterventionInput): DunningInterventionDecision {
    const isCurrentDunning = typeof subscriptionStatus === 'string' && CURRENT_DUNNING_STATUSES.has(subscriptionStatus);

    if (!isCurrentDunning) {
        return {
            isCurrentDunning: false,
            bannerVisible: false,
            reminderModalVisible: false,
            copyVariant: null,
            visiblePaymentAttempts: null,
            billingHandoff: 'none'
        };
    }

    const visiblePaymentAttempts = getVisiblePaymentAttempts(paymentAttempts, audience);
    const copyVariant = audience === 'staff'
        ? 'staff'
        : visiblePaymentAttempts === null ? 'owner-generic' : 'owner-counted';
    const reminderModalVisible = !forceUpgrade && !modalDismissed;

    let billingHandoff: DunningBillingHandoff = 'none';
    if (forceUpgrade) {
        billingHandoff = audience === 'owner' ? 'locked-owner' : 'locked-staff';
    } else if (reminderModalVisible && audience === 'owner') {
        billingHandoff = 'owner-reminder';
    }

    return {
        isCurrentDunning: true,
        bannerVisible: true,
        reminderModalVisible,
        copyVariant,
        visiblePaymentAttempts,
        billingHandoff
    };
}
