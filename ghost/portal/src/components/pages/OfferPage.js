import ActionButton from '../common/ActionButton';
import AppContext from '../../AppContext';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import CloseButton from '../common/CloseButton';
import InputForm from '../common/InputForm';
import {getCurrencySymbol, getProductFromId, hasMultipleProductsFeature} from '../../utils/helpers';
import {ValidateInputForm} from '../../utils/form';
const React = require('react');

export const OfferPageStyles = `
    .gh-portal-offer {
        padding-bottom: 0;
        overflow: unset;
        max-height: unset;
    }

    .gh-portal-offer h4 {
        color: var(--grey0);
        margin: 0 0 7px;
    }

    .gh-portal-offer p {
        color: var(--grey3);
        font-size: 1.25rem;
        font-weight: 400;
        margin: 0 0 6px;
    }

    .gh-portal-offer-container {
        display: flex;
        flex-direction: column;
    }

    .gh-portal-plans-container.offer {
        justify-content: space-between;
        border-color: var(--grey12);
        border-top: none;
        border-top-left-radius: 0;
        border-top-right-radius: 0;
        padding: 12px 16px;
        font-size: 1.3rem;
    }

    .gh-portal-offer-bar {
        position: relative;
        padding: 20px;
        margin-bottom: 24px;
    }

    .gh-portal-offer-bar::before {
        border-radius: 5px;
        position: absolute;
        display: block;
        content: "";
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background-color: var(--brandcolor);
        opacity: 0.1;
        z-index: -1;
    }

    .gh-portal-offer-title {
        display: flex;
        justify-content: space-between;
        margin-right: -20px;
    }

    .gh-portal-offer-title h4 {
        font-weight: 500;
        font-size: 1.7rem;
        margin-bottom: 0;
        line-height: 1.3em;
    }

    .gh-portal-offer-tag {
        background: var(--brandcolor);
        color: #fff;
        padding: 4px 8px 4px 12px;
        font-weight: 500;
        font-size: 1.2rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-radius: 999px 0 0 999px;
        max-height: 22px;
        white-space: nowrap;
    }

    .gh-portal-offer-bar p {
        padding-bottom: 0;
        font-size: 1.35rem;
    }

    .gh-portal-offer-title h4 + p {
        margin: 12px 0 0;
    }

    .gh-portal-offer-details .gh-portal-plan-name,
    .gh-portal-offer-details p {
        margin-right: 8px;
    }

    .gh-portal-offer .gh-portal-plan-section {
        cursor: auto;
        padding: 20px;
        flex-direction: row;
        justify-content: space-between;
    }

    .gh-portal-offer .gh-portal-plan-section:before {
        display: none;
    }

    .gh-portal-offer-container.bordered {
        border: 1px solid var(--grey11) !important;
        border-radius: 5px;
        margin-bottom: 5px;
    }

    .gh-portal-offer-container.bordered p.footnote {
        margin: 0;
    }

    .gh-portal-offer-container.bordered .gh-portal-plan-section {
        padding: 12px 20px;
    }

    .gh-portal-offer-planname {
        padding-right: 20px;
    }

    .gh-portal-offer .gh-portal-plan-name {
        margin: 0;
        text-align: left;
        line-height: 1.5em;
    }

    .gh-portal-offer .footnote {
        color: var(--grey7);
        margin: 0 0 12px;
    }

    .gh-portal-offer-price {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        margin: 0;
    }

    .gh-portal-offer-price .old {
        text-decoration: line-through;
        color: var(--grey5);
        line-height: 1;
        white-space: nowrap;
    }

    .gh-portal-offer-price .new {
        display: flex;
        align-items: flex-start;
        margin-top: 6px;
        white-space: nowrap;
    }

    .gh-portal-offer-price .new .currency {
        font-weight: 500;
        line-height: 1;
        font-size: 1.5rem;
        margin-right: 1px;
        white-space: nowrap;
    }

    .gh-portal-offer-price .new .value {
        font-size: 2.4rem;
        font-weight: 500;
        white-space: nowrap;
    }

    .gh-portal-offer-details p {
        margin-bottom: 12px;
    }

    .gh-portal-offer .gh-portal-product-benefit {
        margin-bottom: 4px;
    }

    .gh-portal-offer .gh-portal-singleproduct-benefits {
        padding: 16px 20px 12px !important
    }

    .gh-portal-offer .gh-portal-singleproduct-benefits:not(.no-benefits) .gh-portal-product-description {
        text-align: left;
        padding-left: 0;
    }

    .gh-portal-offer .gh-portal-singleproduct-benefits .gh-portal-product-benefit {
        padding: 0;
    }

    .gh-portal-offer .gh-portal-singleproduct-benefits:not(.no-benefits) .gh-portal-product-description {
        border: none;
        padding-bottom: 0;
    }

    .gh-portal-offer .gh-portal-product-benefits {
        padding-bottom: 0;
    }

    .gh-portal-offer-planname .gh-portal-offer-tag {
        display: inline-block;
        border-radius: 0 999px 999px 0;
        margin: -8px 0 0 -20px;
        padding-left: 20px;
    }
`;

