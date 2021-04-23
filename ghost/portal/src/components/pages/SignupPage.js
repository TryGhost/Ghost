import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
import AppContext from '../../AppContext';
import PlansSection from '../common/PlansSection';
import ProductsSection from '../common/ProductsSection';
import InputForm from '../common/InputForm';
import {ValidateInputForm} from '../../utils/form';
import CalculateDiscount from '../../utils/discount';
import {getSitePlans, hasOnlyFreePlan, isInviteOnlySite} from '../../utils/helpers';
import {ReactComponent as InvitationIcon} from '../../images/icons/invitation.svg';

const React = require('react');

export const SignupPageStyles = `
    .gh-portal-signup-logo {
        position: relative;
        display: block;
        background-position: 50%;
        background-size: cover;
        border-radius: 2px;
        width: 56px;
        height: 56px;
        margin: 12px 0 10px;
    }

    .gh-portal-signup-header,
    .gh-portal-signin-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 32px 24px;
    }

    .gh-portal-signup-header .gh-portal-main-title,
    .gh-portal-signin-header .gh-portal-main-title {
        margin-top: 12px;
    }

    .gh-portal-signup-logo + .gh-portal-main-title {
        margin: 4px 0 0;
    }

    .gh-portal-signup-header.nodivider {
        border: none;
        margin-bottom: 0;
    }

    .gh-portal-signup-message {
        display: flex;
        justify-content: center;
        color: var(--grey4);
        font-size: 1.3rem;
        letter-spacing: 0.2px;
        margin-top: 8px;
    }

    .gh-portal-signup-message button {
        font-size: 1.3rem;
        font-weight: 600;
        margin-left: 4px;
    }

    .gh-portal-signup-message button span {
        display: inline-block;
        padding-bottom: 2px;
        margin-bottom: -2px;
    }

    .gh-portal-content.signup {
        background: linear-gradient(#fff 30%,hsla(0,0%,100%,0)),
                    linear-gradient(hsla(0,0%,100%,0),#fff 70%) 0 100%,
                    linear-gradient(#fff,transparent),
                    linear-gradient(transparent,rgba(0,0,0,.08)) 0 100%;
        background-repeat: no-repeat;
        background-color: #fff;
        background-size: 100% 40px,100% 40px,100% 14px,100% 14px;
        background-attachment: local,local,scroll,scroll;
    }

    .gh-portal-content.signup.invite-only {
        background: none;
    }

    footer.gh-portal-signup-footer,
    footer.gh-portal-signin-footer {
        padding-top: 24px;
        height: 132px;
    }

    .gh-portal-content.signup,
    .gh-portal-content.signin {
        max-height: calc(100vh - 12vw - 132px);
        padding-bottom: 0;
    }

    .gh-portal-content.signup .gh-portal-section {
        margin-bottom: 0;
    }

    .gh-portal-content.signup.noplan {
        margin-bottom: -8px;
    }

    .gh-portal-content.signup.single-field {
        margin-bottom: 0;
    }

    .gh-portal-content.signup.single-field .gh-portal-input,
    .gh-portal-content.signin .gh-portal-input {
        margin-bottom: 8px;
    }

    .gh-portal-content.signup.single-field + .gh-portal-signup-footer,
    footer.gh-portal-signin-footer {
        padding-top: 12px;
    }

    .gh-portal-content.signin .gh-portal-section {
        margin-bottom: 0;
    }

    .gh-portal-content.signup.single-field + footer.gh-portal-signup-footer,
    .gh-portal-content.signin + footer.gh-portal-signin-footer {
        height: 120px;
    }

    footer.gh-portal-signup-footer.invite-only {
        height: unset;
    }

    footer.gh-portal-signup-footer.invite-only .gh-portal-signup-message {
        margin-top: 0;
    }

    .gh-portal-invite-only-notification {
        margin: 8px 32px;
        padding: 0;
        text-align: center;
        color: var(--grey2);
    }

    .gh-portal-icon-invitation {
        width: 44px;
        margin: 12px 0 2px;
    }

    .gh-portal-icon-invitation path,
    .gh-portal-icon-invitation circle,
    .gh-portal-icon-invitation line {
        stroke-width: 1.2px;
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

    componentWillUnmount() {
        clearTimeout(this.timeoutId);
    }

    handleSignup(e) {
        e.preventDefault();
        this.setState((state) => {
            return {
                errors: ValidateInputForm({fields: this.getInputFields({state})})
            };
        }, () => {
            const {onAction} = this.context;
            const {name, email, plan, errors} = this.state;
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            if (!hasFormErrors) {
                onAction('signup', {name, email, plan});
                this.setState({
                    errors: {}
                });
            }
        });
    }

    handleInputChange(e, field) {
        const fieldName = field.name;
        const value = e.target.value;
        this.setState({
            [fieldName]: value
        });
    }

    handleSelectPlan(e, name) {
        e.preventDefault();
        // Hack: React checkbox gets out of sync with dom state with instant update
        this.timeoutId = setTimeout(() => {
            this.setState((prevState) => {
                return {
                    plan: name
                };
            });
        }, 5);
    }

    onKeyDown(e) {
        // Handles submit on Enter press
        if (e.keyCode === 13){
            this.handleSignup(e);
        }
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
        const {pageQuery} = this.context;
        const plansData = [];
        const discount = CalculateDiscount(plans.monthly, plans.yearly);
        const stripePlans = [
            {
                type: 'month',
                price: plans.monthly,
                currency_symbol: plans.currency_symbol,
                name: 'Monthly'
            },
            {
                type: 'year',
                price: plans.yearly,
                currency_symbol: plans.currency_symbol,
                name: 'Yearly',
                discount
            },

            // TODO: mock!
            {
                type: 'custom',
                price: plans.yearly,
                currency_symbol: plans.currency_symbol,
                name: 'Custom',
                discount
            }
        ];

        if (allowSelfSignup && (portalPlans === undefined || portalPlans.includes('free'))) {
            plansData.push({type: 'free', price: 0, currency_symbol: plans.currency_symbol, name: 'Free'});
        }

        if (isStripeConfigured && pageQuery !== 'free') {
            stripePlans.forEach((plan) => {
                if (portalPlans === undefined || portalPlans.includes(plan.name.toLowerCase())) {
                    plansData.push(plan);
                }
            });
        }

        return plansData;
    }

    getInputFields({state, fieldNames}) {
        const {portal_name: portalName} = this.context.site;

        const errors = state.errors || {};
        const fields = [
            {
                type: 'email',
                value: state.email,
                placeholder: 'jamie@example.com',
                label: 'Email',
                name: 'email',
                required: true,
                tabindex: 2,
                errorMessage: errors.email || ''
            }
        ];

        /** Show Name field if portal option is set*/
        if (portalName) {
            fields.unshift({
                type: 'text',
                value: state.name,
                placeholder: 'Jamie Larson',
                label: 'Name',
                name: 'name',
                required: true,
                tabindex: 1,
                errorMessage: errors.name || ''
            });
        }
        fields[0].autoFocus = true;
        if (fieldNames && fieldNames.length > 0) {
            return fields.filter((f) => {
                return fieldNames.includes(f.name);
            });
        }
        return fields;
    }

    renderSubmitButton() {
        const {action, site, brandColor, pageQuery} = this.context;

        const availablePlans = getSitePlans({site, pageQuery});
        if (availablePlans.length === 0 || isInviteOnlySite({site})) {
            return null;
        }

        let label = 'Continue';
        if (hasOnlyFreePlan({site})) {
            label = 'Sign up';
        }

        let isRunning = false;
        if (action === 'signup:running') {
            label = 'Sending...';
            isRunning = true;
        }
        let retry = false;
        if (action === 'signup:failed') {
            label = 'Retry';
            retry = true;
        }

        const disabled = (action === 'signup:running') ? true : false;
        return (
            <ActionButton
                style={{width: '100%'}}
                retry={retry}
                onClick={e => this.handleSignup(e)}
                disabled={disabled}
                brandColor={brandColor}
                label={label}
                isRunning={isRunning}
                tabIndex='3'
            />
        );
    }

    renderPlans() {
        const {site, pageQuery} = this.context;
        const plansData = getSitePlans({site, pageQuery});
        return (
            <>
                <ProductsSection
                    plans={plansData}
                    selectedPlan={this.state.plan}
                    onPlanSelect={(e, name) => this.handleSelectPlan(e, name)}
                />
            </>
        );
    }

    renderLoginMessage() {
        const {brandColor, onAction} = this.context;
        return (
            <div className='gh-portal-signup-message'>
                <div>Already a member?</div>
                <button
                    className='gh-portal-btn gh-portal-btn-link'
                    style={{color: brandColor}}
                    onClick={() => onAction('switchPage', {page: 'signin'})}
                >
                    <span>Sign in</span>
                </button>
            </div>
        );
    }

    renderForm() {
        const fields = this.getInputFields({state: this.state});
        const {site, pageQuery} = this.context;
        const availablePlans = getSitePlans({site, pageQuery});
        if (availablePlans.length === 0 || isInviteOnlySite({site})) {
            return (
                <section>
                    <div className='gh-portal-section'>
                        <p className='gh-portal-invite-only-notification'>This site is invite-only, contact the owner for access.</p>
                    </div>
                </section>
            );
        }
        return (
            <section>
                <div className='gh-portal-section'>
                    <InputForm
                        fields={fields}
                        onChange={(e, field) => this.handleInputChange(e, field)}
                        onKeyDown={(e, field) => this.onKeyDown(e, field)}
                    />
                    {this.renderPlans()}
                </div>
            </section>
        );
    }

    renderSiteLogo() {
        const plansData = this.getPlans();
        const {site} = this.context;
        const siteLogo = site.icon;

        const logoStyle = {};

        if (siteLogo) {
            logoStyle.backgroundImage = `url(${siteLogo})`;
            return (
                <img className='gh-portal-signup-logo' src={siteLogo} alt={site.title} />
            );
        } else if (plansData.length === 0 || isInviteOnlySite({site})) {
            return (
                <InvitationIcon className='gh-portal-icon gh-portal-icon-invitation' />
            );
        }
        return null;
    }

    renderFormHeader() {
        const {site} = this.context;
        const siteTitle = site.title || '';

        return (
            <header className='gh-portal-signup-header'>
                {this.renderSiteLogo()}
                <h2 className="gh-portal-main-title">{siteTitle}</h2>
            </header>
        );
    }

    render() {
        const {site} = this.context;
        const plansData = this.getPlans();
        const fields = this.getInputFields({state: this.state});
        let sectionClass = '';
        let footerClass = '';

        if (plansData.length <= 1 || isInviteOnlySite({site})) {
            if ((plansData.length === 1 && plansData[0].type === 'free') || plansData.length === 0 || isInviteOnlySite({site})) {
                sectionClass = 'noplan';
                if (fields.length === 1) {
                    sectionClass = 'single-field';
                }
                if (plansData.length === 0 || isInviteOnlySite({site})) {
                    footerClass = 'invite-only';
                    sectionClass = 'invite-only';
                }
            } else {
                sectionClass = 'singleplan';
            }
        }

        return (
            <>
                <div className={'gh-portal-content signup ' + sectionClass}>
                    <CloseButton />
                    {this.renderFormHeader()}
                    {this.renderForm()}
                </div>
                <footer className={'gh-portal-signup-footer ' + footerClass}>
                    {this.renderSubmitButton()}
                    {this.renderLoginMessage()}
                </footer>
            </>
        );
    }
}

export default SignupPage;