import AppContext from '../../AppContext';
import ActionButton from '../common/ActionButton';
import PlansSection from '../common/PlansSection';

const React = require('react');

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
                <h3 className='gh-portal-maiin-title'>Choose plan</h3>
            </header>
        );
    }

    onPlanCheckout(e) {
        e.preventDefault();
        const {onAction, member} = this.context;
        const plan = this.state.plan;
        if (member.paid) {
            const {subscriptions} = member;
            const subscriptionId = subscriptions[0].id;
            onAction('updateSubscription', {plan, subscriptionId});
        } else {
            onAction('checkoutPlan', {plan});
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
                <footer className='gh-portal-action-footer'>
                    <button className='gh-portal-btn' onClick={e => this.onBack(e)}>Cancel</button>
                    {this.renderActionButton()}
                </footer>
            </section>
        );
    }

    renderActionButton() {
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
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                {this.renderHeader()}
                {this.renderPlanChooser()}
            </div>
        );
    }
}