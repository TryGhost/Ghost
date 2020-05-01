import ActionButton from '../common/ActionButton';
import InputField from '../common/InputField';
import {ParentContext} from '../ParentContext';
import PlansSection from '../common/PlansSection';

const React = require('react');

class SignupPage extends React.Component {
    static contextType = ParentContext;

    constructor(props) {
        super(props);
        this.state = {
            name: '',
            email: '',
            plan: 'FREE'
        };
    }

    handleSignup(e) {
        e.preventDefault();
        const {onAction} = this.context;
        const email = this.state.email;
        const name = this.state.name;
        const plan = this.state.plan;
        onAction('signup', {name, email, plan});
    }

    handleInput(e, field) {
        this.setState({
            [field]: e.target.value
        });
    }

    renderSubmitButton() {
        const {action, brandColor} = this.context;

        const label = (action === 'signup:running') ? 'Sending...' : 'Continue';
        const disabled = (action === 'signup:running') ? true : false;
        return (
            <ActionButton
                onClick={e => this.handleSignup(e)}
                disabled={disabled}
                brandColor={brandColor}
                label={label}
            />
        );
    }

    handleSelectPlan(e, name) {
        e.preventDefault();
        // Hack: React checkbox gets out of sync with dom state with instant update
        setTimeout(() => {
            this.setState((prevState) => {
                return {
                    plan: name
                };
            });
        }, 5);
    }

    renderPlans() {
        const {plans} = this.context.site;
        const plansData = [
            {type: 'free', price: 'Decide later', name: 'Free'},
            {type: 'month', price: plans.monthly, currency: plans.currency_symbol, name: 'Monthly'},
            {type: 'year', price: plans.yearly, currency: plans.currency_symbol, name: 'Yearly'}
        ];
        return (
            <PlansSection plans={plansData} selectedPlan={this.state.plan} onPlanSelect={(e, name) => this.handleSelectPlan(e, name)}/>
        );
    }

    renderInputField(fieldName) {
        const fields = {
            name: {
                type: 'text',
                value: this.state.name,
                placeholder: 'Name...',
                label: 'Name',
                name: 'name'
            },
            email: {
                type: 'email',
                value: this.state.email,
                placeholder: 'Email...',
                label: 'Email',
                name: 'email'
            }
        };
        const field = fields[fieldName];
        return (
            <InputField
                label = {field.label}
                type={field.type}
                name={field.name}
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e, fieldName) => this.handleInput(e, fieldName)}
            />
        );
    }

    renderLoginMessage() {
        const {brandColor, onAction} = this.context;
        return (
            <div style={{display: 'flex', justifyContent: 'center'}}>
                <div style={{marginRight: '6px', color: '#929292'}}> Already a member ? </div>
                <div style={{color: brandColor, fontWeight: 'bold', cursor: 'pointer'}} role="button" onClick={() => onAction('switchPage', 'signin')}> Log in </div>
            </div>
        );
    }

    renderForm() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', marginBottom: '12px', padding: '0 18px'}}>
                {this.renderInputField('name')}
                {this.renderInputField('email')}
                {this.renderPlans()}
                {this.renderSubmitButton()}
                {this.renderLoginMessage()}
            </div>
        );
    }

    renderSiteLogo() {
        const {site} = this.context;
        const siteLogo = site.logo;

        const logoStyle = {
            position: 'relative',
            display: 'block',
            width: '48px',
            height: '48px',
            marginBottom: '12px',
            backgroundPosition: '50%',
            backgroundSize: 'cover',
            borderRadius: '100%',
            boxShadow: '0 0 0 3px #fff'
        };

        if (siteLogo) {
            logoStyle.backgroundImage = `url(${siteLogo})`;
            return (
                <span style={logoStyle}> </span>
            );
        }
        return null;
    }

    renderFormHeader() {
        const {site} = this.context;
        const siteTitle = site.title || 'Site Title';

        return (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '18px'}}>
                {this.renderSiteLogo()}
                <div style={{fontSize: '21px', fontWeight: '400'}}> Subscribe to {siteTitle}</div>
            </div>
        );
    }

    render() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                <div style={{paddingLeft: '16px', paddingRight: '16px'}}>
                    {this.renderFormHeader()}
                    {this.renderForm()}
                </div>
            </div>
        );
    }
}

export default SignupPage;