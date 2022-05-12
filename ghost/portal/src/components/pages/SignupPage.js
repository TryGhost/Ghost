import ActionButton from '../common/ActionButton';
import AppContext from '../../AppContext';
import CloseButton from '../common/CloseButton';
import SiteTitleBackButton from '../common/SiteTitleBackButton';
import NewsletterSelectionPage from './NewsletterSelectionPage';
import ProductsSection from '../common/ProductsSection';
import InputForm from '../common/InputForm';
import {ValidateInputForm} from '../../utils/form';
import {getSiteProducts, getSitePrices, hasOnlyFreePlan, isInviteOnlySite, freeHasBenefitsOrDescription, hasOnlyFreeProduct, getFreeProductBenefits, getFreeTierDescription, hasFreeProductPrice, hasMultipleNewsletters} from '../../utils/helpers';
import {ReactComponent as InvitationIcon} from '../../images/icons/invitation.svg';

const React = require('react');

export const SignupPageStyles = `
.gh-portal-back-sitetitle {
    position: absolute;
    top: 35px;
    left: 32px;
}

.gh-portal-back-sitetitle .gh-portal-btn {
    padding: 0;
    border: 0;
    font-size: 1.5rem;
    height: auto;
    line-height: 1em;
    color: var(--grey1);
}

.gh-portal-popup-wrapper:not(.full-size) .gh-portal-back-sitetitle,
.gh-portal-popup-wrapper.preview .gh-portal-back-sitetitle {
    display: none;
}

.gh-portal-signup-logo {
    position: relative;
    display: block;
    background-position: 50%;
    background-size: cover;
    border-radius: 2px;
    width: 60px;
    height: 60px;
    margin: 12px 0 10px;
}

.gh-portal-signup-header,
.gh-portal-signin-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 32px;
    margin-bottom: 32px;
}

.gh-portal-popup-wrapper.full-size .gh-portal-signup-header {
    margin-top: 32px;
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

.gh-portal-logged-out-form-container {
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
}

.signup .gh-portal-input-section:last-of-type {
    margin-bottom: 40px;
}

.gh-portal-signup-message {
    display: flex;
    justify-content: center;
    color: var(--grey4);
    font-size: 1.5rem;
    margin-top: 8px;
}

.gh-portal-signup-message,
.gh-portal-signup-message * {
    z-index: 9999;
}

.full-size .gh-portal-signup-message {
    margin-bottom: 40px;
}

@media (max-width: 480px) {
    .preview .gh-portal-products + .gh-portal-signup-message {
        margin-bottom: 40px;
    }
}

.gh-portal-signup-message button {
    font-size: 1.4rem;
    font-weight: 600;
    margin-left: 4px !important;
}

.gh-portal-signup-message button span {
    display: inline-block;
    padding-bottom: 2px;
    margin-bottom: -2px;
}

.gh-portal-content.signup.invite-only {
    background: none;
}

footer.gh-portal-signup-footer,
footer.gh-portal-signin-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    padding-top: 24px;
    height: unset;
}

.gh-portal-content.signup,
.gh-portal-content.signin {
    max-height: unset !important;
    padding-bottom: 0;
}

.gh-portal-content.signin {
    padding-bottom: 4px;
}

.gh-portal-content.signup .gh-portal-section {
    margin-bottom: 0;
}

.gh-portal-content.signup.noplan {
    margin-bottom: -8px;
}

.gh-portal-content.signup.single-field {
    margin-bottom: 4px;
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

footer.gh-portal-signup-footer.invite-only {
    height: unset;
}

footer.gh-portal-signup-footer.invite-only .gh-portal-signup-message {
    margin-top: 0;
}

.gh-portal-invite-only-notification {
    margin: 8px 32px 24px;
    padding: 0;
    text-align: center;
    color: var(--grey2);
}

.gh-portal-icon-invitation {
    width: 44px;
    height: 44px;
    margin: 12px 0 2px;
}

.gh-portal-popup-wrapper.full-size .gh-portal-popup-container.preview footer.gh-portal-signup-footer {
    padding-bottom: 32px;
}

.gh-portal-invite-only-notification + .gh-portal-signup-message {
    margin-bottom: 12px;
}

@media (min-width: 480px) {

}

@media (max-width: 480px) {
    .gh-portal-signup-logo {
        width: 48px;
        height: 48px;
    }
}

@media (min-width: 480px) and (max-width: 820px) {
    .gh-portal-powered.outside {
        left: 50%;
        transform: translateX(-50%);
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
            plan: 'free',
            showNewsletterSelection: false
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
        const {site, onAction} = this.context;
        e.preventDefault();
        this.setState((state) => {
            return {
                errors: ValidateInputForm({fields: this.getInputFields({state})})
            };
        }, () => {
            const {name, email, plan, errors} = this.state;
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            if (!hasFormErrors) {
                if (hasMultipleNewsletters({site})) {
                    this.setState({
                        showNewsletterSelection: true,
                        pageData: {name, email, plan},
                        errors: {}
                    });
                } else {
                    this.setState({
                        errors: {}
                    });
                    onAction('signup', {name, email, plan});
                }
            }
        });
    }

    handleChooseSignup(e, plan) {
        e.preventDefault();
        this.setState((state) => {
            return {
                errors: ValidateInputForm({fields: this.getInputFields({state})})
            };
        }, () => {
            const {onAction, site} = this.context;
            const {name, email, errors} = this.state;
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            if (!hasFormErrors) {
                if (hasMultipleNewsletters({site})) {
                    this.setState({
                        showNewsletterSelection: true,
                        pageData: {name, email, plan},
                        errors: {}
                    });
                } else {
                    onAction('signup', {name, email, plan});
                    this.setState({
                        errors: {}
                    });
                }
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
        const showOnlyFree = pageQuery === 'free' && hasFreeProductPrice({site});

        if (hasOnlyFreePlan({site}) || showOnlyFree) {
            label = 'Sign up';
        } else {
            return null;
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

    renderProducts() {
        const {site, pageQuery} = this.context;
        const products = getSiteProducts({site, pageQuery});
        return (
            <>
                <ProductsSection
                    handleChooseSignup={(...args) => this.handleChooseSignup(...args)}
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

    renderForm() {
        const fields = this.getInputFields({state: this.state});
        const {site, pageQuery} = this.context;

        if (this.state.showNewsletterSelection) {
            return (
                <NewsletterSelectionPage
                    pageData={this.state.pageData}
                    onBack={() => {
                        this.setState({
                            showNewsletterSelection: false
                        });
                    }}
                />
            );
        }

        if (isInviteOnlySite({site, pageQuery})) {
            return (
                <section>
                    <div className='gh-portal-section'>
                        <p className='gh-portal-invite-only-notification'>This site is invite-only, contact the owner for access.</p>
                        {this.renderLoginMessage()}
                    </div>
                </section>
            );
        }

        const freeBenefits = getFreeProductBenefits({site});
        const freeDescription = getFreeTierDescription({site});
        const showOnlyFree = pageQuery === 'free' && hasFreeProductPrice({site});
        const hasOnlyFree = hasOnlyFreeProduct({site}) || showOnlyFree;
        const sticky = !showOnlyFree && (freeBenefits.length || freeDescription);

        return (
            <section className="gh-portal-signup">
                <div className='gh-portal-section'>
                    <div className='gh-portal-logged-out-form-container'>
                        <InputForm
                            fields={fields}
                            onChange={(e, field) => this.handleInputChange(e, field)}
                            onKeyDown={e => this.onKeyDown(e)}
                        />
                    </div>
                    <div>
                        {this.renderProducts()}

                        {(hasOnlyFree ?
                            <div className={'gh-portal-btn-container' + (sticky ? ' sticky m24' : '')}>
                                <div className='gh-portal-logged-out-form-container'>
                                    {this.renderSubmitButton()}
                                    {this.renderLoginMessage()}
                                </div>
                            </div>
                            :
                            this.renderLoginMessage())}
                    </div>
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
                <h1 className="gh-portal-main-title">{siteTitle}</h1>
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
                sectionClass = freeHasBenefitsOrDescription({site}) ? 'singleplan' : 'noplan';
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

    render() {
        let {sectionClass} = this.getClassNames();
        return (
            <>
                <div className='gh-portal-back-sitetitle'>
                    <SiteTitleBackButton
                        onBack={() => {
                            if (this.state.showNewsletterSelection) {
                                this.setState({
                                    showNewsletterSelection: false
                                });
                            } else {
                                this.context.onAction('closePopup');
                            }
                        }}
                    />
                </div>
                <CloseButton />
                <div className={'gh-portal-content signup ' + sectionClass}>
                    {this.renderFormHeader()}
                    {this.renderForm()}
                </div>
                {/* <footer className={'gh-portal-signup-footer gh-portal-logged-out-form-container ' + footerClass}>
                    {this.renderSubmitButton()}
                    {this.renderLoginMessage()}
                </footer> */}
            </>
        );
    }
}

export default SignupPage;
