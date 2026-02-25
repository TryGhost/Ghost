import AppContext from '../../../../app-context';
import {getCompExpiry, getMemberSubscription, getMemberTierName, hasMultipleProductsFeature, hasOnlyFreePlan, isComplimentaryMember, isPaidMember, subscriptionHasFreeTrial, subscriptionHasFreeMonthsOffer} from '../../../../utils/helpers';
import {getDateString} from '../../../../utils/date-time';
import {ReactComponent as LoaderIcon} from '../../../../images/icons/loader.svg';
import {ReactComponent as OfferTagIcon} from '../../../../images/icons/offer-tag.svg';
import {useContext} from 'react';
import {t} from '../../../../utils/i18n';

const PaidAccountActions = () => {
    const {member, site, doAction} = useContext(AppContext);

    const onManageBilling = () => {
        const subscription = getMemberSubscription({member});
        doAction('manageBilling', {subscriptionId: subscription.id});
    };

    const openUpdatePlan = () => {
        const {is_stripe_configured: isStripeConfigured} = site;
        if (isStripeConfigured) {
            doAction('switchPage', {
                page: 'accountPlan',
                lastPage: 'accountHome'
            });
        }
    };

    const PlanLabel = ({price, isComplimentary, subscription}) => {
        const {next_payment: nextPayment} = subscription || {};

        let label = '';
        if (price) {
            const {amount = 0, currency, interval} = price;
            label = `${Intl.NumberFormat('en', {currency, style: 'currency'}).format(amount / 100)}/${t(interval)}`;
        }

        const compExpiry = getCompExpiry({member});
        if (isComplimentary) {
            if (compExpiry) {
                label = `${t('Complimentary')} - ${t('Expires {expiryDate}', {expiryDate: compExpiry})}`;
            } else {
                label = label ? `${t('Complimentary')} (${label})` : t(`Complimentary`);
            }
        }

        let oldPriceClassName = '';

        const hasFreeTrial = subscriptionHasFreeTrial({sub: subscription});

        if (hasFreeTrial) {
            oldPriceClassName = 'gh-portal-account-old-price';

            return (
                <>
                    <p className={oldPriceClassName}>
                        {label}
                    </p>
                    <FreeTrialLabel subscription={subscription} />
                </>
            );
        }

        const freeMonthOffer = subscriptionHasFreeMonthsOffer({sub: subscription});

        if (freeMonthOffer) {
            return (
                <>
                    <p className={oldPriceClassName}>
                        {label}
                    </p>
                    <FreeMonthsLabel nextPayment={nextPayment} subscription={subscription} />
                </>
            );
        }

        let offerLabelStr = getOfferLabel({nextPayment});

        if (offerLabelStr) {
            oldPriceClassName = 'gh-portal-account-old-price';
        }

        const OfferLabel = () => {
            if (offerLabelStr) {
                return (
                    <p className="gh-portal-account-discountcontainer" data-testid="offer-label">
                        <OfferTagIcon className="gh-portal-account-tagicon" />
                        <span>{offerLabelStr}</span>
                    </p>
                );
            }
            return null;
        };

        return (
            <>
                <p className={oldPriceClassName}>
                    {label}
                </p>
                <OfferLabel />
            </>
        );
    };

    const PlanUpdateButton = ({isPaid}) => {
        if (hasOnlyFreePlan({site}) && !isPaid) {
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
        const label = action === 'manageBilling:running' ? (
            <LoaderIcon className='gh-portal-billing-button-loader' />
        ) : t('Update');
        if (isComplimentary) {
            return null;
        }

        return (
            <section>
                <div className='gh-portal-list-detail'>
                    <h3>{t('Billing info & receipts')}</h3>
                    <CardLabel defaultCardLast4={defaultCardLast4} />
                </div>
                <button
                    className='gh-portal-btn gh-portal-btn-list'
                    onClick={e => onManageBilling(e)}
                    data-test-button='manage-billing'
                >
                    {label}
                </button>
            </section>
        );
    };

    const subscription = getMemberSubscription({member});
    const isComplimentary = isComplimentaryMember({member});
    const isPaid = isPaidMember({member});
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
                    <PlanUpdateButton isPaid={isPaid} />
                </section>
                <BillingSection isComplimentary={isComplimentary} defaultCardLast4={defaultCardLast4} />
            </>
        );
    }
    return null;
};

