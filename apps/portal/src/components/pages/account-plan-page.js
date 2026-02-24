import React, {useContext, useState} from 'react';
import AppContext from '../../app-context';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import BackButton from '../common/back-button';
import {MultipleProductsPlansSection} from '../common/plans-section';
import {getDateString} from '../../utils/date-time';
import {formatNumber, getAvailablePrices, getCurrencySymbol, getFilteredPrices, isFreeMonthsOffer, getMemberActivePrice, getMemberActiveProduct, getMemberSubscription, getOfferOffAmount, getPriceFromSubscription, getProductFromId, getProductFromPrice, getSubscriptionFromId, getUpdatedOfferPrice, getUpgradeProducts, hasMultipleProductsFeature, isComplimentaryMember, isPaidMember} from '../../utils/helpers';
import Interpolate from '@doist/react-interpolate';
import {t} from '../../utils/i18n';

export const AccountPlanPageStyles = `
    .account-plan.full-size .gh-portal-main-title {
        font-size: 3.2rem;
        margin-top: 44px;
    }

    .gh-portal-accountplans-main {
        margin-top: 24px;
        margin-bottom: 0;
    }

    .gh-portal-expire-container {
        margin: 32px 0 0;
    }

    .gh-portal-cancellation-form p {
        margin-bottom: 12px;
    }

    .gh-portal-cancellation-form .gh-portal-input-section {
        margin-bottom: 20px;
    }

    .gh-portal-cancellation-form .gh-portal-input {
        resize: none;
        width: 100%;
        height: 62px;
        padding: 6px 12px;
    }

    .gh-portal-retention-offer-price {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 20px;
    }

    .gh-portal-retention-offer-price .gh-portal-offer-oldprice {
        margin: 4px 0 0;
    }
`;

function getConfirmationPageTitle({confirmationType, pendingOffer}) {
    if (confirmationType === 'changePlan') {
        return t('Confirm subscription');
    } else if (confirmationType === 'cancel') {
        return t('Cancel subscription');
    } else if (confirmationType === 'subscribe') {
        return t('Subscribe');
    } else if (confirmationType === 'offerRetention') {
        return pendingOffer?.display_title || 'Before you go';
    }
}

const Header = ({showConfirmation, confirmationType, pendingOffer}) => {
    const {member} = useContext(AppContext);
    let title = isPaidMember({member}) ? t('Change plan') : t('Choose a plan');
    if (showConfirmation) {
        title = getConfirmationPageTitle({confirmationType, pendingOffer});
    }
    return (
        <header className='gh-portal-detail-header'>
            <h3 className='gh-portal-main-title'>{title}</h3>
        </header>
    );
};

const CancelSubscriptionButton = ({member, onCancelSubscription, action, brandColor}) => {
    const {site} = useContext(AppContext);
    if (!member.paid) {
        return null;
    }
    const subscription = getMemberSubscription({member});
    if (!subscription) {
        return null;
    }

    // Hide the button if subscription is due cancellation
    if (subscription.cancel_at_period_end) {
        return null;
    }
    const label = t('Cancel subscription');
    const isRunning = ['cancelSubscription:running'].includes(action);
    const disabled = (isRunning) ? true : false;
    const isPrimary = !!subscription.cancel_at_period_end;
    const isDestructive = !subscription.cancelAtPeriodEnd;

    return (
        <div className="gh-portal-expire-container">
            <ActionButton
                dataTestId={'cancel-subscription'}
                onClick={() => {
                    onCancelSubscription({
                        subscriptionId: subscription.id,
                        cancelAtPeriodEnd: true
                    });
                }}
                isRunning={isRunning}
                disabled={disabled}
                isPrimary={isPrimary}
                isDestructive={isDestructive}
                classes={hasMultipleProductsFeature({site}) ? 'gh-portal-btn-text mt2 mb4' : ''}
                brandColor={brandColor}
                label={label}
                style={{
                    width: '100%'
                }}
            />
        </div>
    );
};

