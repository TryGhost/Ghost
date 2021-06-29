import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
import AppContext from '../../AppContext';
import PlansSection, {SingleProductPlansSection} from '../common/PlansSection';
import ProductsSection from '../common/ProductsSection';
import InputForm from '../common/InputForm';
import {ValidateInputForm} from '../../utils/form';
import {getSiteProducts, getSitePrices, hasMultipleProducts, hasOnlyFreePlan, isInviteOnlySite, getAvailableProducts, hasMultipleProductsFeature} from '../../utils/helpers';
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

    .gh-portal-signup-header .gh-portal-main-subtitle {
        font-size: 1.5rem;
        text-align: center;
        line-height: 1.45em;
        margin: 4px 0 0;
        color: var(--grey3);
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
        max-height: calc(100vh - 12vw - 140px);
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
        height: 44px;
        margin: 12px 0 2px;
    }


    /* Multiple products signup */

    .gh-portal-popup-wrapper.signup.multiple-products .gh-portal-content,
    .gh-portal-popup-wrapper.signin.multiple-products .gh-portal-content {
        width: 100%;
        overflow: hidden;
        background: #fff;
    }

    .gh-portal-popup-wrapper.multiple-products .gh-portal-signin-header {
        padding-top: 18vmin;
    }

    .gh-portal-popup-wrapper.signin.multiple-products .gh-portal-popup-container {
        padding-bottom: 3vmin;
    }

    .gh-portal-popup-wrapper.multiple-products footer.gh-portal-signup-footer,
    .gh-portal-popup-wrapper.multiple-products footer.gh-portal-signin-footer {
        width: 100%;
        max-width: 420px;
        height: unset;
        padding: 0 !important;
        margin: 24px 32px;
    }


    .gh-portal-popup-wrapper.multiple-products footer.gh-portal-signin-footer {
        padding-top: 24px;
    }
    
    .gh-portal-popup-wrapper.multiple-products.signin .gh-portal-powered {
        position: absolute;
        bottom: 0;
    }
    
    @media (max-width: 480px) {
        .gh-portal-popup-wrapper.multiple-products footer.gh-portal-signup-footer,
        .gh-portal-popup-wrapper.multiple-products footer.gh-portal-signin-footer {
            padding: 0 24px !important;
        }

        .gh-portal-popup-wrapper.multiple-products.preview footer.gh-portal-signup-footer,
        .gh-portal-popup-wrapper.multiple-products.preview footer.gh-portal-signin-footer {
            padding-bottom: 32px !important;
        }

        .gh-portal-popup-wrapper.signup.multiple-products.preview .gh-portal-content,
        .gh-portal-popup-wrapper.signin.multiple-products.preview .gh-portal-content {
            overflow: unset;
        }
    }
`;

class SignupPage extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            name: '',
            email: '',
            plan: 'free'
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
        this.handleSelectedPlan();
    }

    componentDidUpdate() {
        this.handleSelectedPlan();
    }

    handleSelectedPlan() {
        const {site, pageQuery} = this.context;
        const prices = getSitePrices({site, pageQuery});

        const selectedPriceId = this.getSelectedPriceId(prices, this.state.plan);
        if (selectedPriceId !== this.state.plan) {
            this.setState({
                plan: selectedPriceId
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

    handleSelectPlan = (e, priceId) => {
        e && e.preventDefault();
        // Hack: React checkbox gets out of sync with dom state with instant update
        this.timeoutId = setTimeout(() => {
            this.setState((prevState) => {
                return {
                    plan: priceId
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

    getSelectedPriceId(prices = [], selectedPriceId) {
        if (!prices || prices.length === 0) {
            return 'free';
        }
        const hasSelectedPlan = prices.some((p) => {
            return p.id === selectedPriceId;
        });

        if (!hasSelectedPlan) {
            return prices[0].id || 'free';
        }

        return selectedPriceId;
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

        if (isInviteOnlySite({site, pageQuery})) {
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
        const prices = getSitePrices({site, pageQuery});
        if (hasMultipleProductsFeature({site})) {
            const availableProducts = getAvailableProducts({site});
            const product = availableProducts?.[0];
            return (
                <SingleProductPlansSection
                    product={product}
                    plans={prices}
                    selectedPlan={this.state.plan}
                    onPlanSelect={(e, id) => {
                        this.handleSelectPlan(e, id);
                    }}
                />
            );
        }
        return (
            <PlansSection
                plans={prices}
                selectedPlan={this.state.plan}
                onPlanSelect={(e, id) => {
                    this.handleSelectPlan(e, id);
                }}
            />
        );
    }

    renderProducts() {
        const {site} = this.context;
        const products = getSiteProducts({site});
        return (
            <>
                <ProductsSection
                    products={products}
                    onPlanSelect={this.handleSelectPlan}
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

    renderProductsOrPlans() {
        const {site} = this.context;
        if (hasMultipleProducts({site})) {
            return this.renderProducts();
        } else {
            return this.renderPlans();
        }
    }

    renderForm() {
        const fields = this.getInputFields({state: this.state});
        const {site, pageQuery} = this.context;

        if (isInviteOnlySite({site, pageQuery})) {
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
                        onKeyDown={e => this.onKeyDown(e)}
                    />
                    {this.renderProductsOrPlans()}
                </div>
            </section>
        );
    }

    renderSiteLogo() {
        const {site, pageQuery} = this.context;

        const siteLogo = site.icon;

        const logoStyle = {};

        if (siteLogo) {
            logoStyle.backgroundImage = `url(${siteLogo})`;
            return (
                <img className='gh-portal-signup-logo' src={siteLogo} alt={site.title} />
            );
        } else if (isInviteOnlySite({site, pageQuery})) {
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

    getClassNames() {
        const {site, pageQuery} = this.context;
        const plansData = getSitePrices({site, pageQuery});
        const fields = this.getInputFields({state: this.state});
        let sectionClass = '';
        let footerClass = '';

        if (plansData.length <= 1 || isInviteOnlySite({site})) {
            if ((plansData.length === 1 && plansData[0].type === 'free') || isInviteOnlySite({site, pageQuery})) {
                sectionClass = 'noplan';
                if (fields.length === 1) {
                    sectionClass = 'single-field';
                }
                if (isInviteOnlySite({site})) {
                    footerClass = 'invite-only';
                    sectionClass = 'invite-only';
                }
            } else {
                sectionClass = 'singleplan';
            }
        }
        return {sectionClass, footerClass};
    }

    renderMultipleProducts() {
        let {sectionClass, footerClass} = this.getClassNames();

        return (
            <>
                <div className={'gh-portal-content signup' + sectionClass}>
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

    renderSingleProduct() {
        let {sectionClass, footerClass} = this.getClassNames();

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

    render() {
        let {sectionClass, footerClass} = this.getClassNames();

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
