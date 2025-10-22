import React, {useContext, useState, useEffect, useRef} from 'react';
import AppContext from '../../AppContext';
import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
import BackButton from '../common/BackButton';
import {MultipleProductsPlansSection} from '../common/PlansSection';
import {getDateString} from '../../utils/date-time';
import {allowCompMemberUpgrade, formatNumber, getAvailablePrices, getFilteredPrices, getMemberActivePrice, getMemberActiveProduct, getMemberSubscription, getPriceFromSubscription, getProductFromPrice, getSubscriptionFromId, getUpgradeProducts, hasMultipleProductsFeature, isComplimentaryMember, isPaidMember} from '../../utils/helpers';
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
`;

function getConfirmationPageTitle({confirmationType}) {
    if (confirmationType === 'changePlan') {
        return t('Confirm subscription');
    } else if (confirmationType === 'cancel') {
        return t('Cancel subscription');
    } else if (confirmationType === 'subscribe') {
        return t('Subscribe');
    }
}

const Header = ({showConfirmation, confirmationType}) => {
    const {member} = useContext(AppContext);
    let title = isPaidMember({member}) ? t('Change plan') : t('Choose a plan');
    if (showConfirmation) {
        title = getConfirmationPageTitle({confirmationType});
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
    onPlanSelect, onPlanCheckout, onConfirm, onCancelSubscription
}) => {
    const {member} = useContext(AppContext);
    // Plan upgrade flow for free member
    const allowUpgrade = allowCompMemberUpgrade({member}) && isComplimentaryMember({member});
    if (!isPaidMember({member}) || allowUpgrade) {
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

function AccountPlanPage() {
    const {member, site, doAction, lastPage} = useContext(AppContext);
    const timeoutIdRef = useRef(null);

    // Calculate prices
    const pricesRef = useRef(null);
    if (!pricesRef.current) {
        let prices = getAvailablePrices({site});
        let activePrice = getMemberActivePrice({member});

        if (activePrice) {
            prices = getFilteredPrices({prices, currency: activePrice.currency});
        }
        pricesRef.current = prices;
    }
    const prices = pricesRef.current;

    // Calculate initial selected plan
    const getInitialSelectedPlan = () => {
        const activePrice = getMemberActivePrice({member});
        let selectedPrice = activePrice ? prices.find((d) => {
            return (d.id === activePrice.id);
        }) : null;

        // Select first plan as default for free member
        if (!isPaidMember({member}) && prices.length > 0) {
            selectedPrice = prices[0];
        }
        return selectedPrice ? selectedPrice.id : null;
    };

    const [selectedPlan, setSelectedPlan] = useState(getInitialSelectedPlan);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationPlan, setConfirmationPlan] = useState(null);
    const [confirmationType, setConfirmationType] = useState(null);

    // Redirect to signin if no member
    useEffect(() => {
        if (!member) {
            doAction('switchPage', {
                page: 'signin'
            });
        }
    }, [member, doAction]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            clearTimeout(timeoutIdRef.current);
        };
    }, []);

    const cancelConfirmPage = () => {
        setShowConfirmation(false);
        setConfirmationPlan(null);
        setConfirmationType(null);
    };

    const onBack = () => {
        if (showConfirmation) {
            cancelConfirmPage();
        } else {
            doAction('back');
        }
    };

    const getActivePriceId = ({member}) => {
        const activePrice = getMemberActivePrice({member});
        if (activePrice) {
            return activePrice.id;
        }
        return null;
    };

    const onPlanCheckout = (e, priceId) => {
        let planToCheckout = selectedPlan;
        if (priceId) {
            planToCheckout = priceId;
        }

        const restrictCheckout = allowCompMemberUpgrade({member}) ? !isComplimentaryMember({member}) : true;
        if (isPaidMember({member}) && restrictCheckout) {
            const subscription = getMemberSubscription({member});
            const subscriptionId = subscription ? subscription.id : '';
            if (subscriptionId) {
                doAction('updateSubscription', {plan: confirmationPlan.name, planId: confirmationPlan.id, subscriptionId, cancelAtPeriodEnd: false});
            }
        } else {
            doAction('checkoutPlan', {plan: planToCheckout});
        }
    };

    const onPlanSelect = (e, priceId) => {
        e?.preventDefault();

        const allowCompMember = allowCompMemberUpgrade({member}) ? isComplimentaryMember({member}) : false;
        // Work as checkboxes for free member plan selection and button for paid members
        if (!isPaidMember({member}) || allowCompMember) {
            // Hack: React checkbox gets out of sync with dom state with instant update
            timeoutIdRef.current = setTimeout(() => {
                setSelectedPlan(priceId);
            }, 5);
        } else {
            const confirmationPrice = prices.find(d => d.id === priceId);
            const activePlan = getActivePriceId({member});
            const confirmationTypeValue = activePlan ? 'changePlan' : 'subscribe';
            if (priceId !== selectedPlan) {
                setConfirmationPlan(confirmationPrice);
                setConfirmationType(confirmationTypeValue);
                setShowConfirmation(true);
            }
        }
    };

    const onCancelSubscription = ({subscriptionId}) => {
        const subscription = getSubscriptionFromId({subscriptionId, member});
        const subscriptionPlan = getPriceFromSubscription({subscription});
        setShowConfirmation(true);
        setConfirmationPlan(subscriptionPlan);
        setConfirmationType('cancel');
    };

    const onCancelSubscriptionConfirmation = (reason) => {
        const subscription = getMemberSubscription({member});
        if (!subscription) {
            return null;
        }
        doAction('cancelSubscription', {
            subscriptionId: subscription.id,
            cancelAtPeriodEnd: true,
            cancellationReason: reason
        });
    };

    const onConfirm = (e, data) => {
        if (confirmationType === 'cancel') {
            return onCancelSubscriptionConfirmation(data);
        } else if (['changePlan', 'subscribe'].includes(confirmationType)) {
            return onPlanCheckout();
        }
    };

    return (
        <>
            <div className='gh-portal-content'>
                <BackButton onClick={e => onBack(e)} hidden={!lastPage && !showConfirmation} />
                <CloseButton />
                <Header
                    onBack={e => onBack(e)}
                    confirmationType={confirmationType}
                    showConfirmation={showConfirmation}
                />
                <PlansContainer
                    {...{plans: prices, selectedPlan, showConfirmation, confirmationPlan, confirmationType}}
                    onConfirm={(...args) => onConfirm(...args)}
                    onCancelSubscription = {data => onCancelSubscription(data)}
                    onPlanSelect = {onPlanSelect}
                    onPlanCheckout = {(e, name) => onPlanCheckout(e, name)}
                />
            </div>
        </>
    );
}

export default AccountPlanPage;