// For confirmation flows
const PlanConfirmationSection = ({plan, type, onConfirm}) => {
    const {site, action, member, brandColor} = useContext(AppContext);
    const [reason, setReason] = useState('');
    const subscription = getMemberSubscription({member});
    const isRunning = ['updateSubscription:running', 'checkoutPlan:running', 'cancelSubscription:running'].includes(action);
    const label = t('Confirm');
    const planStartDate = getDateString(subscription.current_period_end);
    const currentActivePlan = getMemberActivePrice({member});
    let planStartingMessage = t('Starting {startDate}', {startDate: planStartDate});
    if (currentActivePlan.id !== plan.id) {
        planStartingMessage = t('Starting today');
    }
    const priceString = formatNumber(plan.price);
    const planStartMessage = `${plan.currency_symbol}${priceString}/${t(plan.interval)} – ${planStartingMessage}`;
    const product = getProductFromPrice({site, priceId: plan?.id});
    const priceLabel = hasMultipleProductsFeature({site}) ? product?.name : t('Price');
    if (type === 'changePlan') {
        return (
            <div className='gh-portal-logged-out-form-container'>
                <div className='gh-portal-list mb6'>
                    <section>
                        <div className='gh-portal-list-detail'>
                            <h3>{t('Account')}</h3>
                            <p>{member.email}</p>
                        </div>
                    </section>
                    <section>
                        <div className='gh-portal-list-detail'>
                            <h3>{priceLabel}</h3>
                            <p>{planStartMessage}</p>
                        </div>
                    </section>
                </div>
                <ActionButton
                    dataTestId={'confirm-action'}
                    onClick={e => onConfirm(e, plan)}
                    isRunning={isRunning}
                    isPrimary={true}
                    brandColor={brandColor}
                    label={label}
                    style={{
                        width: '100%',
                        height: '40px'
                    }}
                />
            </div>
        );
    } else {
        return (
            <div className="gh-portal-logged-out-form-container gh-portal-cancellation-form">
                <p>
                    <Interpolate
                        string={t(`If you cancel your subscription now, you will continue to have access until {periodEnd}.`)}
                        mapping={{
                            periodEnd: <strong>{getDateString(subscription.current_period_end)}</strong>
                        }}
                    />
                </p>
                <section className='gh-portal-input-section'>
                    <div className='gh-portal-input-labelcontainer'>
                        <label className='gh-portal-input-label'>{t('Cancellation reason')}</label>
                    </div>
                    <textarea
                        data-test-input='cancellation-reason'
                        className='gh-portal-input'
                        key='cancellation_reason'
                        label='Cancellation reason'
                        type='text'
                        name='cancellation_reason'
                        placeholder=''
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows="2"
                        maxLength="500"
                    />
                </section>
                <ActionButton
                    dataTestId={'confirm-cancel-subscription'}
                    onClick={e => onConfirm(e, reason)}
                    isRunning={isRunning}
                    isPrimary={true}
                    brandColor={brandColor}
                    label={t('Confirm cancellation')}
                    style={{
                        width: '100%',
                        height: '40px'
                    }}
                />
            </div>
        );
    }
};

// For paid members
const ChangePlanSection = ({plans, selectedPlan, onPlanSelect, onCancelSubscription}) => {
    const {member, action, brandColor} = useContext(AppContext);
    return (
        <section>
            <div className='gh-portal-section gh-portal-accountplans-main'>
                <PlansOrProductSection
                    showLabel={false}
                    plans={plans}
                    selectedPlan={selectedPlan}
                    onPlanSelect={onPlanSelect}
                    changePlan={true}
                />
            </div>
            <CancelSubscriptionButton {...{member, onCancelSubscription, action, brandColor}} />
        </section>
    );
};

function PlansOrProductSection({selectedPlan, onPlanSelect, onPlanCheckout, changePlan = false}) {
    const {site, member} = useContext(AppContext);
    const products = getUpgradeProducts({site, member});
    const isComplimentary = isComplimentaryMember({member});
    const activeProduct = getMemberActiveProduct({member, site});
    return (
        <MultipleProductsPlansSection
            products={products.length > 0 || isComplimentary || !activeProduct ? products : [activeProduct]}
            selectedPlan={selectedPlan}
            changePlan={changePlan}
            onPlanSelect={onPlanSelect}
            onPlanCheckout={onPlanCheckout}
        />
    );
}

