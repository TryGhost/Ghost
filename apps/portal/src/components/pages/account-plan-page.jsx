import React, { useContext, useState } from 'react';
import AppContext from '../../app-context';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import BackButton from '../common/back-button';
import SignupGiftPromotion from '../common/signup-gift-promotion';
import { MultipleProductsPlansSection } from '../common/plans-section';
import { getDateString } from '../../utils/date-time';
import {
  addMonths,
  formatNumber,
  formatPrice,
  getAvailablePrices,
  getCurrencySymbol,
  getFilteredPrices,
  isArchivedTier,
  isFreeMonthsOffer,
  getMemberActivePrice,
  getMemberActiveProduct,
  getMemberSubscription,
  getOfferOffAmount,
  getPriceFromSubscription,
  getProductFromPrice,
  getSubscriptionFromId,
  getUpdatedOfferPrice,
  getUpgradeProducts,
  isComplimentaryMember,
  isGiftMember,
  isPaidMember,
} from '../../utils/helpers';
import Interpolate from '@doist/react-interpolate';
import { t } from '../../utils/i18n';
import { translateCadence } from '../../utils/helpers';

const offerBarClass = String.raw`gh-portal-offer-bar relative mb-6 rounded-md bg-white bg-[url("data:image/svg+xml,%3csvg\000020width='100%25'\000020height='99.9%25'\000020xmlns='http://www.w3.org/2000/svg'%3e%3crect\000020width='100%25'\000020height='100%25'\000020fill='none'\000020stroke='%23C3C3C3'\000020stroke-width='3'\000020stroke-dasharray='3%2c\0000209'\000020stroke-dashoffset='0'\000020stroke-linecap='square'/%3e%3c/svg%3e")] px-7 pb-7 pt-[26px]`;

const offerDiscountLabelClass =
  "gh-portal-discount-label absolute right-[25px] top-[23px] -me-1 max-h-[24.5px] whitespace-nowrap rounded-[999px] px-[9px] py-1.5 text-center text-[1.25rem] font-semibold leading-[1em] tracking-[0.3px] text-grey-0 before:absolute before:inset-0 before:block before:rounded-[999px] before:bg-brand before:opacity-20 before:content-['']";

const listSectionClass =
  'flex items-center p-5 [border-bottom:1px_solid_var(--grey12)] first-of-type:rounded-t-lg last-of-type:rounded-b-lg last-of-type:[border:none]';

const listDetailTextClass =
  'mb-0 mr-2 mt-[5px] text-[1.45rem] leading-[1.3em] tracking-[0.3px] text-grey-6 [word-break:break-word] rtl:ml-2 rtl:mr-0';

const accountPlansMainClass = 'gh-portal-section gh-portal-accountplans-main mb-0 mt-6';

function getConfirmationPageTitle({ confirmationType, pendingOffer }) {
  if (confirmationType === 'changePlan') {
    return t('Confirm subscription');
  } else if (confirmationType === 'cancel') {
    return t('Cancel subscription');
  } else if (confirmationType === 'subscribe') {
    return t('Subscribe');
  } else if (confirmationType === 'offerRetention') {
    return pendingOffer?.display_title || t('Before you go');
  }
}

const Header = ({ showConfirmation, confirmationType, pendingOffer }) => {
  const { member } = useContext(AppContext);
  let title = isPaidMember({ member }) ? t('Change plan') : t('Choose a plan');
  if (showConfirmation) {
    title = getConfirmationPageTitle({ confirmationType, pendingOffer });
  }
  return (
    <header className="gh-portal-detail-header relative -mt-0.5 mb-10 flex items-center justify-center px-[60px] max-sm:mt-1">
      <h3 className="gh-portal-main-title text-pretty text-center leading-[1.1em] text-grey-0 group-[.account-plan.full-size]/popup:mt-11 group-[.account-plan.full-size]/popup:text-4xl">
        {title}
      </h3>
    </header>
  );
};

