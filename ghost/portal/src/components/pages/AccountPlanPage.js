import {useContext, useState} from 'react';
import AppContext from '../../AppContext';
import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
import BackButton from '../common/BackButton';
import PlansSection, {MultipleProductsPlansSection, SingleProductPlansSection} from '../common/PlansSection';
import {getDateString} from '../../utils/date-time';
import {formatNumber, getAvailablePrices, getFilteredPrices, getMemberActivePrice, getMemberSubscription, getPriceFromSubscription, getProductFromPrice, getSubscriptionFromId, getUpgradeProducts, hasMultipleProducts, hasMultipleProductsFeature, isPaidMember} from '../../utils/helpers';

export const AccountPlanPageStyles = `
    .gh-portal-accountplans-main {
        margin-top: 24px;
        margin-bottom: 0;
    }

    .gh-portal-expire-container {
        margin: 24px 0 0;
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
`;

const React = require('react');

function getConfirmationPageTitle({confirmationType}) {
    if (confirmationType === 'changePlan') {
        return 'Confirm subscription';
    } else if (confirmationType === 'cancel') {
        return 'Cancel subscription';
    } else if (confirmationType === 'subscribe') {
        return 'Subscribe';
    }
}

const Header = ({onBack, showConfirmation, confirmationType}) => {
    const {member, brandColor, lastPage} = useContext(AppContext);
    let title = isPaidMember({member}) ? 'Change plan' : 'Choose a plan';
    if (showConfirmation) {
        title = getConfirmationPageTitle({confirmationType});
    }
    return (
        <header className='gh-portal-detail-header'>
            <BackButton brandColor={brandColor} onClick={e => onBack(e)} hidden={!lastPage && !showConfirmation} />
            <h3 className='gh-portal-main-title'>{title}</h3>
        </header>
    );
};

