import {ParentContext} from '../ParentContext';
import MemberAvatar from '../common/MemberGravatar';
import ActionButton from '../common/ActionButton';
import InputField from '../common/InputField';
import PlansSection from '../common/PlansSection';
import Switch from '../common/Switch';

const React = require('react');

export default class AccountPlanPage extends React.Component {
    static contextType = ParentContext;

    constructor(props, context) {
        super(props, context);
        this.state = {
            plan: 'Monthly'
        };
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
            <div style={{display: 'flex', padding: '0 24px'}}>
                <div style={{color: this.context.brandColor, cursor: 'pointer'}} role="button" onClick={e => this.onBack(e)}> &lt; Back </div>
                <div style={{flexGrow: 1, display: 'flex', justifyContent: 'center', fontWeight: 'bold'}}> Choose Plan </div>
            </div>
        );
    }

    onPlanCheckout(e) {
        e.preventDefault();
        const {onAction} = this.context;
        const plan = this.state.plan;
        onAction('checkoutPlan', {plan});
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

    renderPlanChooser() {
        const {plans} = this.context.site;
        const plansData = [
            {type: 'month', price: plans.monthly, currency: plans.currency_symbol, name: 'Monthly'},
            {type: 'year', price: plans.yearly, currency: plans.currency_symbol, name: 'Yearly'}
        ];
        return (
            <div style={{padding: '0 24px', marginTop: '12px'}}>
                <PlansSection
                    showLabel={false}
                    plans={plansData}
                    selectedPlan={this.state.plan}
                    onPlanSelect={(e, name) => this.onPlanSelect(e, name)}
                />
                <ActionButton
                    label="Continue"
                    onClick={e => this.onPlanCheckout(e)}
                    brandColor={this.context.brandColor}
                    style={{button: {marginTop: '12px'}}}
                />
            </div>
        );
    }

    render() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                {this.renderHeader()}
                {this.renderPlanChooser()}
            </div>
        );
    }
}