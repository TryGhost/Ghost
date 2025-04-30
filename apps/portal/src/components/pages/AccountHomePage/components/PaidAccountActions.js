import AppContext from '../../../../AppContext';
import {allowCompMemberUpgrade, getCompExpiry, getMemberSubscription, getMemberTierName, getUpdatedOfferPrice, hasMultipleProductsFeature, hasOnlyFreePlan, isComplimentaryMember, isPaidMember, isInThePast, subscriptionHasFreeTrial} from '../../../../utils/helpers';
import {getDateString} from '../../../../utils/date-time';
import {ReactComponent as LoaderIcon} from '../../../../images/icons/loader.svg';
import {ReactComponent as OfferTagIcon} from '../../../../images/icons/offer-tag.svg';
import {useContext} from 'react';

const PaidAccountActions = () => {
    const {member, site, onAction, t} = useContext(AppContext);

    const onEditBilling = () => {
        const subscription = getMemberSubscription({member});
        onAction('editBilling', {subscriptionId: subscription.id});
    };

    const openUpdatePlan = () => {
        const {is_stripe_configured: isStripeConfigured} = site;
        if (isStripeConfigured) {
            onAction('switchPage', {
                page: 'accountPlan',
                lastPage: 'accountHome'
            });
        }
    };

    const PlanLabel = ({price, isComplimentary, subscription}) => {
        const {
            offer,
            start_date: startDate
        } = subscription || {};
        let label = '';
        if (price) {
            const {amount = 0, currency, interval} = price;
            label = `${Intl.NumberFormat('en', {currency, style: 'currency'}).format(amount / 100)}/${t(interval)}`;
        }
        let offerLabelStr = getOfferLabel({price, offer, subscriptionStartDate: startDate, t});
        const compExpiry = getCompExpiry({member});
        if (isComplimentary) {
            if (compExpiry) {
                label = `${t('Complimentary')} - ${t('Expires {{expiryDate}}', {expiryDate: compExpiry})}`;
            } else {
                label = label ? `${t('Complimentary')} (${label})` : t(`Complimentary`);
            }
        }
        let oldPriceClassName = '';
        if (offerLabelStr) {
            oldPriceClassName = 'gh-portal-account-old-price';
        }
        const OfferLabel = () => {
            if (offerLabelStr) {
                return (
                    <p className="gh-portal-account-discountcontainer">
                        <OfferTagIcon className="gh-portal-account-tagicon" />
                        <span>{offerLabelStr}</span>
                    </p>
                );
            }
            return null;
        };

        const hasFreeTrial = subscriptionHasFreeTrial({sub: subscription});
        if (hasFreeTrial) {
            oldPriceClassName = 'gh-portal-account-old-price';
        }
        if (hasFreeTrial) {
            return (
                <>
                    <p className={oldPriceClassName}>
                        {label}
                    </p>
                    <FreeTrialLabel subscription={subscription} t={t} />
                </>
            );
        }

        return (
            <>
                <p className={oldPriceClassName}>
                    {label}
                </p>
                <OfferLabel />
            </>
        );
    };

    const PlanUpdateButton = ({isComplimentary, isPaid}) => {
        const hideUpgrade = allowCompMemberUpgrade({member}) ? false : isComplimentary;
        if (hideUpgrade || (hasOnlyFreePlan({site}) && !isPaid)) {
            return null;
        }
        return (
            <button
                className='gh-portal-btn gh-portal-btn-list' onClick={e => openUpdatePlan(e)}
                data-test-button='change-plan'
            >
                {t('Change')}
            </button>
        );
    };

    const CardLabel = ({defaultCardLast4}) => {
        if (defaultCardLast4) {
            const label = `**** **** **** ${defaultCardLast4}`;
            return (
                <p>
                    {label}
                </p>
            );
        }
        return null;
    };

    const BillingSection = ({defaultCardLast4, isComplimentary}) => {
        const {action} = useContext(AppContext);
        const label = action === 'editBilling:running' ? (
            <LoaderIcon className='gh-portal-billing-button-loader' />
        ) : t('Update');
        if (isComplimentary) {
            return null;
        }

        return (
            <section>
                <div className='gh-portal-list-detail'>
                    <h3>{t('Billing info')}</h3>
                    <CardLabel defaultCardLast4={defaultCardLast4} />
                </div>
                <button
                    className='gh-portal-btn gh-portal-btn-list'
                    onClick={e => onEditBilling(e)}
                    data-test-button='update-billing'
                >
                    {label}
                </button>
            </section>
        );
    };

    const subscription = getMemberSubscription({member});
    const isComplimentary = isComplimentaryMember({member});
    const isPaid = isPaidMember({member});
    const isCancelled = subscription?.cancel_at_period_end;
    if (subscription || isComplimentary) {
        const {
            price,
            default_payment_card_last4: defaultCardLast4
        } = subscription || {};
        let planLabel = t('Plan');

        // Show name of tiers if there are multiple tiers
        if (hasMultipleProductsFeature({site}) && getMemberTierName({member})) {
            planLabel = getMemberTierName({member});
        }
        // const hasFreeTrial = subscriptionHasFreeTrial({sub: subscription});
        // if (hasFreeTrial) {
        //     planLabel += ' (Free Trial)';
        // }
        return (
            <>
                <section>
                    <div className='gh-portal-list-detail'>
                        <h3>{planLabel}</h3>
                        <PlanLabel price={price} isComplimentary={isComplimentary} subscription={subscription} />
                    </div>
                    <PlanUpdateButton isComplimentary={isComplimentary} isPaid={isPaid} isCancelled={isCancelled} />
                </section>
                <BillingSection isComplimentary={isComplimentary} defaultCardLast4={defaultCardLast4} />
            </>
        );
    }
    return null;
};

function FreeTrialLabel({subscription, t}) {
    if (subscriptionHasFreeTrial({sub: subscription})) {
        const trialEnd = getDateString(subscription.trial_end_at);
        return (
            <p className="gh-portal-account-discountcontainer">
                <div>
                    <span>{t('Free Trial – Ends {{trialEnd}}', {trialEnd})}</span>
                    {/* <span>{getSubFreeTrialDaysLeft({sub: subscription})} days left</span> */}
                </div>
            </p>
        );
    }
    return null;
}

function getOfferLabel({offer, price, subscriptionStartDate, t}) {
    let offerLabel = '';

    if (offer?.type === 'trial') {
        return '';
    }

    if (offer?.duration === 'once') {
        return '';
    }

    if (offer) {
        const discountDuration = offer.duration;
        let durationLabel = '';
        if (discountDuration === 'forever') {
            durationLabel = t(`Forever`);
        } else if (discountDuration === 'repeating') {
            const durationInMonths = offer.duration_in_months || 0;
            let offerStartDate = new Date(subscriptionStartDate);
            let offerEndDate = new Date(offerStartDate.setMonth(offerStartDate.getMonth() + durationInMonths));
            // don't show expired offers if the offer is not forever
            if (isInThePast(offerEndDate)) {
                return '';
            }
            durationLabel = t('Ends {{offerEndDate}}', {offerEndDate: getDateString(offerEndDate)});
        }
        offerLabel = `${getUpdatedOfferPrice({offer, price, useFormatted: true})}/${price.interval}${durationLabel ? ` — ${durationLabel}` : ``}`;
    }
    return offerLabel;
}

export default PaidAccountActions;
