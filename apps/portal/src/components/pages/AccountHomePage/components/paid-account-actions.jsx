import AppContext from '../../../../app-context';
import {
  getSubscriptionExpiry,
  getMemberSubscription,
  getMemberTierName,
  hasOnlyFreePlan,
  isArchivedTier,
  isComplimentaryMember,
  isGiftMember,
  isPaidMember,
  arePaidMembersEnabled,
  subscriptionHasFreeTrial,
} from '../../../../utils/helpers';
import { getDateString } from '../../../../utils/date-time';
import GiftIcon from '../../../../images/icons/gift.svg?react';
import LoaderIcon from '../../../../images/icons/loader.svg?react';
import OfferTagIcon from '../../../../images/icons/offer-tag.svg?react';
import { useContext } from 'react';
import { t } from '../../../../utils/i18n';

const PaidAccountActions = () => {
  const { member, site, doAction } = useContext(AppContext);

  const onManageBilling = () => {
    const subscription = getMemberSubscription({ member });
    doAction('manageBilling', { subscriptionId: subscription.id });
  };

  const openUpdatePlan = () => {
    if (arePaidMembersEnabled({ site })) {
      doAction('switchPage', {
        page: 'accountPlan',
        lastPage: 'accountHome',
      });
    }
  };

  const PlanLabel = ({ price, isComplimentary, subscription }) => {
    const { next_payment: nextPayment } = subscription || {};

    let label = '';
    if (price) {
      const { amount = 0, currency, interval } = price;
      label = `${Intl.NumberFormat('en', { currency, style: 'currency' }).format(amount / 100)}/${t(interval)}`;
    }

    const subscriptionExpiry = getSubscriptionExpiry({ member });

    if (isGiftMember({ member }) && subscriptionExpiry) {
      return (
        <p className="gh-portal-account-discountcontainer relative flex flex-wrap items-center">
          <GiftIcon className="gh-portal-account-tagicon z-[999] me-1 size-4 text-brand" />
          <span>{t('Gift subscription')}</span>
          <span className="gh-portal-account-expiry-separator mx-1 my-0 max-sm:hidden">-</span>
          <span className="gh-portal-account-expiry whitespace-nowrap max-sm:basis-full">
            {t('Expires {expiryDate}', { expiryDate: subscriptionExpiry })}
          </span>
        </p>
      );
    } else if (isComplimentary) {
      if (subscriptionExpiry) {
        label = `${t('Complimentary')} - ${t('Expires {expiryDate}', { expiryDate: subscriptionExpiry })}`;
      } else {
        label = t('Complimentary');
      }
    }

    let oldPriceClassName = '';

    const hasFreeTrial = subscriptionHasFreeTrial({ sub: subscription });

    if (hasFreeTrial) {
      oldPriceClassName = 'gh-portal-account-old-price !text-gray-400 line-through';

      return (
        <>
          <p className={oldPriceClassName}>{label}</p>
          <FreeTrialLabel subscription={subscription} />
        </>
      );
    }

    const offerLabelStr = getOfferLabel({ nextPayment });

    if (offerLabelStr) {
      oldPriceClassName = 'gh-portal-account-old-price !text-gray-400 line-through';
    }

    const OfferLabel = () => {
      if (offerLabelStr) {
        return (
          <p
            className="gh-portal-account-discountcontainer relative flex flex-wrap items-center"
            data-testid="offer-label"
          >
            <OfferTagIcon className="gh-portal-account-tagicon z-[999] me-1 size-4 text-brand" />
            <span>{offerLabelStr}</span>
          </p>
        );
      }
      return null;
    };

    return (
      <>
        <p className={oldPriceClassName}>{label}</p>
        <OfferLabel />
      </>
    );
  };

  const PlanUpdateButton = ({ isPaid }) => {
    const hasGiftSubscription = isGiftMember({ member });

    if (hasGiftSubscription && !arePaidMembersEnabled({ site })) {
      return null;
    }

    const canContinueGiftSubscription = hasGiftSubscription && !isArchivedTier({ member, site });

    // If no paid tiers are available, hide the plan update button for:
    // - Free members, as they have no paid plans to upgrade to
    // - Gift members on archived tiers, as they have no paid plans to upgrade to
    //
    // In constrast, still render the button for:
    // - Paid members so that they can adjust the cadence on their existing sub
    // - Comped members so that they can contact publishers to make changes to their complimentary access
    if (
      hasOnlyFreePlan({ site }) &&
      (!isPaid || (hasGiftSubscription && !canContinueGiftSubscription))
    ) {
      return null;
    }

    if (canContinueGiftSubscription) {
      return (
        <button
          className="gh-portal-btn gh-portal-btn-list relative -mx-1 my-0 flex h-[38px] cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md border-none bg-white px-1 py-0 text-center text-base font-medium leading-[1em] tracking-[0.2px] text-brand no-underline [outline:none] [transition:all_0.25s_ease] hover:border-gray-300 hover:opacity-75 disabled:cursor-auto disabled:!opacity-50"
          onClick={(e) => {
            e.stopPropagation();
            doAction('continueGiftSubscription');
          }}
          data-test-button="continue-gift-subscription"
        >
          {t('Continue')}
        </button>
      );
    }
    return (
      <button
        className="gh-portal-btn gh-portal-btn-list relative -mx-1 my-0 flex h-[38px] cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md border-none bg-white px-1 py-0 text-center text-base font-medium leading-[1em] tracking-[0.2px] text-brand no-underline [outline:none] [transition:all_0.25s_ease] hover:border-gray-300 hover:opacity-75 disabled:cursor-auto disabled:!opacity-50"
        onClick={(e) => {
          e.stopPropagation();
          openUpdatePlan(e);
        }}
        data-test-button="change-plan"
      >
        {t('Change')}
      </button>
    );
  };

  const CardLabel = ({ defaultCardLast4 }) => {
    if (defaultCardLast4) {
      const label = `**** **** **** ${defaultCardLast4}`;
      return <p>{label}</p>;
    }
    return null;
  };

  const BillingSection = ({ defaultCardLast4 }) => {
    const { action } = useContext(AppContext);
    const label =
      action === 'manageBilling:running' ? (
        <LoaderIcon className="gh-portal-billing-button-loader -me-[3px] size-8 opacity-60" />
      ) : (
        t('Update')
      );

    return (
      <section
        className="gh-portal-list-clickable cursor-pointer focus-visible:[box-shadow:inset_0_0_0_2px_var(--brandcolor)] focus-visible:[outline:none]"
        role="button"
        tabIndex={0}
        onClick={onManageBilling}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) {
            return;
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onManageBilling();
          }
        }}
      >
        <div className="gh-portal-list-detail grow [&_h3]:text-base [&_h3]:font-semibold [&_p]:mb-0 [&_p]:me-2 [&_p]:ms-0 [&_p]:mt-[5px] [&_p]:text-[1.45rem] [&_p]:leading-[1.3em] [&_p]:tracking-[0.3px] [&_p]:text-gray-700 [&_p]:[word-break:break-word]">
          <h3>{t('Billing info & receipts')}</h3>
          <CardLabel defaultCardLast4={defaultCardLast4} />
        </div>
        <span
          className="gh-portal-list-action -mx-1 my-0 flex min-h-[38px] select-none items-center justify-center whitespace-nowrap px-1 py-0 text-base font-medium leading-[1em] tracking-[0.2px] text-brand"
          data-test-button="manage-billing"
          aria-hidden="true"
        >
          {label}
        </span>
      </section>
    );
  };

  const subscription = getMemberSubscription({ member });
  const isComplimentary = isComplimentaryMember({ member });
  const isGift = isGiftMember({ member });
  const isPaid = isPaidMember({ member });
  if (subscription || isComplimentary) {
    const { price, default_payment_card_last4: defaultCardLast4 } = subscription || {};
    let planLabel = t('Plan');

    // Show the tier name if the member has one
    if (getMemberTierName({ member })) {
      planLabel = getMemberTierName({ member });
    }
    // const hasFreeTrial = subscriptionHasFreeTrial({sub: subscription});
    // if (hasFreeTrial) {
    //     planLabel += ' (Free Trial)';
    // }
    return (
      <>
        <section>
          <div className="gh-portal-list-detail grow [&_h3]:text-base [&_h3]:font-semibold [&_p]:mb-0 [&_p]:me-2 [&_p]:ms-0 [&_p]:mt-[5px] [&_p]:text-[1.45rem] [&_p]:leading-[1.3em] [&_p]:tracking-[0.3px] [&_p]:text-gray-700 [&_p]:[word-break:break-word]">
            <h3>
              {planLabel}
              {subscription?.cancel_at_period_end && (
                <span className="gh-portal-canceled-badge relative -top-px ms-1.5 inline-block rounded-[32px] bg-[color:color-mix(in_srgb,theme(colors.gray.200)_60%,transparent)] px-2 py-1.5 align-middle text-[1.1rem] font-semibold uppercase leading-[1em] tracking-[0.05px] text-gray-700">
                  {t('Canceled')}
                </span>
              )}
            </h3>
            <PlanLabel
              price={price}
              isComplimentary={isComplimentary}
              subscription={subscription}
            />
          </div>
          <PlanUpdateButton isPaid={isPaid} />
        </section>
        {!isComplimentary && !isGift && <BillingSection defaultCardLast4={defaultCardLast4} />}
      </>
    );
  }
  return null;
};