const CancelSubscriptionButton = ({ member, onCancelSubscription, action, brandColor }) => {
  if (!member.paid) {
    return null;
  }
  if (isGiftMember({ member })) {
    return null;
  }
  const subscription = getMemberSubscription({ member });
  if (!subscription) {
    return null;
  }

  // Hide the button if subscription is due cancellation
  if (subscription.cancel_at_period_end) {
    return null;
  }
  const label = t('Cancel subscription');
  const isRunning = ['cancelSubscription:running'].includes(action);
  const disabled = isRunning ? true : false;
  const isPrimary = !!subscription.cancel_at_period_end;
  const isDestructive = !subscription.cancelAtPeriodEnd;

  return (
    <div className="gh-portal-expire-container mt-8">
      <ActionButton
        dataTestId={'cancel-subscription'}
        onClick={() => {
          onCancelSubscription({
            subscriptionId: subscription.id,
            cancelAtPeriodEnd: true,
          });
        }}
        isRunning={isRunning}
        disabled={disabled}
        isPrimary={isPrimary}
        isDestructive={isDestructive}
        classes="gh-portal-btn-text mb-4 mt-2"
        brandColor={brandColor}
        label={label}
        style={{
          width: '100%',
        }}
      />
    </div>
  );
};

// For confirmation flows
const PlanConfirmationSection = ({ plan, type, onConfirm }) => {
  const { site, action, member, brandColor } = useContext(AppContext);
  const [reason, setReason] = useState('');
  const subscription = getMemberSubscription({ member });
  const isRunning = [
    'updateSubscription:running',
    'checkoutPlan:running',
    'cancelSubscription:running',
  ].includes(action);
  const label = t('Confirm');
  const planStartDate = getDateString(subscription.current_period_end);
  const currentActivePlan = getMemberActivePrice({ member });
  let planStartingMessage = t('Starting {startDate}', { startDate: planStartDate });
  if (currentActivePlan.id !== plan.id) {
    planStartingMessage = t('Starting today');
  }
  const priceString = formatNumber(plan.price);
  const planStartMessage = `${plan.currency_symbol}${priceString}/${translateCadence(plan.interval)} – ${planStartingMessage}`;
  const product = getProductFromPrice({ site, priceId: plan?.id });
  const priceLabel = product?.name;
  if (type === 'changePlan') {
    return (
      <div className="gh-portal-logged-out-form-container mx-auto w-full max-w-[420px]">
        <div className="gh-portal-list mb-6 overflow-hidden rounded-lg border border-solid border-grey-12 bg-white p-0">
          <section className={listSectionClass}>
            <div className="gh-portal-list-detail grow">
              <h3 className="text-base font-semibold">{t('Account')}</h3>
              <p className={listDetailTextClass}>{member.email}</p>
            </div>
          </section>
          <section className={listSectionClass}>
            <div className="gh-portal-list-detail grow">
              <h3 className="text-base font-semibold">{priceLabel}</h3>
              <p className={listDetailTextClass}>{planStartMessage}</p>
            </div>
          </section>
        </div>
        <ActionButton
          dataTestId={'confirm-action'}
          onClick={(e) => onConfirm(e, plan)}
          isRunning={isRunning}
          isPrimary={true}
          brandColor={brandColor}
          label={label}
          style={{
            width: '100%',
            height: '40px',
          }}
        />
      </div>
    );
  } else {
    return (
      <div className="gh-portal-logged-out-form-container gh-portal-cancellation-form mx-auto w-full max-w-[420px]">
        <p className="mb-3">
          <Interpolate
            string={t(
              `If you cancel your subscription now, you will continue to have access until {periodEnd}.`,
            )}
            mapping={{
              periodEnd: <strong>{getDateString(subscription.current_period_end)}</strong>,
            }}
          />
        </p>
        <section className="gh-portal-input-section mb-5">
          <div className="gh-portal-input-labelcontainer flex w-full justify-between">
            <label className="gh-portal-input-label mb-0.5 text-sm font-semibold tracking-[0px] text-grey-1">
              {t('Cancellation reason')}
            </label>
          </div>
          <textarea
            data-test-input="cancellation-reason"
            className="gh-portal-input mb-4 box-border block h-[62px] w-full resize-none appearance-none rounded-md border border-solid border-grey-11 bg-transparent px-3 py-1.5 text-base tracking-[0.2px] [-webkit-appearance:none] [color:inherit] [outline:none] [transition:border-color_0.25s_ease-in-out] placeholder:text-grey-8 focus:border-grey-8"
            key="cancellation_reason"
            label="Cancellation reason"
            type="text"
            name="cancellation_reason"
            placeholder=""
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows="2"
            maxLength="500"
          />
        </section>
        <ActionButton
          dataTestId={'confirm-cancel-subscription'}
          onClick={(e) => onConfirm(e, reason)}
          isRunning={isRunning}
          isPrimary={true}
          brandColor={brandColor}
          label={t('Confirm cancellation')}
          style={{
            width: '100%',
            height: '40px',
          }}
        />
      </div>
    );
  }
};