// TODO: Add i18n once copy is finalized
function getOfferMessage(offer, originalPrice, currency, amountOff, subscription) {
    if (isFreeMonthsOffer(offer)) {
        const months = offer.duration_in_months;
        const monthLabel = months === 1 ? '1 free month' : `${months} free months`;

        if (subscription?.current_period_end) {
            const date = new Date(subscription.current_period_end);
            const originalDay = date.getUTCDate();
            let targetMonth = date.getUTCMonth() + months;
            let targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
            targetMonth = targetMonth % 12;
            const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
            const newDate = new Date(Date.UTC(targetYear, targetMonth, Math.min(originalDay, daysInTargetMonth)));
            const newBillingDate = newDate.toLocaleDateString('en-GB', {year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'});
            return `Enjoy ${monthLabel} on us. Your next billing date will be ${newBillingDate}.`;
        }

        return `Enjoy ${monthLabel} on us.`;
    }

    if (offer.duration === 'forever') {
        return `Enjoy ${amountOff} off forever.`;
    }

    if (offer.duration === 'once') {
        return `Save ${amountOff} on your next billing cycle. Then ${currency}${originalPrice}/${offer.cadence}.`;
    }

    if (offer.duration === 'repeating' && offer.duration_in_months === 1) {
        return `Save ${amountOff} on your next billing cycle. Then ${currency}${originalPrice}/${offer.cadence}.`;
    }

    if (offer.duration === 'repeating' && offer.duration_in_months > 1) {
        return `Save ${amountOff} on your next ${offer.duration_in_months} billing cycles. Then ${currency}${originalPrice}/${offer.cadence}.`;
    }

    return '';
}

// TODO: Add i18n once copy is finalized
const RetentionOfferSection = ({offer, product, price, onAcceptOffer, onDeclineOffer}) => {
    const {brandColor, action, member} = useContext(AppContext);
    const isAcceptingOffer = action === 'applyOffer:running';
    const subscription = getMemberSubscription({member});

    const originalPrice = formatNumber(price.amount / 100);
    const currency = getCurrencySymbol(price.currency);
    const discountedPrice = formatNumber(getUpdatedOfferPrice({offer, price}));
    const amountOff = getOfferOffAmount({offer});
    const discountText = isFreeMonthsOffer(offer) ? `${amountOff} free` : `${amountOff} off`;
    const cadenceLabel = offer.cadence === 'month' ? 'Monthly' : 'Yearly';
    const productCadenceLabel = `${product.name} - ${cadenceLabel}`;
    const displayDescription = offer.display_description || 'We\'d hate to see you leave. How about a special offer to stay?';

    const offerMessage = getOfferMessage(offer, originalPrice, currency, amountOff, subscription);

    // TODO: Add i18n once copy is finalized
    return (
        <div className="gh-portal-logged-out-form-container gh-portal-offer gh-portal-retention-offer">
            <p className="gh-portal-text-center">
                {displayDescription}
            </p>

            <div className="gh-portal-offer-bar">
                <div className="gh-portal-offer-title">
                    <h4>{productCadenceLabel}</h4>
                    <h5 className="gh-portal-discount-label">{discountText}</h5>
                </div>

                <div className="gh-portal-offer-details">
                    <div className="gh-portal-retention-offer-price">
                        {!isFreeMonthsOffer(offer) && (
                            <>
                                <div className="gh-portal-product-price">
                                    <span className="currency-sign">{currency}</span>
                                    <span className="amount">{discountedPrice}</span>
                                </div>
                                <div className="gh-portal-offer-oldprice">
                                    {currency}{originalPrice}
                                </div>
                            </>
                        )}
                    </div>
                    <p className="footnote">
                        {offerMessage}
                    </p>
                </div>

                {/* TODO: Add i18n once copy is finalized */}
                <ActionButton
                    dataTestId={'accept-retention-offer'}
                    onClick={onAcceptOffer}
                    isRunning={isAcceptingOffer}
                    disabled={isAcceptingOffer}
                    isPrimary={true}
                    brandColor={brandColor}
                    label="Continue subscription"
                    style={{
                        width: '100%',
                        height: '40px',
                        marginTop: '28px'
                    }}
                />
            </div>

            {/* TODO: Add i18n once copy is finalized */}
            <ActionButton
                dataTestId={'decline-retention-offer'}
                onClick={onDeclineOffer}
                isPrimary={false}
                isDestructive={true}
                classes={'gh-portal-btn-text'}
                brandColor={brandColor}
                label="No thanks, I want to cancel"
                style={{
                    width: '100%',
                    marginTop: '32px',
                    marginBottom: '24px'
                }}
            />
        </div>
    );
    /* eslint-enable i18next/no-literal-string */
};

// For free members
const UpgradePlanSection = ({
    plans, selectedPlan, onPlanSelect, onPlanCheckout
}) => {
    // const {action, brandColor} = useContext(AppContext);
    // const isRunning = ['checkoutPlan:running'].includes(action);
    let singlePlanClass = '';
    if (plans.length === 1) {
        singlePlanClass = 'singleplan';
    }
    return (
        <section>
            <div className={`gh-portal-section gh-portal-accountplans-main ${singlePlanClass}`}>
                <PlansOrProductSection
                    showLabel={false}
                    plans={plans}
                    selectedPlan={selectedPlan}
                    onPlanSelect={onPlanSelect}
                    onPlanCheckout={onPlanCheckout}
                />
            </div>
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

const PlansContainer = ({
    plans, selectedPlan, confirmationPlan, confirmationType, showConfirmation = false,
    pendingOffer, onPlanSelect, onPlanCheckout, onConfirm, onCancelSubscription,
    onAcceptRetentionOffer, onDeclineRetentionOffer
}) => {
    const {member, site} = useContext(AppContext);
    // Plan upgrade flow for free member or complimentary member
    if (!isPaidMember({member}) || isComplimentaryMember({member})) {
        return (
            <UpgradePlanSection
                {...{plans, selectedPlan, onPlanSelect, onPlanCheckout}}
            />
        );
    }

    // Plan change flow for a paid member
    if (!showConfirmation) {
        return (
            <ChangePlanSection
                {...{plans, selectedPlan,
                    onCancelSubscription, onPlanSelect}}
            />
        );
    }

    // Retention offer flow - shown before cancellation confirmation
    if (confirmationType === 'offerRetention' && pendingOffer) {
        const offerProduct = pendingOffer.tier
            ? getProductFromId({site, productId: pendingOffer.tier.id})
            : getMemberActiveProduct({member, site});
        const offerPrice = pendingOffer.cadence === 'month' ? offerProduct?.monthlyPrice : offerProduct?.yearlyPrice;

        // Skip retention offer if product or price is invalid
        if (offerProduct && offerPrice) {
            return (
                <RetentionOfferSection
                    offer={pendingOffer}
                    product={offerProduct}
                    price={offerPrice}
                    onAcceptOffer={onAcceptRetentionOffer}
                    onDeclineOffer={onDeclineRetentionOffer}
                />
            );
        }
    }

    // Plan confirmation flow for cancel/update flows
    return (
        <PlanConfirmationSection
            {...{plan: confirmationPlan, type: confirmationType, onConfirm}}
        />
    );
};

export default class AccountPlanPage extends React.Component {
    static contextType = AppContext;

    constructor(props, context) {
        super(props, context);
        this.state = this.getInitialState();
    }

    componentDidMount() {
        const {member} = this.context;
        if (!member) {
            this.context.doAction('switchPage', {
                page: 'signin'
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
            offer.tier?.id || ''
        ].join('|');
    }

    handleCancelActionFromPageData() {
        const {member, pageData, offers} = this.context;

        if (!member || pageData?.action !== 'cancel' || !pageData?.subscriptionId) {
            return;
        }

        const nextRetentionOffer = (offers || []).find(offer => offer.redemption_type === 'retention') || null;
        const nextRetentionOfferSignature = this.getRetentionOfferSignature(nextRetentionOffer);
        const currentRetentionOfferSignature = this.getRetentionOfferSignature(this.state.pendingOffer);

        const shouldRefreshRetentionFlow = this.state.targetSubscriptionId !== pageData.subscriptionId ||
            this.state.confirmationType !== 'offerRetention' ||
            nextRetentionOfferSignature !== currentRetentionOfferSignature;

        if (shouldRefreshRetentionFlow) {
            this.onCancelSubscription({subscriptionId: pageData.subscriptionId});
        }

        // Clear action so normal navigation doesn't continuously re-trigger
        pageData.action = null;
    }

    getInitialState() {
        const {member, site} = this.context;

        this.prices = getAvailablePrices({site});
        let activePrice = getMemberActivePrice({member});

        if (activePrice) {
            this.prices = getFilteredPrices({prices: this.prices, currency: activePrice.currency});
        }

        let selectedPrice = activePrice ? this.prices.find((d) => {
            return (d.id === activePrice.id);
        }) : null;

        // Select first plan as default for free member
        if (!isPaidMember({member}) && this.prices.length > 0) {
            selectedPrice = this.prices[0];
        }
        const selectedPriceId = selectedPrice ? selectedPrice.id : null;
        return {
            selectedPlan: selectedPriceId,
            pendingOffer: null,
            targetSubscriptionId: null
        };
    }

    handleSignout(e) {
        e.preventDefault();
        this.context.doAction('signout');
    }

    onBack() {
        if (this.state.showConfirmation) {
            this.cancelConfirmPage();
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
            targetSubscriptionId: null
        });
    }

    onPlanCheckout(e, priceId) {
        const {doAction, member} = this.context;
        let {confirmationPlan, selectedPlan} = this.state;
        if (priceId) {
            selectedPlan = priceId;
        }

        if (isPaidMember({member}) && !isComplimentaryMember({member})) {
            const subscription = getMemberSubscription({member});
            const subscriptionId = subscription ? subscription.id : '';
            if (subscriptionId) {
                doAction('updateSubscription', {plan: confirmationPlan.name, planId: confirmationPlan.id, subscriptionId, cancelAtPeriodEnd: false});
            }
        } else {
            doAction('checkoutPlan', {plan: selectedPlan});
        }
    }

    onPlanSelect = (e, priceId) => {
        e?.preventDefault();

        const {member} = this.context;

        // Work as checkboxes for free member plan selection and button for paid members
        if (!isPaidMember({member}) || isComplimentaryMember({member})) {
            // Hack: React checkbox gets out of sync with dom state with instant update
            this.timeoutId = setTimeout(() => {
                this.setState(() => {
                    return {
                        selectedPlan: priceId
                    };
                });
            }, 5);
        } else {
            const confirmationPrice = this.prices.find(d => d.id === priceId);
            const activePlan = this.getActivePriceId({member});
            const confirmationType = activePlan ? 'changePlan' : 'subscribe';
            if (priceId !== this.state.selectedPlan) {
                this.setState({
                    confirmationPlan: confirmationPrice,
                    confirmationType,
                    showConfirmation: true
                });
            }
        }
    };

    onCancelSubscription({subscriptionId}) {
        const {member, offers} = this.context;
        const subscription = getSubscriptionFromId({subscriptionId, member});
        if (!subscription) {
            return;
        }
        const subscriptionPlan = getPriceFromSubscription({subscription});
        const retentionOffers = (offers || []).filter(o => o.redemption_type === 'retention');

        if (retentionOffers.length > 0) {
            // Show retention offer instead of going straight to cancellation
            this.setState({
                showConfirmation: true,
                confirmationPlan: subscriptionPlan,
                confirmationType: 'offerRetention',
                pendingOffer: retentionOffers[0], // Show first available offer
                targetSubscriptionId: subscriptionId
            });
        } else {
            // No retention offers, go straight to cancellation
            this.setState({
                showConfirmation: true,
                confirmationPlan: subscriptionPlan,
                confirmationType: 'cancel',
                pendingOffer: null,
                targetSubscriptionId: subscriptionId
            });
        }
    }

    onAcceptRetentionOffer() {
        const {pendingOffer, targetSubscriptionId} = this.state;

        if (!targetSubscriptionId || !pendingOffer) {
            return;
        }

        this.context.doAction('applyOffer', {
            subscriptionId: targetSubscriptionId,
            offerId: pendingOffer.id
        });
    }

    onDeclineRetentionOffer() {
        // User declined the offer, proceed to cancellation confirmation
        this.setState({
            confirmationType: 'cancel',
            pendingOffer: null
        });
    }

    onCancelSubscriptionConfirmation(reason) {
        const {targetSubscriptionId} = this.state;
        if (!targetSubscriptionId) {
            return null;
        }
        this.context.doAction('cancelSubscription', {
            subscriptionId: targetSubscriptionId,
            cancelAtPeriodEnd: true,
            cancellationReason: reason
        });
    }

    getActivePriceId({member}) {
        const activePrice = getMemberActivePrice({member});
        if (activePrice) {
            return activePrice.id;
        }
        return null;
    }

    onConfirm(e, data) {
        const {confirmationType} = this.state;
        if (confirmationType === 'cancel') {
            return this.onCancelSubscriptionConfirmation(data);
        } else if (['changePlan', 'subscribe'].includes(confirmationType)) {
            return this.onPlanCheckout();
        }
    }

    render() {
        const plans = this.prices;
        const {selectedPlan, showConfirmation, confirmationPlan, confirmationType, pendingOffer} = this.state;
        const {lastPage} = this.context;
        return (
            <>
                <div className='gh-portal-content'>
                    <BackButton onClick={e => this.onBack(e)} hidden={!lastPage && !showConfirmation} />
                    <CloseButton />
                    <Header
                        onBack={e => this.onBack(e)}
                        confirmationType={confirmationType}
                        pendingOffer={pendingOffer}
                        showConfirmation={showConfirmation}
                    />
                    <PlansContainer
                        {...{plans, selectedPlan, showConfirmation, confirmationPlan, confirmationType, pendingOffer}}
                        onConfirm={(...args) => this.onConfirm(...args)}
                        onCancelSubscription = {data => this.onCancelSubscription(data)}
                        onAcceptRetentionOffer = {() => this.onAcceptRetentionOffer()}
                        onDeclineRetentionOffer = {() => this.onDeclineRetentionOffer()}
                        onPlanSelect = {this.onPlanSelect}
                        onPlanCheckout = {(e, name) => this.onPlanCheckout(e, name)}
                    />
                </div>
            </>
        );
    }
}