const CancelSubscriptionButton = ({member, onCancelSubscription, action, brandColor}) => {
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
    const label = 'Cancel subscription';
    const isRunning = ['cancelSubscription:running'].includes(action);
    const disabled = (isRunning) ? true : false;
    const isPrimary = !!subscription.cancel_at_period_end;
    const isDestructive = !subscription.cancelAtPeriodEnd;

    return (
        <div className="gh-portal-expire-container">
            <ActionButton
                onClick={(e) => {
                    onCancelSubscription({
                        subscriptionId: subscription.id,
                        cancelAtPeriodEnd: true
                    });
                }}
                isRunning={isRunning}
                disabled={disabled}
                isPrimary={isPrimary}
                isDestructive={isDestructive}
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
    const label = 'Confirm';
    let planStartDate = getDateString(subscription.current_period_end);
    const currentActivePlan = getMemberActivePrice({member});
    if (currentActivePlan.id !== plan.id) {
        planStartDate = 'today';
    }
    const priceString = formatNumber(plan.price);
    const planStartMessage = `${plan.currency_symbol}${priceString}/${plan.interval} – Starting ${planStartDate}`;
    const product = getProductFromPrice({site, priceId: plan?.id});
    const priceLabel = hasMultipleProductsFeature({site}) ? product.name : 'Price';
    if (type === 'changePlan') {
        return (
            <>
                <div className='gh-portal-list outline mb6'>
                    <section>
                        <div className='gh-portal-list-detail'>
                            <h3>Account</h3>
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
            </>
        );
    } else {
        return (
            <div className="gh-portal-cancellation-form">
                <p>If you cancel your subscription now, you will continue to have access until <strong>{getDateString(subscription.current_period_end)}</strong>.</p>
                <section className='gh-portal-input-section'>
                    <div className='gh-portal-input-labelcontainer'>
                        <label className='gh-portal-input-label'>Cancellation reason</label>
                    </div>
                    <textarea
                        className='gh-portal-input'
                        key='cancellation_reason'
                        label='Cancellation reason'
                        type='text'
                        name='cancellation_reason'
                        placeholder=''
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows="2"
                        maxlength="500"
                    />
                </section>
                <ActionButton
                    onClick={e => onConfirm(e, reason)}
                    isRunning={isRunning}
                    isPrimary={true}
                    brandColor={brandColor}
                    label={label + ' cancellation'}
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

function PlansOrProductSection({showLabel, plans, selectedPlan, onPlanSelect, changePlan}) {
    const {site, member} = useContext(AppContext);
    const products = getUpgradeProducts({site, member});
    if (hasMultipleProductsFeature({site})) {
        if (changePlan === true) {
            return (
                <MultipleProductsPlansSection
                    products={products}
                    selectedPlan={selectedPlan}
                    changePlan={true}
                    onPlanSelect={onPlanSelect}
                />
            );
        } else if (hasMultipleProducts({site})) {
            return (
                <MultipleProductsPlansSection
                    products={products}
                    selectedPlan={selectedPlan}
                    changePlan={changePlan}
                    onPlanSelect={onPlanSelect}
                />
            );
        } else {
            return (
                <SingleProductPlansSection
                    product={products?.[0]}
                    plans={plans}
                    selectedPlan={selectedPlan}
                    onPlanSelect={onPlanSelect}
                />
            );
        }
    }
    return (
        <PlansSection
            showLabel={showLabel}
            plans={plans}
            selectedPlan={selectedPlan}
            changePlan={changePlan}
            onPlanSelect={onPlanSelect}
        />
    );
}

// For free members
const UpgradePlanSection = ({
    plans, selectedPlan, onPlanSelect, onPlanCheckout
}) => {
    const {action, brandColor} = useContext(AppContext);
    const isRunning = ['checkoutPlan:running'].includes(action);
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
                />
            </div>
            <ActionButton
                onClick={e => onPlanCheckout(e)}
                isRunning={isRunning}
                isPrimary={true}
                brandColor={brandColor}
                label={'Continue'}
                style={{height: '40px', width: '100%', marginTop: '24px'}}
            />
        </section>
    );
};

const PlansContainer = ({
    plans, selectedPlan, confirmationPlan, confirmationType, showConfirmation = false,
    onPlanSelect, onPlanCheckout, onConfirm, onCancelSubscription
}) => {
    const {member} = useContext(AppContext);
    // Plan upgrade flow for free member
    if (!isPaidMember({member})) {
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
            this.context.onAction('switchPage', {
                page: 'signup'
            });
        }
    }

    componentWillUnmount() {
        clearTimeout(this.timeoutId);
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
            selectedPlan: selectedPriceId
        };
    }

    handleSignout(e) {
        e.preventDefault();
        this.context.onAction('signout');
    }

    onBack(e) {
        if (this.state.showConfirmation) {
            this.cancelConfirmPage();
        } else {
            this.context.onAction('back');
        }
    }

    cancelConfirmPage() {
        this.setState({
            showConfirmation: false,
            confirmationPlan: null,
            confirmationType: null
        });
    }

    onPlanCheckout(e, priceId) {
        const {onAction, member} = this.context;
        const {confirmationPlan, selectedPlan} = this.state;
        if (isPaidMember({member})) {
            const subscription = getMemberSubscription({member});
            const subscriptionId = subscription ? subscription.id : '';
            if (subscriptionId) {
                onAction('updateSubscription', {plan: confirmationPlan.name, planId: confirmationPlan.id, subscriptionId, cancelAtPeriodEnd: false});
            }
        } else {
            onAction('checkoutPlan', {plan: selectedPlan});
        }
    }

    onPlanSelect = (e, priceId) => {
        e?.preventDefault();

        const {member} = this.context;

        // Work as checkboxes for free member plan selection and button for paid members
        if (!isPaidMember({member})) {
            // Hack: React checkbox gets out of sync with dom state with instant update
            this.timeoutId = setTimeout(() => {
                this.setState((state) => {
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
    }

    onCancelSubscription({subscriptionId, cancelAtPeriodEnd}) {
        const {member} = this.context;
        const subscription = getSubscriptionFromId({subscriptionId, member});
        const subscriptionPlan = getPriceFromSubscription({subscription});
        this.setState({
            showConfirmation: true,
            confirmationPlan: subscriptionPlan,
            confirmationType: 'cancel'
        });
    }

    onCancelSubscriptionConfirmation(reason) {
        const {member} = this.context;
        const subscription = getMemberSubscription({member});
        if (!subscription) {
            return null;
        }
        this.context.onAction('cancelSubscription', {
            subscriptionId: subscription.id,
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
            return this.onPlanCheckout(data);
        }
    }

    render() {
        const plans = this.prices;
        const {selectedPlan, showConfirmation, confirmationPlan, confirmationType} = this.state;
        return (
            <>
                <div className='gh-portal-content'>
                    <CloseButton />
                    <Header
                        onBack={e => this.onBack(e)}
                        confirmationType={confirmationType}
                        showConfirmation={showConfirmation}
                    />
                    <PlansContainer
                        {...{plans, selectedPlan, showConfirmation, confirmationPlan, confirmationType}}
                        onConfirm={(...args) => this.onConfirm(...args)}
                        onCancelSubscription = {data => this.onCancelSubscription(data)}
                        onPlanSelect = {this.onPlanSelect}
                        onPlanCheckout = {(e, name) => this.onPlanCheckout(e, name)}
                    />
                </div>
            </>
        );
    }
}