// For paid members
const ChangePlanSection = ({ plans, selectedPlan, onPlanSelect, onCancelSubscription }) => {
  const { member, action, brandColor } = useContext(AppContext);
  return (
    <section>
      <div className={accountPlansMainClass}>
        <PlansOrProductSection
          showLabel={false}
          plans={plans}
          selectedPlan={selectedPlan}
          onPlanSelect={onPlanSelect}
          changePlan={true}
        />
      </div>
      <CancelSubscriptionButton {...{ member, onCancelSubscription, action, brandColor }} />
    </section>
  );
};

function PlansOrProductSection({ selectedPlan, onPlanSelect, onPlanCheckout, changePlan = false }) {
  const { site, member } = useContext(AppContext);
  const products = getUpgradeProducts({ site, member });
  const isComplimentary = isComplimentaryMember({ member });
  const activeProduct = getMemberActiveProduct({ member, site });
  return (
    <MultipleProductsPlansSection
      products={
        products.length > 0 || isComplimentary || !activeProduct ? products : [activeProduct]
      }
      selectedPlan={selectedPlan}
      changePlan={changePlan}
      onPlanSelect={onPlanSelect}
      onPlanCheckout={onPlanCheckout}
    />
  );
}

function getRetentionOfferLabel(offer, amountOff) {
  if (isFreeMonthsOffer(offer)) {
    const months = offer.duration_in_months;
    if (months === 1) {
      return t('1 month free');
    }
    return t('{months} months free', { months });
  }

  return t('{amount} off', { amount: amountOff });
}

function getRetentionOfferMessage(offer, originalPrice, currency, amountOff, subscription) {
  if (isFreeMonthsOffer(offer)) {
    const months = offer.duration_in_months;
    const nextPaymentDate = addMonths(subscription.current_period_end, months);
    const nextPaymentDateFormatted = nextPaymentDate
      ? nextPaymentDate.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        })
      : null;

    if (nextPaymentDateFormatted) {
      if (months === 1) {
        return t("Enjoy a free month on us. You won't be charged until {newBillingDate}.", {
          newBillingDate: nextPaymentDateFormatted,
        });
      }
      return t("Enjoy {months} free months on us. You won't be charged until {newBillingDate}.", {
        months,
        newBillingDate: nextPaymentDateFormatted,
      });
    }

    if (months === 1) {
      return t('Enjoy a free month on us.');
    }
    return t('Enjoy {months} free months on us.', { months });
  }

  if (offer.duration === 'forever') {
    return t('Enjoy {amountOff} off forever.', { amountOff });
  }

  if (offer.duration === 'once') {
    return t(
      'Save {amountOff} on your next billing cycle. Then {currency}{originalPrice}/{cadence}.',
      { amountOff, currency, originalPrice, cadence: translateCadence(offer.cadence) },
    );
  }

  if (offer.duration === 'repeating' && offer.duration_in_months === 1) {
    return t(
      'Save {amountOff} on your next billing cycle. Then {currency}{originalPrice}/{cadence}.',
      { amountOff, currency, originalPrice, cadence: translateCadence(offer.cadence) },
    );
  }

  if (offer.duration === 'repeating' && offer.duration_in_months > 1) {
    return t(
      'Save {amountOff} on your next {durationInMonths} billing cycles. Then {currency}{originalPrice}/{cadence}.',
      {
        amountOff,
        durationInMonths: offer.duration_in_months,
        currency,
        originalPrice,
        cadence: translateCadence(offer.cadence),
      },
    );
  }

  return '';
}