function FreeTrialLabel({subscription}) {
    if (subscriptionHasFreeTrial({sub: subscription})) {
        const trialEnd = getDateString(subscription.trial_end_at);
        return (
            <p className="gh-portal-account-discountcontainer">
                <div>
                    <span>{t('Free Trial – Ends {trialEnd}', {trialEnd})}</span>
                    {/* <span>{getSubFreeTrialDaysLeft({sub: subscription})} days left</span> */}
                </div>
            </p>
        );
    }
    return null;
}

// TODO: Add i18n once copy is finalized
function FreeMonthsLabel({nextPayment, subscription}) {
    const months = subscription?.offer?.duration_in_months ?? 0;
    const discountEnd = nextPayment?.discount?.end;
    const renewalDate = discountEnd ? getDateString(discountEnd) : null;
    const monthsText = months === 1 ? '1 month free' : `${months} months free`;
    const label = renewalDate ? `${monthsText} - Renews ${renewalDate}` : monthsText;

    return (
        <p className="gh-portal-account-discountcontainer" data-testid="offer-label">
            <OfferTagIcon className="gh-portal-account-tagicon" />
            <span>{label}</span>
        </p>
    );
}

/**
 * Display discounted price if an offer is active
 *
 * Examples:
 * - "$10.00 — Next payment" (once offer)
 * - "$10.00/month — Forever" (forever offer)
 * - "$10.00/month — Ends 2026-01-01" (repeating offer)
 *
 * @param {Object} nextPayment
 * @param {number} nextPayment.originalAmount - Original amount
 * @param {number} nextPayment.amount - Amount after discount. Same as original amount if no discount.
 * @param {string} nextPayment.currency - Currency (e.g. USD, EUR)
 * @param {'month'|'year'} nextPayment.interval
 * @param {Object|null} nextPayment.discount
 * @param {'once'|'repeating'|'forever'} nextPayment.discount.duration
 * @param {string} nextPayment.discount.start - Discount start date (ISO 8601 date string)
 * @param {string|null} nextPayment.discount.end - Discount end date (ISO 8601 date string), null for forever / once offers
 * @param {'fixed'|'percent'} nextPayment.discount.type
 * @param {number} nextPayment.discount.amount - Discount amount (e.g. 20 for 20% percent offer, or 2 for $2 fixed offer)

 * @returns {string}
 */
function getOfferLabel({nextPayment}) {
    if (!nextPayment) {
        return '';
    }

    const discount = nextPayment.discount;

    // No active discount
    if (!discount) {
        return '';
    }

    let durationLabel = '';
    if (discount.duration === 'forever') {
        durationLabel = t('Forever');
    } else if (discount.duration === 'once') {
        durationLabel = t('Next payment');
    } else if (discount.duration === 'repeating' && discount.end) {
        durationLabel = t('Ends {offerEndDate}', {offerEndDate: getDateString(discount.end)});
    }

    const formattedPrice = Intl.NumberFormat('en', {currency: nextPayment.currency, style: 'currency'}).format(nextPayment.amount / 100);

    let displayedPrice = '';
    if (discount.duration === 'once') {
        displayedPrice = formattedPrice;
    } else {
        displayedPrice = `${formattedPrice}/${nextPayment.interval}`;
    }

    return `${displayedPrice}${durationLabel ? ` — ${durationLabel}` : ''}`;
}

export default PaidAccountActions;
