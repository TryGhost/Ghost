import AppContext from '../../AppContext';
import ActionButton from '../common/ActionButton';
import BackButton from '../common/BackButton';
import PlansSection from '../common/PlansSection';
import {getDateString} from '../../utils/date-time';
import {getMemberSubscription, getSitePlans} from '../../utils/helpers';

export const AccountPlanPageStyles = `
    .gh-portal-accountplans-main {
        margin-top: 32px;
    }

    .gh-portal-expire-container {
        margin: -8px 0 18px;
    }
`;

const React = require('react');

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

export const CancelContinueSubscription = ({member, onAction, action, brandColor, showOnlyContinue = false}) => {
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
                    onAction('cancelSubscription', {
                        subscriptionId: subscription.id,
                        cancelAtPeriodEnd: !subscription.cancel_at_period_end
                    });
                }}
                isRunning={isRunning}
                disabled={disabled}
                isPrimary={isPrimary}
                brandColor={brandColor}
                label={label}
                style={{
                    width: '100%'
                }}
            />
        </div>
    );
};

const Header = ({member, brandColor, onBack}) => {
    const title = member.paid ? 'Choose Plan' : 'Choose your subscription';
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

const PlanConfirmation = ({newPlan, onCancelConfirmation, onPlanCheckout}) => {
    return `Please confirm your new Plan ${newPlan}`;
};

const PlanChooser = ({plans, selectedPlan, errors, member, onAction, action, brandColor, onPlanSelect}) => {
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
            <CancelContinueSubscription {...{member, onAction, action, brandColor}} />
        </section>
    );
};

const PlanMain = ({
    plans, selectedPlan, newPlan, errors, member, onAction, action, brandColor,
    showConfirmation = false, onPlanSelect, onCancelConfirmation, onPlanCheckout
}) => {
    if (!showConfirmation) {
        return (
            <PlanChooser
                {...{plans, selectedPlan, errors, member, onAction, action, brandColor, onPlanSelect}}
            />
        );
    }
    return (
        <PlanConfirmation {...{newPlan, onCancelConfirmation, onPlanCheckout}}/>
    );
};
export default class AccountPlanPage extends React.Component {
    static contextType = AppContext;

    constructor(props, context) {
        super(props, context);
        const {member} = this.context;
        const {site} = this.context;
        this.plans = getSitePlans({site});
        let activePlan = this.getActivePlanName({member}) || this.plans[0].name;
        const activePlanExists = this.plans.some(d => d.name === activePlan);
        if (!activePlanExists) {
            activePlan = this.plans[0].name;
        }
        this.state = {
            plan: activePlan
        };
    }

    handleSignout(e) {
        e.preventDefault();
        this.context.onAction('signout');
    }

    onBack(e) {
        this.context.onAction('back');
    }

    onPlanCheckout(e) {
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

    onPlanSelect(e, name) {
        debugger;
        e.preventDefault();
        if (name !== this.state.plan) {
            this.setState({
                newPlan: name,
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

    onCancelConfirmation() {
        this.setState({
            newPlan: null,
            showConfirmation: false
        });
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
        const {showConfirmation, newPlan} = this.state;
        return (
            <div>
                <div className='gh-portal-content with-footer'>
                    <Header member={member} brandColor={brandColor} onBack={e => this.onBack} />
                    <PlanMain
                        {...this.context}
                        {...{plans, selectedPlan, showConfirmation, newPlan, errors}}
                        onPlanSelect = {(e, name) => this.onPlanSelect(e, name)}
                    />
                </div>
            </div>
        );
    }
}