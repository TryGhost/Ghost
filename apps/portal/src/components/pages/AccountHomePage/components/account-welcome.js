import AppContext from '../../../../app-context';
import {getSubscriptionExpiry, getMemberSubscription, hasOnlyFreePlan, isComplimentaryMember, subscriptionHasFreeTrial} from '../../../../utils/helpers';
import {getDateString} from '../../../../utils/date-time';
import {useContext} from 'react';

import SubscribeButton from './subscribe-button';
import {t} from '../../../../utils/i18n';

const AccountWelcome = () => {
    const {member, site} = useContext(AppContext);
    const {is_stripe_configured: isStripeConfigured} = site;

    if (!isStripeConfigured || hasOnlyFreePlan({site})) {
        return null;
    }
    const subscription = getMemberSubscription({member});
    const isComplimentary = isComplimentaryMember({member});
    const isGiftMember = member?.status === 'gift';
    if (isComplimentary && !subscription) {
        return null;
    }
    if (subscription) {
        const currentPeriodEnd = subscription?.current_period_end;
        const subscriptionExpiry = getSubscriptionExpiry({member});
        if ((isComplimentary || isGiftMember) && subscriptionExpiry) {
            return (
                <div className='gh-portal-section'>
                    <p className='gh-portal-text-center gh-portal-free-ctatext'>{t(`Your subscription will expire on {expiryDate}`, {expiryDate: subscriptionExpiry})}</p>
                </div>
            );
        }
        if (subscription?.cancel_at_period_end) {
            return null;
        }

        if (isComplimentary) {
            return null;
        }

        if (subscriptionHasFreeTrial({sub: subscription})) {
            const trialEnd = getDateString(subscription.trial_end_at);
            return (
                <div className='gh-portal-section'>
                    <p className='gh-portal-text-center gh-portal-free-ctatext'>{t(`Your subscription will start on {subscriptionStart}`, {subscriptionStart: trialEnd})}</p>
                </div>
            );
        }

        return (
            <div className='gh-portal-section'>
                <p className='gh-portal-text-center gh-portal-free-ctatext'>{t(`Your subscription will renew on {renewalDate}`, {renewalDate: getDateString(currentPeriodEnd)})}</p>
            </div>
        );
    }

    return (
        <div className='gh-portal-section'>
            <p className='gh-portal-text-center gh-portal-free-ctatext'>{t(`You currently have a free membership, upgrade to a paid subscription for full access.`)}</p>
            <SubscribeButton />
        </div>
    );
};

export default AccountWelcome;