const RetentionOfferSection = ({ subscription, offer, onAcceptOffer, onDeclineOffer }) => {
  const { brandColor, action } = useContext(AppContext);
  const isAcceptingOffer = action === 'applyOffer:running';

  const price = getPriceFromSubscription({ subscription });
  const originalAmount = price.amount / 100;
  const originalPrice = formatPrice(originalAmount);
  const currency = getCurrencySymbol(price.currency);
  const updatedAmount = getUpdatedOfferPrice({ offer, price });
  const discountedPrice = formatPrice(updatedAmount);
  const amountOff = getOfferOffAmount({ offer });

  const cadenceLabel = offer.cadence === 'month' ? t('Monthly') : t('Yearly');

  let productCadenceLabel = cadenceLabel;
  const tier = subscription.tier;
  if (tier && tier.name) {
    productCadenceLabel = `${tier.name} - ${cadenceLabel}`;
  }

  const displayDescription =
    offer.display_description ||
    t("We'd hate to see you leave. How about a special offer to stay?");

  const offerLabel = getRetentionOfferLabel(offer, amountOff);
  const offerMessage = getRetentionOfferMessage(
    offer,
    originalPrice,
    currency,
    amountOff,
    subscription,
  );

  return (
    <div className="gh-portal-logged-out-form-container gh-portal-offer gh-portal-retention-offer mx-auto !-mt-6 w-full max-w-[420px]">
      <p className="gh-portal-text-center mx-auto max-w-[400px] text-pretty text-center">
        {displayDescription}
      </p>

      <div className={offerBarClass}>
        <div className="gh-portal-offer-title flex items-center justify-between">
          <h4 className="mr-[110px] w-full text-xl rtl:ml-[110px] rtl:mr-0">
            {productCadenceLabel}
          </h4>
          <h5 className={offerDiscountLabelClass}>{offerLabel}</h5>
        </div>

        <div className="gh-portal-offer-details">
          {!isFreeMonthsOffer(offer) && (
            <div className="gh-portal-retention-offer-price mt-4 flex items-center gap-[6px]">
              <div className="gh-portal-product-price flex justify-center text-grey-0">
                <span className="currency-sign self-start text-[2.7rem] font-bold leading-[1.135em] max-[370px]:text-xl">
                  {currency}
                </span>
                <span className="amount text-[3.5rem] font-bold leading-[1em] tracking-[-1.3px] text-grey-0 max-[1440px]:text-[32px] max-[1440px]:tracking-[-0.022em]">
                  {discountedPrice}
                </span>
              </div>
              <div className="gh-portal-offer-oldprice relative mb-0 mt-1 flex whitespace-nowrap text-xl font-light leading-none text-grey-8 after:absolute after:inset-x-0 after:top-1/2 after:block after:h-px after:bg-grey-8 after:content-['']">
                {currency}
                {originalPrice}
              </div>
            </div>
          )}
          <p className="footnote mb-0 mt-1 text-[1.35rem] text-grey-8 first:mt-3">{offerMessage}</p>
        </div>

        <ActionButton
          dataTestId={'accept-retention-offer'}
          onClick={onAcceptOffer}
          isRunning={isAcceptingOffer}
          disabled={isAcceptingOffer}
          isPrimary={true}
          brandColor={brandColor}
          label={t('Continue subscription')}
          style={{
            width: '100%',
            height: '40px',
            marginTop: '20px',
          }}
        />
      </div>

      <ActionButton
        dataTestId={'decline-retention-offer'}
        onClick={onDeclineOffer}
        isPrimary={false}
        isDestructive={true}
        classes={'gh-portal-btn-text'}
        brandColor={brandColor}
        label={t('No thanks, I want to cancel')}
        style={{
          width: '100%',
          marginTop: '32px',
          marginBottom: '24px',
        }}
      />
    </div>
  );
};

