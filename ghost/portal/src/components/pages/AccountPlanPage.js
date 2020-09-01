import AppContext from '../../AppContext';
import ActionButton from '../common/ActionButton';
import PlansSection from '../common/PlansSection';
import CalculateDiscount from '../../utils/discount';
import { getDateString } from '../../utils/date-time';

export const AccountPlanPageStyles = `
    .gh-portal-accountplans-main {
        margin-top: 32px;
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

export default class AccountPlanPage extends React.Component {
    static contextType = AppContext;

    constructor(props, context) {
        super(props, context);
        const {member} = this.context;
        const {plans} = this.context.site;
        this.plans = this.getPlansData({plans});
        const activePlan = this.getActivePlanName({member}) || this.plans[0].name;

        this.state = {
            plan: activePlan
        };
    }

    componentDidMount() {
        const {member} = this.context;
        if (!member) {
            this.context.onAction('switchPage', {
                page: 'signup'
            });
        }
    }

    getPlansData({plans}) {
        const discount = CalculateDiscount(plans.monthly, plans.yearly);
        return [
            {
                type: 'month',
                price: plans.monthly,
                currency: plans.currency_symbol,
                name: 'Monthly'
            },
            {
                type: 'year',
                price: plans.yearly,
                currency: plans.currency_symbol,
                name: 'Yearly',
                discount
            }
        ];
    }

    handleSignout(e) {
        e.preventDefault();
        this.context.onAction('signout');
    }

    onBack(e) {
        this.context.onAction('back');
    }

    renderHeader() {
        return (
            <header className='gh-portal-detail-header'>
                <h3 className='gh-portal-main-title'>Choose plan</h3>
            </header>
        );
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
        e.preventDefault();
        // Hack: React checkbox gets out of sync with dom state with instant update
        setTimeout(() => {
            this.setState((state) => {
                return {
                    plan: name
                };
            });
        }, 5);
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

    renderError() {
        const {global} = this.state.errors || {};
        if (global) {
            return (
                <GlobalError message={global} />
            );
        }
        return null;
    }

    renderPlanChooser() {
        const plansData = this.plans;
        const selectedPlan = this.state.plan;
        return (
            <section>
                <div className='gh-portal-section gh-portal-accountplans-main'>
                    <PlansSection
                        showLabel={false}
                        plans={plansData}
                        selectedPlan={selectedPlan}
                        onPlanSelect={(e, name) => this.onPlanSelect(e, name)}
                    />
                    {this.renderError()}
                </div>
                <div style={{marginBottom: '24px'}}>
                    {this.renderCancelContinueButton()}
                </div>
                {this.renderFooter()}
            </section>
        );
    }

    renderCancelNotice() {
        const subscription = this.getMemberSubscription();
        if (!subscription || !subscription.cancel_at_period_end) {
            return null;
        }

        const currentPeriodEnd = subscription.current_period_end;
        return (
            <div style={{width: '100%', display: 'flex', justifyContent: 'center', color: 'red', marginBottom: '12px', fontSize: '12px', fontWeight: 'bold'}}>
                Your subscription will expire on {getDateString(currentPeriodEnd)}
            </div>
        );
    }

    renderCancelContinueButton() {
        const {onAction, member} = this.context;
        if (!member.paid) {
            return null;
        }
        const [subscription] = member.subscriptions;
        const label = subscription.cancel_at_period_end ? 'Continue subscription' : 'Cancel subscription';
        const isRunning = ['cancelSubscription:running'].includes(this.context.action);
        const disabled = (isRunning) ? true : false;
        const isPrimary = !!subscription.cancel_at_period_end;

        return (
            <div style={{marginBottom: '24px'}}>
                {this.renderCancelNotice()}
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
                    brandColor={this.context.brandColor}
                    label={label}
                    style={{
                        width: '100%'
                    }}
                />
            </div>
        );
    }

    renderFooter() {
        return (
            <footer className='gh-portal-action-footer'>
                <button className='gh-portal-btn' onClick={e => this.onBack(e)}>Cancel</button>
                {this.renderSubmitButton()}
            </footer>
        );
    }

    getMemberSubscription() {
        const {member} = this.context;
        if (member.paid) {
            const [subscription] = member.subscriptions || [];
            return subscription;
        }
        return null;
    }

    renderSubmitButton() {
        const isRunning = ['updateSubscription:running', 'checkoutPlan:running'].includes(this.context.action);
        const label = 'Change Plan';
        const disabled = (isRunning || !this.state.plan) ? true : false;
        const subscription = this.getMemberSubscription();
        const isPrimary = !subscription.cancel_at_period_end;
        return (
            <ActionButton
                onClick={e => this.onPlanCheckout(e)}
                disabled={disabled}
                isRunning={isRunning}
                isPrimary={isPrimary}
                brandColor={this.context.brandColor}
                label={label}
                style={{height: '40px'}}
            />
        );
    }

    render() {
        const {member} = this.context;
        if (!member) {
            return null;
        }
        return (
            <div>
                {this.renderHeader()}
                {this.renderPlanChooser()}
            </div>
        );
    }
}