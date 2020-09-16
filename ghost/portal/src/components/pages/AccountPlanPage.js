import AppContext from '../../AppContext';
import ActionButton from '../common/ActionButton';
import BackButton from '../common/BackButton';
import PlansSection from '../common/PlansSection';
import {getDateString} from '../../utils/date-time';
import {getMemberActivePlan, getMemberSubscription, getPlanFromSubscription, getSitePlans, getSubscriptionFromId, isPaidMember} from '../../utils/helpers';

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
        return 'Confirm subscription';
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

const CancelContinueSubscription = ({member, onCancelContinueSubscription, onAction, action, brandColor, showOnlyContinue = false}) => {
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

    // Hide the button if subscription is due cancellation
    if (subscription.cancel_at_period_end) {
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

const Header = ({member, lastPage, brandColor, onBack, showConfirmation, confirmationType}) => {
    let title = member.paid ? 'Change plan' : 'Choose a plan';
    if (showConfirmation) {
        title = getConfirmationPageTitle({confirmationType});
    }
    return (
        <header className='gh-portal-detail-header'>
            {lastPage ? <BackButton brandColor={brandColor} onClick={e => onBack(e)} /> : null}
            <h3 className='gh-portal-main-title'>{title}</h3>
        </header>
    );
};

const PlanConfirmation = ({action, member, plan, type, brandColor, onConfirm}) => {
    const subscription = getMemberSubscription({member});
    const isRunning = ['updateSubscription:running', 'checkoutPlan:running', 'cancelSubscription:running'].includes(action);
    const label = 'Confirm';
    if (type === 'changePlan') {
        return (
            <div>
                <div className='gh-portal-list outline mb6'>
                    <section>
                        <div className='gh-portal-list-detail'>
                            <h3>Account</h3>
                            <p>{member.email}</p>
                        </div>
                    </section>
                    <section>
                        <div className='gh-portal-list-detail'>
                            <h3>Price</h3>
                            <p>{plan.currency}{plan.price}/{plan.type} – Starting {getDateString(subscription.current_period_end)}</p>
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
            </div>
        );
    } else {
        return (
            <div>
                <p>If you confirm and end your subscription now, you can still access it until <strong>{getDateString(subscription.current_period_end)}</strong>.</p>
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
            </div>
        );
    }
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

const UpgradePlanSelector = ({plans, selectedPlan, errors, member, onPlanCheckout, action, brandColor, onPlanSelect}) => {
    const {global} = errors || {};
    const isRunning = ['checkoutPlan:running'].includes(action);
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
            <ActionButton
                onClick={e => onPlanCheckout(e)}
                isRunning={isRunning}
                isPrimary={true}
                brandColor={brandColor}
                label={'Continue'}
                style={{height: '40px', width: '100%'}}
            />
        </section>
    );
};
const PlanMain = ({
    plans, selectedPlan, confirmationPlan, confirmationType,
    errors, member, onAction, action, brandColor,
    showConfirmation = false, onPlanSelect, onPlanCheckout, onConfirm, onCancelContinueSubscription
}) => {
    if (!isPaidMember({member})) {
        return (
            <PlanUpgrade
                {...{plans, selectedPlan, errors, member, onAction, action, brandColor,onPlanSelect, onPlanCheckout}}
            />
        );
    }
    if (!showConfirmation) {
        return (
            <PlanChooser
                {...{plans, selectedPlan, errors, member, action, brandColor,
                    onAction, onCancelContinueSubscription, onPlanSelect}}
            />
        );
    }
    return (
        <PlanConfirmation {...{action, member, plan: confirmationPlan, type: confirmationType, onConfirm, brandColor}}/>
    );
};

const PlanUpgrade = ({
    plans, selectedPlan, errors, member, onAction, action, brandColor,onPlanSelect,onPlanCheckout
}) => {
    selectedPlan = selectedPlan || plans[0].name;
    return (
        <UpgradePlanSelector
            {...{plans, selectedPlan, errors, member, action, brandColor,onAction, onPlanSelect,onPlanCheckout}}
        />
    );
};

export default class AccountPlanPage extends React.Component {
    static contextType = AppContext;

    constructor(props, context) {
        super(props, context);
        this.state = this.getInitialState();
    }

    getInitialState() {
        const {member, site} = this.context;
        this.plans = getSitePlans({site, includeFree: false});
        let activePlan = getMemberActivePlan({member});
        const selectedPlan = activePlan ? this.plans.find((d) => {
            return (d.name === activePlan.name && d.price === activePlan.price && d.currency === activePlan.currency);
        }) : null;
        const isFreeMember = !isPaidMember({member});
        const selectedPlanName = selectedPlan ? selectedPlan.name : null;
        if (isFreeMember && this.plans.length === 1) {
            return {
                selectedPlan: selectedPlanName,
                showConfirmation: true,
                isDirectConfirmation: true,
                confirmationPlan: this.plans[0],
                confirmationType: 'subscribe'
            };
        }
        return {
            selectedPlan: selectedPlanName
        };
    }

    handleSignout(e) {
        e.preventDefault();
        this.context.onAction('signout');
    }

    onBack(e) {
        if (this.state.showConfirmation && !this.state.isDirectConfirmation) {
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

    onPlanCheckout(e) {
        const {onAction, member} = this.context;
        const {confirmationPlan: plan, errors} = this.state;
        const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
        if (!hasFormErrors) {
            if (member.paid) {
                const {subscriptions} = member;
                const subscriptionId = subscriptions[0].id;
                onAction('updateSubscription', {plan: plan.name, subscriptionId, cancelAtPeriodEnd: false});
            } else {
                onAction('checkoutPlan', {plan: plan.name});
            }
        }
    }

    onPlanSelect(e, name) {
        const {member} = this.context;
        e.preventDefault();

        if (!isPaidMember({member})) {
            // Hack: React checkbox gets out of sync with dom state with instant update
            setTimeout(() => {
                this.setState((state) => {
                    return {
                        selectedPlan: name
                    };
                });
            }, 5);
        }
        const confirmationPlan = this.plans.find(d => d.name === name);
        const activePlan = this.getActivePlanName({member});
        const confirmationType = activePlan ? 'changePlan' : 'subscribe';
        if (name !== this.state.selectedPlan) {
            this.setState({
                confirmationPlan,
                confirmationType,
                showConfirmation: true
            });
        }
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

    getActivePlanName({member}) {
        if (member && member.paid && member.subscriptions[0]) {
            const {plan} = member.subscriptions[0];
            return plan.nickname;
        }
        return null;
    }

    onConfirm() {
        const {confirmationType} = this.state;
        if (confirmationType === 'cancel') {
            return this.onCancelSubscriptionConfirmation();
        } else if (['changePlan', 'subscribe'].includes(confirmationType)) {
            return this.onPlanCheckout();
        }
    }

    render() {
        const {member, brandColor, lastPage} = this.context;
        const plans = this.plans;
        const {selectedPlan, errors = {}, showConfirmation, confirmationPlan, confirmationType} = this.state;
        return (
            <div>
                <div className='gh-portal-content'>
                    <Header
                        lastPage={lastPage}
                        member={member} brandColor={brandColor} onBack={e => this.onBack(e)}
                        confirmationType = {confirmationType}
                        showConfirmation = {showConfirmation}
                    />
                    <PlanMain
                        {...this.context}
                        {...{plans, selectedPlan, showConfirmation, confirmationPlan, confirmationType, errors}}
                        onConfirm = {() => this.onConfirm()}
                        onCancelSubscriptionConfirmation = {() => this.onCancelSubscriptionConfirmation()}
                        onCancelContinueSubscription = {data => this.onCancelContinueSubscription(data)}
                        onPlanSelect = {(e, name) => this.onPlanSelect(e, name)}
                        onPlanCheckout = {(e, name) => this.onPlanCheckout(e, name)}
                    />
                </div>
            </div>
        );
    }
}