// For free members
const UpgradePlanSection = ({ plans, selectedPlan, onPlanSelect, onPlanCheckout }) => {
  const { member } = useContext(AppContext);
  // const {action, brandColor} = useContext(AppContext);
  // const isRunning = ['checkoutPlan:running'].includes(action);
  let singlePlanClass = '';
  if (plans.length === 1) {
    singlePlanClass = 'singleplan';
  }
  return (
    <section>
      <div className={`${accountPlansMainClass} ${singlePlanClass}`}>
        <PlansOrProductSection
          showLabel={false}
          plans={plans}
          selectedPlan={selectedPlan}
          onPlanSelect={onPlanSelect}
          onPlanCheckout={onPlanCheckout}
        />
      </div>
      {!isPaidMember({ member }) && (
        <SignupGiftPromotion
          className="gh-portal-signup-message z-[9999] mt-1 flex flex-wrap justify-center text-base text-grey-4 group-[.full-size]/popup:mb-10 group-[.full-size]/popup:mt-6 [&_*]:z-[9999]"
          lastPage="accountPlan"
        />
      )}
      {/* <ActionButton
                onClick={e => onPlanCheckout(e)}
                isRunning={isRunning}
                isPrimary={true}
                brandColor={brandColor}
                label={'Continue'}
                style={{height: '40px', width: '100%', marginTop: '24px'}}
            /> */}
    </section>
  );
};

// Shown when there are no paid plans to display (e.g. a member reaches the
// plans page via a theme button or deep link while the site has no paid tiers).
const NoPlansAvailableMessage = () => {
  return (
    <section>
      <div className="gh-portal-section mb-10">
        <p
          className="gh-portal-no-plans-available-notification mx-8 mb-6 mt-2 text-center text-grey-2"
          data-testid="no-plans-available-notification-text"
        >
          {t('Sorry, no paid plans are available.')}
        </p>
      </div>
    </section>
  );
};

const PlansContainer = ({
  plans,
  selectedPlan,
  confirmationPlan,
  confirmationType,
  showConfirmation = false,
  pendingOffer,
  onPlanSelect,
  onPlanCheckout,
  onConfirm,
  onCancelSubscription,
  onAcceptRetentionOffer,
  onDeclineRetentionOffer,
}) => {
  const { member } = useContext(AppContext);
  // Plan upgrade flow for free, complimentary, or gift members.
  if (!isPaidMember({ member }) || isComplimentaryMember({ member }) || isGiftMember({ member })) {
    // No paid plans to choose from. This covers the deep-link / theme-button
    // entry point (#/portal/account/plans), which cannot be gated in-app,
    // where the body would otherwise render blank under the page header.
    if (plans.length === 0) {
      return <NoPlansAvailableMessage />;
    }
    return <UpgradePlanSection {...{ plans, selectedPlan, onPlanSelect, onPlanCheckout }} />;
  }

  // Plan change flow for a paid member
  if (!showConfirmation) {
    return <ChangePlanSection {...{ plans, selectedPlan, onCancelSubscription, onPlanSelect }} />;
  }

  // Retention offer flow - shown before cancellation confirmation
  if (confirmationType === 'offerRetention' && pendingOffer) {
    const subscription = getMemberSubscription({ member });

    if (subscription) {
      return (
        <RetentionOfferSection
          subscription={subscription}
          offer={pendingOffer}
          onAcceptOffer={onAcceptRetentionOffer}
          onDeclineOffer={onDeclineRetentionOffer}
        />
      );
    }
  }

  // Plan confirmation flow for cancel/update flows
  return (
    <PlanConfirmationSection {...{ plan: confirmationPlan, type: confirmationType, onConfirm }} />
  );
};

export default class AccountPlanPage extends React.Component {
  static contextType = AppContext;

  constructor(props, context) {
    super(props, context);
    this.state = this.getInitialState();
  }

  componentDidMount() {
    const { member, site } = this.context;
    if (!member) {
      this.context.doAction('switchPage', {
        page: 'signin',
      });
      return;
    }

    // Gift members on an active tier can only continue on the same tier via AccountHomePage "Continue" button
    // Redirect them home if they land here via deep link (#/portal/account/plans)
    if (isGiftMember({ member }) && !isArchivedTier({ member, site })) {
      this.context.doAction('switchPage', {
        page: 'accountHome',
      });
      return;
    }

    this.handleCancelActionFromPageData();
  }

  componentDidUpdate() {
    this.handleCancelActionFromPageData();
  }

  componentWillUnmount() {
    clearTimeout(this.timeoutId);
  }