export default class OfferPage extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            name: '',
            email: '',
            plan: 'free'
        };
    }

    getInputFields({state, fieldNames}) {
        const {portal_name: portalName} = this.context.site;
        const {member} = this.context;
        const errors = state.errors || {};
        const fields = [
            {
                type: 'email',
                value: member?.email || state.email,
                placeholder: 'jamie@example.com',
                label: 'Email',
                name: 'email',
                disabled: !!member,
                required: true,
                tabindex: 2,
                errorMessage: errors.email || ''
            }
        ];

        /** Show Name field if portal option is set*/
        if (portalName) {
            fields.unshift({
                type: 'text',
                value: member?.name || state.name,
                placeholder: 'Jamie Larson',
                label: 'Name',
                name: 'name',
                disabled: !!member,
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

    onKeyDown(e) {
        // Handles submit on Enter press
        if (e.keyCode === 13){
            this.handleSignup(e);
        }
    }

    handleSignup(e) {
        e.preventDefault();
        const {pageData: offer, site} = this.context;
        if (!offer) {
            return null;
        }
        const product = getProductFromId({site, productId: offer.tier.id});
        const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;
        this.setState((state) => {
            return {
                errors: ValidateInputForm({fields: this.getInputFields({state})})
            };
        }, () => {
            const {onAction} = this.context;
            const {name, email, errors} = this.state;
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            if (!hasFormErrors) {
                onAction('signup', {
                    name, email, plan: price?.id,
                    offerId: offer?.id
                });
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

    renderSiteLogo() {
        const {site} = this.context;

        const siteLogo = site.icon;

        const logoStyle = {};

        if (siteLogo) {
            logoStyle.backgroundImage = `url(${siteLogo})`;
            return (
                <img className='gh-portal-signup-logo' src={siteLogo} alt={site.title} />
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

    renderForm() {
        const fields = this.getInputFields({state: this.state});

        return (
            <section>
                <div className='gh-portal-section'>
                    <InputForm
                        fields={fields}
                        onChange={(e, field) => this.handleInputChange(e, field)}
                        onKeyDown={e => this.onKeyDown(e)}
                    />
                </div>
            </section>
        );
    }

    renderSubmitButton() {
        const {action, brandColor} = this.context;
        let label = 'Continue';

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

    renderLoginMessage() {
        const {member} = this.context;
        if (member) {
            return null;
        }
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

    renderOfferTag() {
        const {pageData: offer} = this.context;
        if (offer.type === 'fixed') {
            return (
                <h5 className="gh-portal-offer-tag">{getCurrencySymbol(offer.currency)}{offer.amount / 100} off</h5>
            );
        }
        return (
            <h5 className="gh-portal-offer-tag">{offer.amount}% off</h5>
        );
    }

    renderBenefits({product}) {
        const benefits = product.benefits || [];
        if (!benefits?.length) {
            return;
        }
        const benefitsUI = benefits.map((benefit, idx) => {
            return (
                <div className="gh-portal-product-benefit" key={`${benefit.name}-${idx}`}>
                    <CheckmarkIcon className='gh-portal-benefit-checkmark' />
                    <span className="gh-portal-product-benefit">{benefit.name}</span>
                </div>
            );
        });
        return (
            <div className="gh-portal-product-benefits">
                {benefitsUI}
            </div>
        );
    }

    getOriginalPrice({offer, product}) {
        const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;
        const originalAmount = this.renderRoundedPrice(price.amount / 100);
        return `${getCurrencySymbol(price.currency)}${originalAmount}/${offer.cadence}`;
    }

    getUpdatedPrice({offer, product}) {
        const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;
        const originalAmount = price.amount;
        let updatedAmount;
        if (offer.type === 'fixed' && offer.currency === price.currency) {
            updatedAmount = ((originalAmount - offer.amount)) / 100;
            return updatedAmount > 0 ? updatedAmount : 0;
        } else if (offer.type === 'percent') {
            updatedAmount = (originalAmount - ((originalAmount * offer.amount) / 100)) / 100;
            return updatedAmount;
        }
        return originalAmount / 100;
    }

    renderRoundedPrice(price) {
        if (price % 1 !== 0) {
            const roundedPrice = Math.round(price * 100) / 100;
            return Number(roundedPrice).toFixed(2);
        }
        return price;
    }

    getOffAmount({offer}) {
        if (offer.type === 'fixed') {
            return `${getCurrencySymbol(offer.currency)}${offer.amount / 100}`;
        } else if (offer.type === 'percent') {
            return `${offer.amount}%`;
        }
        return '';
    }

    renderOfferMessage({offer, product}) {
        const discountDuration = offer.duration;
        let durationLabel = '';
        const originalPrice = this.getOriginalPrice({offer, product});
        let renewsLabel = '';
        if (discountDuration === 'once') {
            durationLabel = `for first ${offer.cadence}`;
            renewsLabel = `Renews at ${originalPrice}.`;
        } else if (discountDuration === 'forever') {
            durationLabel = `forever`;
        } else if (discountDuration === 'repeating') {
            const durationInMonths = offer.duration_in_months || '';
            if (durationInMonths === 1) {
                durationLabel = `for first month`;
            } else {
                durationLabel = `for first ${durationInMonths} months`;
            }
            renewsLabel = `Renews at ${originalPrice}.`;
        }
        return (
            <p className="footnote">{this.getOffAmount({offer})} off {durationLabel}. {renewsLabel}</p>
        );
    }

    renderProductLabel({product, offer}) {
        const {site} = this.context;

        if (hasMultipleProductsFeature({site})) {
            return (
                <h4 className="gh-portal-plan-name">{product.name} - {(offer.cadence === 'month' ? 'Monthly' : 'Yearly')}</h4>
            );
        }
        return (
            <h4 className="gh-portal-plan-name">{(offer.cadence === 'month' ? 'Monthly' : 'Yearly')}</h4>
        );
    }

    render() {
        const {pageData: offer, site} = this.context;
        if (!offer) {
            return null;
        }
        const product = getProductFromId({site, productId: offer.tier.id});
        const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;
        const updatedPrice = this.getUpdatedPrice({offer, product});
        const benefits = product.benefits || [];
        let planNameContainerClass = 'gh-portal-plans-container gh-portal-offer-container has-multiple-products';
        planNameContainerClass += !benefits.length && !product.description ? ' bordered' : '';
        return (
            <>
                <div className='gh-portal-content gh-portal-offer'>
                    <CloseButton />
                    {this.renderFormHeader()}

                    {(offer.display_title || offer.display_description ?
                        <div className="gh-portal-offer-bar">
                            <div className="gh-portal-offer-title">
                                <div>
                                    {(offer.display_title ?
                                        <h4>{offer.display_title}</h4>
                                        : '')}

                                    {(offer.display_description ? <p>{offer.display_description}</p> : '')}
                                </div>

                                {this.renderOfferTag()}
                            </div>
                        </div>
                        : '')}

                    {this.renderForm()}

                    <div className={planNameContainerClass}>
                        <div className="gh-portal-plan-section">
                            <div className="gh-portal-offer-planname">
                                {(!offer.display_title && !offer.display_description ?
                                    this.renderOfferTag()
                                    : '')}
                                <h4 className="gh-portal-plan-name">{product.name} - {(offer.cadence === 'month' ? 'Monthly' : 'Yearly')}</h4>
                                {(!benefits.length && !product.description ?
                                    this.renderOfferMessage({offer, product})
                                    : '')}
                            </div>
                            <div className="gh-portal-plan-pricelabel">
                                <div className="gh-portal-plan-pricecontainer">
                                    <div className="gh-portal-offer-price">
                                        <div className="old">{getCurrencySymbol(price.currency)}{price.amount / 100}</div>
                                        <div className="new">
                                            <span className="currency">{getCurrencySymbol(price.currency)}</span>
                                            <span className="value">{this.renderRoundedPrice(updatedPrice)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {(benefits.length || product.description ?
                        <div className="gh-portal-singleproduct-benefits gh-portal-product-benefits">
                            {(product.description ?
                                <div className="gh-portal-product-description">{product.description}</div>
                                : '')}

                            {(benefits.length ?
                                this.renderBenefits({product})
                                : '')}

                            {this.renderOfferMessage({offer, product})}
                        </div>
                        : '')}
                </div>
                <footer className='gh-portal-signup-footer'>
                    {this.renderSubmitButton()}
                    {this.renderLoginMessage()}
                </footer>
            </>
        );
    }
}