function FreeTrialLabel({ subscription }) {
  if (subscriptionHasFreeTrial({ sub: subscription })) {
    const trialEnd = getDateString(subscription.trial_end_at);
    return (
      <p className="gh-portal-account-discountcontainer relative flex flex-wrap items-center">
        <div>
          <span>{t('Free Trial – Ends {trialEnd}', { trialEnd })}</span>
          {/* <span>{getSubFreeTrialDaysLeft({sub: subscription})} days left</span> */}
        </div>
      </p>
    );
  }
  return null;
}

/**
 * Display discounted price if an offer is active
 *
 * Examples:
 * - "$10.00/month — Forever" (forever offer)
 * - "$10.00/month — Ends 2026-01-01" (once or repeating offer)
 *
 * @param {Object} nextPayment
 * @param {number} nextPayment.originalAmount - Original amount
 * @param {number} nextPayment.amount - Amount after discount. Same as original amount if no discount.
 * @param {string} nextPayment.currency - Currency (e.g. USD, EUR)
 * @param {'month'|'year'} nextPayment.interval
 * @param {Object|null} nextPayment.discount
 * @param {'once'|'repeating'|'forever'} nextPayment.discount.duration
 * @param {number|null} nextPayment.discount.duration_in_months - Discount duration in months for "repeating" offers
 * @param {string} nextPayment.discount.start - Discount start date (ISO 8601 date string)
 * @param {string|null} nextPayment.discount.end - Discount end date (ISO 8601 date string), null for forever offers
 * @param {'fixed'|'percent'} nextPayment.discount.type
 * @param {number} nextPayment.discount.amount - Discount amount (e.g. 20 for 20% percent offer, or 2 for $2 fixed offer)
 *
 * @returns {string}
 */
function getOfferLabel({ nextPayment }) {
  if (!nextPayment) {
    return '';
  }

  const discount = nextPayment.discount;

  // No active discount
  if (!discount) {
    return '';
  }

  const durationLabel = discount.end
    ? t('Ends {offerEndDate}', { offerEndDate: getDateString(discount.end) })
    : t('Forever');

  const formattedPrice = Intl.NumberFormat('en', {
    currency: nextPayment.currency,
    style: 'currency',
  }).format(nextPayment.amount / 100);

  // Possible values for nextPayment.interval for i18n parser:
  // t('month')
  // t('year')
  const displayedPrice = `${formattedPrice}/${t(nextPayment.interval)}`;

  return `${displayedPrice}${durationLabel ? ` — ${durationLabel}` : ''}`;
}

export default PaidAccountActions;
