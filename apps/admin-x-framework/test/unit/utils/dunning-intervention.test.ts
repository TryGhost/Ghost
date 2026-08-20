import {decideDunningIntervention} from '../../../src/utils/dunning-intervention';

const ownerInput = {
    subscriptionStatus: 'past_due',
    paymentAttempts: 3,
    forceUpgrade: false,
    audience: 'owner' as const,
    modalDismissed: false
};

describe('decideDunningIntervention', () => {
    it.each(['past_due', 'unpaid'])('shows the banner and pre-lock reminder for %s', (subscriptionStatus) => {
        expect(decideDunningIntervention({...ownerInput, subscriptionStatus})).toEqual({
            isCurrentDunning: true,
            bannerVisible: true,
            reminderModalVisible: true,
            copyVariant: 'owner-counted',
            visiblePaymentAttempts: 3,
            billingHandoff: 'owner-reminder'
        });
    });

    it.each([undefined, null, '', 'active', 'trialing', 'incomplete', 'incomplete_expired'])('does not intervene for %s', (subscriptionStatus) => {
        expect(decideDunningIntervention({...ownerInput, subscriptionStatus})).toEqual({
            isCurrentDunning: false,
            bannerVisible: false,
            reminderModalVisible: false,
            copyVariant: null,
            visiblePaymentAttempts: null,
            billingHandoff: 'none'
        });
    });

    it('keeps the banner but hands owners to Billing after the shared gate activates', () => {
        expect(decideDunningIntervention({...ownerInput, paymentAttempts: 5, forceUpgrade: true})).toEqual({
            isCurrentDunning: true,
            bannerVisible: true,
            reminderModalVisible: false,
            copyVariant: 'owner-counted',
            visiblePaymentAttempts: 5,
            billingHandoff: 'locked-owner'
        });
    });

    it('uses the shared gate rather than the attempt count during config convergence', () => {
        expect(decideDunningIntervention({...ownerInput, paymentAttempts: 5, forceUpgrade: false})).toMatchObject({
            bannerVisible: true,
            reminderModalVisible: true,
            billingHandoff: 'owner-reminder'
        });
    });

    it('does not let stale force-upgrade config override an active subscription', () => {
        expect(decideDunningIntervention({...ownerInput, subscriptionStatus: 'active', forceUpgrade: true})).toMatchObject({
            isCurrentDunning: false,
            bannerVisible: false,
            reminderModalVisible: false,
            billingHandoff: 'none'
        });
    });

    it('keeps the banner visible after the reminder is dismissed', () => {
        expect(decideDunningIntervention({...ownerInput, modalDismissed: true})).toMatchObject({
            bannerVisible: true,
            reminderModalVisible: false,
            billingHandoff: 'none'
        });
    });

    it.each([undefined, null, 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '3'])('uses generic owner copy for invalid attempt count %s', (paymentAttempts) => {
        expect(decideDunningIntervention({...ownerInput, paymentAttempts})).toMatchObject({
            copyVariant: 'owner-generic',
            visiblePaymentAttempts: null
        });
    });

    it('never exposes attempt data or a pre-lock Billing action to staff', () => {
        expect(decideDunningIntervention({...ownerInput, audience: 'staff'})).toEqual({
            isCurrentDunning: true,
            bannerVisible: true,
            reminderModalVisible: true,
            copyVariant: 'staff',
            visiblePaymentAttempts: null,
            billingHandoff: 'none'
        });
    });

    it('hands locked staff to the non-sensitive Billing surface', () => {
        expect(decideDunningIntervention({...ownerInput, audience: 'staff', forceUpgrade: true})).toMatchObject({
            reminderModalVisible: false,
            visiblePaymentAttempts: null,
            billingHandoff: 'locked-staff'
        });
    });
});
