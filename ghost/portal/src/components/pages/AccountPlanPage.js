import AppContext from '../../AppContext';
import ActionButton from '../common/ActionButton';
import BackButton from '../common/BackButton';
import PlansSection from '../common/PlansSection';
import {getDateString} from '../../utils/date-time';
import {getMemberSubscription, getPlanFromSubscription, getSitePlans, getSubscriptionFromId} from '../../utils/helpers';

export const AccountPlanPageStyles = `
    .gh-portal-accountplans-main {
        margin-top: 24px;
        margin-bottom: 0;
    }

    .gh-portal-expire-container {
        margin: 24px 0 0;
    }
`;

const React = require('react');

function getConfirmationPageTitle({confirmationType}) {
    if (confirmationType === 'changePlan') {
        return 'Change plan';
    } else if (confirmationType === 'cancel') {
        return 'Confirm cancellation';
    } else if (confirmationType === 'subscribe') {
        return 'Subscribe';
    }
}

const GlobalError = ({message, style}) => {
    if (!message) {
        return null;
    }
    return (
        <p className='gh-portal-error' style={{
            ...(style || {})
        }}>
            {message}
        </p>
    );
};

export const CancelContinueSubscription = ({member, onCancelContinueSubscription, onAction, action, brandColor, showOnlyContinue = false}) => {
    if (!member.paid) {
        return null;
    }
    const subscription = getMemberSubscription({member});
    if (!subscription) {
        return null;
    }

    // To show only continue button and not cancellation
    if (showOnlyContinue && !subscription.cancel_at_period_end) {
        return null;
    }
    const label = subscription.cancel_at_period_end ? 'Continue subscription' : 'Cancel subscription';
    const isRunning = ['cancelSubscription:running'].includes(action);
    const disabled = (isRunning) ? true : false;
    const isPrimary = !!subscription.cancel_at_period_end;
    const isDestructive = !subscription.cancelAtPeriodEnd;

    const CancelNotice = () => {
        if (!subscription.cancel_at_period_end) {
            return null;
        }
        const currentPeriodEnd = subscription.current_period_end;
        return (
            <p className="gh-portal-expire-warning">
                Your subscription will expire on {getDateString(currentPeriodEnd)}.
            </p>
        );
    };

    return (
        <div className="gh-portal-expire-container">
            <CancelNotice />
            <ActionButton
                onClick={(e) => {
                    // onAction('cancelSubscription', {
                    //     subscriptionId: subscription.id,
                    //     cancelAtPeriodEnd: !subscription.cancel_at_period_end
                    // });
                    onCancelContinueSubscription({
                        subscriptionId: subscription.id,
                        cancelAtPeriodEnd: !subscription.cancel_at_period_end
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

const Header = ({member, brandColor, onBack, showConfirmation, confirmationType}) => {
    let title = member.paid ? 'Choose plan' : 'Choose your plan';
    if (showConfirmation) {
        title = getConfirmationPageTitle({confirmationType});
    }
    return (
        <header className='gh-portal-detail-header'>
            <BackButton brandColor={brandColor} onClick={e => onBack(e)} />
            <h3 className='gh-portal-main-title'>{title}</h3>
        </header>
    );
};

const Footer = ({member, action, plan, brandColor, onPlanCheckout, onBack}) => {
    return (
        <footer className='gh-portal-action-footer'>
            <button className='gh-portal-btn' onClick={e => onBack(e)}>Cancel</button>
            <SubmitButton
                member={member}
                action={action}
                plan={plan}
                brandColor={brandColor}
                onPlanCheckout={onPlanCheckout}
            />
        </footer>
    );
};

const SubmitButton = ({member, action, plan, brandColor, onPlanCheckout}) => {
    const isRunning = ['updateSubscription:running', 'checkoutPlan:running'].includes(action);
    const label = member.paid ? 'Change Plan' : 'Continue';
    const disabled = (isRunning || !plan) ? true : false;
    const subscription = getMemberSubscription({member});
    const isPrimary = (!subscription || !subscription.cancel_at_period_end);
    return (
        <ActionButton
            onClick={e => onPlanCheckout(e)}
            disabled={disabled}
            isRunning={isRunning}
            isPrimary={isPrimary}
            brandColor={brandColor}
            label={label}
            style={{height: '40px'}}
        />
    );
};

const PlanConfirmation = ({plan, type, brandColor, onConfirm}) => {
    let actionDescription = '';
    let confirmMessage = 'Are you sure ?';
    if (type === 'changePlan') {
        actionDescription = `You are switching to a ${plan.name} plan with pricing ${plan.currency} ${plan.price} / ${plan.type} `;
    } else if (type === 'subscribe') {
        actionDescription = `You are subscribing to a ${plan.name} plan with pricing ${plan.currency} ${plan.price} / ${plan.type} `;
    } else if (type === 'cancel') {
        actionDescription = `You are about to cancel your subscription for ${plan.currency} ${plan.price} ${plan.name} plan`;
    }
    const label = 'Confirm';
    return (
        <div>
            <div> {actionDescription} </div>
            <div> {confirmMessage} </div>
            <ActionButton
                onClick={e => onConfirm(e, plan)}
                isRunning={false}
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
};

const PlanChooser = ({plans, selectedPlan, errors, member, onAction, onCancelContinueSubscription, action, brandColor, onPlanSelect}) => {
    const {global} = errors || {};
    return (
        <section>
            <div className='gh-portal-section gh-portal-accountplans-main'>
                <PlansSection
                    showLabel={false}
                    plans={plans}
                    selectedPlan={selectedPlan}
                    onPlanSelect={(e, name) => onPlanSelect(e, name)}
                />
                <GlobalError message={global} />
            </div>
            <CancelContinueSubscription {...{member, onCancelContinueSubscription, action, brandColor}} />
        </section>
    );
};

const PlanMain = ({
    plans, selectedPlan, confirmationPlan, confirmationType,
    errors, member, onAction, action, brandColor,
    showConfirmation = false, onPlanSelect, onConfirm, onCancelContinueSubscription
}) => {
    if (!showConfirmation) {
        return (
            <PlanChooser
                {...{plans, selectedPlan, errors, member, onAction, onCancelContinueSubscription, action, brandColor, onPlanSelect}}
            />
        );
    }
    return (
        <PlanConfirmation {...{plan: confirmationPlan, type: confirmationType, onConfirm}}/>
    );
};
export default class AccountPlanPage extends React.Component {
    static contextType = AppContext;

    constructor(props, context) {
        super(props, context);
        const {member} = this.context;
        const {site} = this.context;
        this.plans = getSitePlans({site});
        let activePlan = this.getActivePlan({member});
        const selectedPlan = activePlan ? this.plans.find((d) => {
            return (d.name === activePlan.name && d.price === activePlan.price && d.currency === activePlan.currency);
        }) : null;
        // const activePlanExists = this.plans.some(d => d.name === activePlan);
        // if (!activePlanExists) {
        //     activePlan = this.plans[0].name;
        // }
        this.state = {
            plan: selectedPlan ? selectedPlan.name : null
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

    onPlanCheckoutOld(e) {
        e.preventDefault();
        this.setState((state) => {
            const errors = this.validateForm({state});
            return {
                errors
            };
        }, () => {
            const {onAction, member} = this.context;
            const {plan, errors} = this.state;
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            if (!hasFormErrors) {
                if (member.paid) {
                    const {subscriptions} = member;
                    const subscriptionId = subscriptions[0].id;
                    onAction('updateSubscription', {plan, subscriptionId});
                } else {
                    onAction('checkoutPlan', {plan});
                }
            }
        });
    }

    onPlanCheckout(e) {
        const {onAction, member} = this.context;
        const {confirmationPlan: plan, errors} = this.state;
        const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
        if (!hasFormErrors) {
            if (member.paid) {
                const {subscriptions} = member;
                const subscriptionId = subscriptions[0].id;
                onAction('updateSubscription', {plan: plan.name, subscriptionId});
            } else {
                onAction('checkoutPlan', {plan: plan.name});
            }
        }
    }

    onPlanSelect(e, name) {
        const {member} = this.context;
        e.preventDefault();
        const confirmationPlan = this.plans.find(d => d.name === name);
        const activePlan = this.getActivePlanName({member});
        const confirmationType = activePlan ? 'changePlan' : 'subscribe';
        if (name !== this.state.plan) {
            this.setState({
                confirmationPlan,
                confirmationType,
                showConfirmation: true
            });
        }
        // // Hack: React checkbox gets out of sync with dom state with instant update
        // setTimeout(() => {
        //     this.setState((state) => {
        //         return {
        //             plan: name
        //         };
        //     });
        // }, 5);
    }

    onCancelContinueSubscription({subscriptionId, cancelAtPeriodEnd}) {
        const {member} = this.context;
        const subscription = getSubscriptionFromId({subscriptionId, member});
        const subscriptionPlan = getPlanFromSubscription({subscription});
        if (!cancelAtPeriodEnd) {
            this.context.onAction('cancelSubscription', {
                subscriptionId,
                cancelAtPeriodEnd
            });
        } else {
            this.setState({
                showConfirmation: true,
                confirmationPlan: subscriptionPlan,
                confirmationType: 'cancel'
            });
        }
    }

    onCancelSubscriptionConfirmation() {
        const {member} = this.context;
        const subscription = getMemberSubscription({member});
        if (!subscription) {
            return null;
        }
        this.context.onAction('cancelSubscription', {
            subscriptionId: subscription.id,
            cancelAtPeriodEnd: true
        });
    }

    getActivePlan({member}) {
        if (member && member.paid && member.subscriptions[0]) {
            const {plan} = member.subscriptions[0];
            return {
                type: plan.interval,
                price: plan.amount / 100,
                currency: plan.currency_symbol,
                name: plan.nickname
            };
        }
        return null;
    }

    getActivePlanName({member}) {
        if (member && member.paid && member.subscriptions[0]) {
            const {plan} = member.subscriptions[0];
            return plan.nickname;
        }
        return null;
    }

    validateForm({state}) {
        const {member} = this.context;
        const activePlan = this.getActivePlanName({member});
        if (activePlan === state.plan) {
            return {
                global: 'Please select a different plan'
            };
        }
        return {};
    }

    render() {
        const {member, brandColor} = this.context;
        const plans = this.plans;
        const selectedPlan = this.state.plan;
        const errors = this.state.errors || {};
        const {showConfirmation, confirmationPlan, confirmationType} = this.state;
        let onConfirm = () => {};
        if (confirmationType === 'cancel') {
            onConfirm = () => this.onCancelSubscriptionConfirmation();
        } else if (['changePlan', 'subscribe'].includes(confirmationType)) {
            onConfirm = e => this.onPlanCheckout(e);
        }
        return (
            <div>
                <div className='gh-portal-content'>
                    <Header
                        member={member} brandColor={brandColor} onBack={e => this.onBack(e)}
                        confirmationType = {confirmationType}
                        showConfirmation = {showConfirmation}
                    />
                    <PlanMain
                        {...this.context}
                        {...{plans, selectedPlan, showConfirmation, confirmationPlan, confirmationType, onConfirm, errors}}
                        onCancelSubscriptionConfirmation = {() => this.onCancelSubscriptionConfirmation()}
                        onCancelContinueSubscription = {data => this.onCancelContinueSubscription(data)}
                        onPlanSelect = {(e, name) => this.onPlanSelect(e, name)}
                    />
                </div>
            </div>
        );
    }
}