  getRetentionOfferSignature(offer) {
    if (!offer) {
      return '';
    }

    return [
      offer.id,
      offer.display_title || '',
      offer.display_description || '',
      offer.type || '',
      offer.cadence || '',
      offer.amount || 0,
      offer.duration || '',
      offer.duration_in_months || 0,
      offer.currency || '',
      offer.status || '',
      offer.tier?.id || '',
    ].join('|');
  }

  handleCancelActionFromPageData() {
    const { member, pageData, offers } = this.context;

    if (!member || pageData?.action !== 'cancel' || !pageData?.subscriptionId) {
      return;
    }

    const nextRetentionOffer =
      (offers || []).find((offer) => offer.redemption_type === 'retention') || null;
    const nextRetentionOfferSignature = this.getRetentionOfferSignature(nextRetentionOffer);
    const currentRetentionOfferSignature = this.getRetentionOfferSignature(this.state.pendingOffer);

    const shouldRefreshRetentionFlow =
      this.state.targetSubscriptionId !== pageData.subscriptionId ||
      this.state.confirmationType !== 'offerRetention' ||
      nextRetentionOfferSignature !== currentRetentionOfferSignature;

    if (shouldRefreshRetentionFlow) {
      this.onCancelSubscription({ subscriptionId: pageData.subscriptionId });
    }

    // Clear action so normal navigation doesn't continuously re-trigger
    pageData.action = null;
  }

  getInitialState() {
    const { member, site } = this.context;

    this.prices = getAvailablePrices({ site });
    const activePrice = getMemberActivePrice({ member });

    // Only filter by currency for real Stripe subscriptions. Synthetic
    // complimentary/gift subscriptions have an empty price_id and a
    // hardcoded USD currency, which would wrongly filter out all plans
    // on non-USD sites (matches the `activePrice?.id` guard in
    // getUpgradeProducts).
    if (activePrice?.id) {
      this.prices = getFilteredPrices({ prices: this.prices, currency: activePrice.currency });
    }

    let selectedPrice = activePrice
      ? this.prices.find((d) => {
          return d.id === activePrice.id;
        })
      : null;

    // Select first plan as default for free member
    if (!isPaidMember({ member }) && this.prices.length > 0) {
      selectedPrice = this.prices[0];
    }
    const selectedPriceId = selectedPrice ? selectedPrice.id : null;
    return {
      selectedPlan: selectedPriceId,
      pendingOffer: null,
      targetSubscriptionId: null,
    };
  }

  handleSignout(e) {
    e.preventDefault();
    this.context.doAction('signout');
  }

  onBack() {
    if (this.state.showConfirmation) {
      this.cancelConfirmPage();
    } else if (this.context.lastPage === 'accountPlan') {
      // Returning from gift checkout leaves lastPage pointing back to this page.
      this.context.doAction('switchPage', { page: 'accountHome' });
    } else {
      this.context.doAction('back');
    }
  }

  cancelConfirmPage() {
    this.setState({
      showConfirmation: false,
      confirmationPlan: null,
      confirmationType: null,
      pendingOffer: null,
      targetSubscriptionId: null,
    });
  }

  onPlanCheckout(e, priceId) {
    const { doAction, member } = this.context;
    let { confirmationPlan, selectedPlan } = this.state;
    if (priceId) {
      selectedPlan = priceId;
    }

    if (
      isPaidMember({ member }) &&
      !isComplimentaryMember({ member }) &&
      !isGiftMember({ member })
    ) {
      const subscription = getMemberSubscription({ member });
      const subscriptionId = subscription ? subscription.id : '';
      if (subscriptionId) {
        doAction('updateSubscription', {
          plan: confirmationPlan.name,
          planId: confirmationPlan.id,
          subscriptionId,
          cancelAtPeriodEnd: false,
        });
      }
    } else {
      doAction('checkoutPlan', { plan: selectedPlan });
    }
  }

