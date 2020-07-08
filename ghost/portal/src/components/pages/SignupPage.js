import ActionButton from '../common/ActionButton';
import InputField from '../common/InputField';
import AppContext from '../../AppContext';
import PlansSection from '../common/PlansSection';

const React = require('react');

class SignupPage extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            name: '',
            email: '',
            plan: 'FREE'
        };
    }

    componentDidMount() {
        const {member} = this.context;
        if (member) {
            this.context.onAction('switchPage', {
                page: 'accountHome'
            });
        }
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

        let label = (action === 'signup:running') ? 'Sending...' : 'Continue';
        let retry = false;
        if (action === 'signup:failed') {
            label = 'Retry';
            retry = true;
        }
        const disabled = (action === 'signup:running') ? true : false;
        return (
            <ActionButton
                retry={retry}
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
        const {
            plans,
            allow_self_signup: allowSelfSignup,
            is_stripe_configured: isStripeConfigured,
            portal_plans: portalPlans
        } = this.context.site;

        const plansData = [];
        const stripePlans = [
            {type: 'month', price: plans.monthly, currency: plans.currency_symbol, name: 'Monthly'},
            {type: 'year', price: plans.yearly, currency: plans.currency_symbol, name: 'Yearly'}
        ];

        if (allowSelfSignup && (portalPlans === undefined || portalPlans.includes('free'))) {
            plansData.push({type: 'free', price: 'Decide later', name: 'Free'});
        }

        if (isStripeConfigured) {
            stripePlans.forEach((plan) => {
                if (portalPlans === undefined || portalPlans.includes(plan.name.toLowerCase())) {
                    plansData.push(plan);
                }
            });
        }

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
                onChange={(e, name) => this.handleInput(e, name)}
            />
        );
    }

    renderLoginMessage() {
        const {brandColor, onAction} = this.context;
        return (
            <div style={{display: 'flex', justifyContent: 'center', marginTop: '12px'}}>
                <div style={{marginRight: '6px', color: '#929292'}}> Already a member ? </div>
                <div style={{color: brandColor, fontWeight: 'bold', cursor: 'pointer'}} role="button" onClick={() => onAction('switchPage', {page: 'signin'})}> Log in </div>
            </div>
        );
    }

    renderNameField() {
        const {portal_name: portalName} = this.context.site;
        if (portalName === undefined || portalName) {
            return this.renderInputField('name');
        }
        return null;
    }

    renderForm() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', marginBottom: '12px', padding: '0 18px'}}>
                {this.renderNameField()}
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