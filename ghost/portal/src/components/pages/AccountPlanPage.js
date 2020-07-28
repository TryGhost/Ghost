import AppContext from '../../AppContext';
import ActionButton from '../common/ActionButton';
import PlansSection from '../common/PlansSection';

const React = require('react');

const GlobalError = ({message, style}) => {
    if (!message) {
        return null;
    }
    return (
        <p style={{
            color: '#f05230',
            width: '100%',
            lineHeight: '0',
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
        const activePlan = this.getActivePlanName({member});
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
        const {onAction, member} = this.context;
        const plan = this.state.plan;
        const errors = this.validateForm();
        if (errors && Object.keys(errors).length > 0) {
            this.setState({
                errors
            });
        } else {
            this.setState({
                errors: {}
            });
            if (member.paid) {
                const {subscriptions} = member;
                const subscriptionId = subscriptions[0].id;
                onAction('updateSubscription', {plan, subscriptionId});
            } else {
                onAction('checkoutPlan', {plan});
            }
        }
    }

    onPlanSelect(e, name) {
        e.preventDefault();
        // Hack: React checkbox gets out of sync with dom state with instant update
        setTimeout(() => {
            this.setState({
                plan: name
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

    validateForm() {
        const {member} = this.context;
        const activePlan = this.getActivePlanName({member});
        if (activePlan === this.state.plan) {
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
        const {plans} = this.context.site;
        const plansData = [
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
                name: 'Yearly'
            }
        ];
        return (
            <section>
                <div className='gh-portal-section'>
                    <PlansSection
                        showLabel={false}
                        plans={plansData}
                        selectedPlan={this.state.plan}
                        onPlanSelect={(e, name) => this.onPlanSelect(e, name)}
                    />
                </div>
                {this.renderError()}
                <footer className='gh-portal-action-footer'>
                    <button className='gh-portal-btn' onClick={e => this.onBack(e)}>Cancel</button>
                    {this.renderSubmitButton()}
                </footer>
            </section>
        );
    }

    renderSubmitButton() {
        const isRunning = ['updateSubscription:running', 'checkoutPlan:running'].includes(this.context.action);
        const label = isRunning ? 'Updating...' : 'Continue';
        const disabled = (isRunning || !this.state.plan) ? true : false;
        return (
            <ActionButton
                style={{button: {width: 'unset'}}}
                onClick={e => this.onPlanCheckout(e)}
                disabled={disabled}
                brandColor={this.context.brandColor}
                label={label}
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