  onPlanSelect = (e, priceId) => {
    e?.preventDefault();

    const { member } = this.context;

    // Work as checkboxes for free, complimentary, and gift members and as button for paid Stripe members.
    if (
      !isPaidMember({ member }) ||
      isComplimentaryMember({ member }) ||
      isGiftMember({ member })
    ) {
      // Hack: React checkbox gets out of sync with dom state with instant update
      this.timeoutId = setTimeout(() => {
        this.setState(() => {
          return {
            selectedPlan: priceId,
          };
        });
      }, 5);
    } else {
      const confirmationPrice = this.prices.find((d) => d.id === priceId);
      const activePlan = this.getActivePriceId({ member });
      const confirmationType = activePlan ? 'changePlan' : 'subscribe';
      if (priceId !== this.state.selectedPlan) {
        this.setState({
          confirmationPlan: confirmationPrice,
          confirmationType,
          showConfirmation: true,
        });
      }
    }
  };

  onCancelSubscription({ subscriptionId }) {
    const { member, offers } = this.context;
    const subscription = getSubscriptionFromId({ subscriptionId, member });
    if (!subscription) {
      return;
    }
    const subscriptionPlan = getPriceFromSubscription({ subscription });
    const retentionOffers = (offers || []).filter((o) => o.redemption_type === 'retention');

    if (retentionOffers.length > 0) {
      // Show retention offer instead of going straight to cancellation
      this.setState({
        showConfirmation: true,
        confirmationPlan: subscriptionPlan,
        confirmationType: 'offerRetention',
        pendingOffer: retentionOffers[0], // Show first available offer
        targetSubscriptionId: subscriptionId,
      });
    } else {
      // No retention offers, go straight to cancellation
      this.setState({
        showConfirmation: true,
        confirmationPlan: subscriptionPlan,
        confirmationType: 'cancel',
        pendingOffer: null,
        targetSubscriptionId: subscriptionId,
      });
    }
  }

  onAcceptRetentionOffer() {
    const { pendingOffer, targetSubscriptionId } = this.state;

    if (!targetSubscriptionId || !pendingOffer) {
      return;
    }

    this.context.doAction('applyOffer', {
      subscriptionId: targetSubscriptionId,
      offerId: pendingOffer.id,
    });
  }

  onDeclineRetentionOffer() {
    // User declined the offer, proceed to cancellation confirmation
    this.setState({
      confirmationType: 'cancel',
      pendingOffer: null,
    });
  }

  onCancelSubscriptionConfirmation(reason) {
    const { targetSubscriptionId } = this.state;
    if (!targetSubscriptionId) {
      return null;
    }
    this.context.doAction('cancelSubscription', {
      subscriptionId: targetSubscriptionId,
      cancelAtPeriodEnd: true,
      cancellationReason: reason,
    });
  }

  getActivePriceId({ member }) {
    const activePrice = getMemberActivePrice({ member });
    if (activePrice) {
      return activePrice.id;
    }
    return null;
  }

  onConfirm(e, data) {
    const { confirmationType } = this.state;
    if (confirmationType === 'cancel') {
      return this.onCancelSubscriptionConfirmation(data);
    } else if (['changePlan', 'subscribe'].includes(confirmationType)) {
      return this.onPlanCheckout();
    }
  }

  render() {
    const plans = this.prices;
    const { selectedPlan, showConfirmation, confirmationPlan, confirmationType, pendingOffer } =
      this.state;
    const { lastPage } = this.context;
    return (
      <>
        <div className="gh-portal-content relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <BackButton onClick={(e) => this.onBack(e)} hidden={!lastPage && !showConfirmation} />
          <CloseButton />
          <Header
            onBack={(e) => this.onBack(e)}
            confirmationType={confirmationType}
            pendingOffer={pendingOffer}
            showConfirmation={showConfirmation}
          />
          <PlansContainer
            {...{
              plans,
              selectedPlan,
              showConfirmation,
              confirmationPlan,
              confirmationType,
              pendingOffer,
            }}
            onConfirm={(...args) => this.onConfirm(...args)}
            onCancelSubscription={(data) => this.onCancelSubscription(data)}
            onAcceptRetentionOffer={() => this.onAcceptRetentionOffer()}
            onDeclineRetentionOffer={() => this.onDeclineRetentionOffer()}
            onPlanSelect={this.onPlanSelect}
            onPlanCheckout={(e, name) => this.onPlanCheckout(e, name)}
          />
        </div>
      </>
    );
  }
}
