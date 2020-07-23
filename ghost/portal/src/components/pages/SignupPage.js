import ActionButton from '../common/ActionButton';
import InputField from '../common/InputField';
import AppContext from '../../AppContext';
import PlansSection from '../common/PlansSection';

const React = require('react');

export const SignupPageStyles = `
    .gh-portal-signup-logo {
        position: relative;
        display: block;
        width: 56px;
        height: 56px;
        margin: 18px 0;
        background-position: 50%;
        background-size: cover;
        border-radius: 2px;
    }

    .gh-portal-signup-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 32px 32px;
        margin: 0 -32px 18px;
        border-bottom: 1px solid #eaeaea;
    }

    .gh-portal-signin-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 32px 32px;
        margin: 0 -32px 32px;
        border-bottom: 1px solid #eaeaea;
    }

    .gh-portal-signup-header.nodivider {
        border: none;
        margin-bottom: 0;
    }

    .gh-portal-signup-footer {
        font-size: 1.3rem;
        margin-top: 8px;
        color: #515151;
        letter-spacing: 0.2px;
    }

    .gh-portal-signup-footer button {
        font-size: 1.3rem;
        font-weight: 400;
        margin-left: 4px;
    }
`;

class SignupPage extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            name: '',
            email: '',
            plan: 'Free'
        };
    }

    componentDidMount() {
        const {member} = this.context;
        if (member) {
            this.context.onAction('switchPage', {
                page: 'accountHome'
            });
        }

        // Handle the default plan if not set
        const plans = this.getPlans();
        const selectedPlan = this.state.plan;
        const defaultSelectedPlan = this.getDefaultSelectedPlan(plans, this.state.plan);
        if (defaultSelectedPlan !== selectedPlan) {
            this.setState({
                plan: defaultSelectedPlan
            });
        }
    }

    componentDidUpdate() {
        // Handle the default plan if not set
        const plans = this.getPlans();
        const selectedPlan = this.state.plan;
        const defaultSelectedPlan = this.getDefaultSelectedPlan(plans, this.state.plan);
        if (defaultSelectedPlan !== selectedPlan) {
            this.setState({
                plan: defaultSelectedPlan
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

    getDefaultSelectedPlan(plans = [], selectedPlan) {
        if (!plans || plans.length === 0) {
            return 'Free';
        }

        const hasSelectedPlan = plans.some((p) => {
            return p.name === selectedPlan;
        });

        if (!hasSelectedPlan) {
            return plans[0].name || 'Free';
        }

        return selectedPlan;
    }

    getPlans() {
        const {
            plans,
            allow_self_signup: allowSelfSignup,
            is_stripe_configured: isStripeConfigured,
            portal_plans: portalPlans
        } = this.context.site;

        const plansData = [];
        const stripePlans = [
            {type: 'month', 
                price: plans.monthly, 
                currency: plans.currency_symbol, 
                name: 'Monthly'},
            {type: 'year', 
                price: plans.yearly, 
                currency: plans.currency_symbol, 
                name: 'Yearly', 
                discount: 100 - Math.round((plans.yearly / 12 * 100) / plans.monthly)}
        ];

        if (allowSelfSignup && (portalPlans === undefined || portalPlans.includes('free'))) {
            plansData.push({type: 'free', price: 0, currency: plans.currency_symbol, name: 'Free'});
        }

        if (isStripeConfigured) {
            stripePlans.forEach((plan) => {
                if (portalPlans === undefined || portalPlans.includes(plan.name.toLowerCase())) {
                    plansData.push(plan);
                }
            });
        }

        return plansData;
    }

    renderPlans() {
        const plansData = this.getPlans();

        return (
            <PlansSection plans={plansData} selectedPlan={this.state.plan} onPlanSelect={(e, name) => this.handleSelectPlan(e, name)}/>
        );
    }

    renderInputField(fieldName) {
        const fields = {
            name: {
                type: 'text',
                value: this.state.name,
                placeholder: 'Jamie Larson',
                label: 'Name',
                name: 'name'
            },
            email: {
                type: 'email',
                value: this.state.email,
                placeholder: 'jamie@example.com',
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
            <div className='flex justify-center gh-portal-signup-footer'>
                <div>Already a member?</div>
                <button className='gh-portal-btn gh-portal-btn-link' style={{color: brandColor}} onClick={() => onAction('switchPage', {page: 'signin'})}>Log in</button>
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
            <div>
                <div className='gh-portal-section'>
                    {this.renderNameField()}
                    {this.renderInputField('email')}
                    {this.renderPlans()}
                </div>
                <div>
                    {this.renderSubmitButton()}
                    {this.renderLoginMessage()}
                </div>
            </div>
        );
    }

    renderSiteLogo() {
        const {site} = this.context;
        const siteLogo = site.logo;

        const logoStyle = {};

        if (siteLogo) {
            logoStyle.backgroundImage = `url(${siteLogo})`;
            return (
                <span className='gh-portal-signup-logo' style={logoStyle}> </span>
            );
        }
        return null;
    }

    renderFormHeader() {
        const {site} = this.context;
        const siteTitle = site.title || 'Site Title';

        const headerClass = site.logo ? 'gh-portal-signup-header' : 'gh-portal-signup-header';

        return (
            <div className={headerClass}>
                {this.renderSiteLogo()}
                <h2 className="gh-portal-main-title">{siteTitle}</h2>
            </div>
        );
    }

    render() {
        return (
            <div className='flex flex-column'>
                {this.renderFormHeader()}
                {this.renderForm()}
            </div>
        );
    }
}

export default SignupPage;