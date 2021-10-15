import ActionButton from '../common/ActionButton';
import AppContext from '../../AppContext';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import CloseButton from '../common/CloseButton';
import InputForm from '../common/InputForm';
import {getCurrencySymbol, getProductFromId} from '../../utils/helpers';
const React = require('react');

export const OfferPageStyles = `
    .gh-portal-offer {
        padding-bottom: 0;
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
        padding: 12px 16px;
    }

    .gh-portal-offer-bar::before {
        border-radius: 5px 5px 0 0;
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

    .gh-portal-offer-tag {
        position: absolute;
        top: 10px;
        right: 0;
        background: var(--brandcolor);
        color: #fff;
        padding: 4px 8px 4px 12px;
        font-weight: 500;
        font-size: 1.2rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-radius: 999px 0 0 999px;
    }

    .gh-portal-offer-details .gh-portal-plan-name,
    .gh-portal-offer-details p {
        margin-right: 8px;
    }

    .gh-portal-offer-price {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        padding-left: 20px;
    }

    .gh-portal-offer-price .old {
        text-decoration: line-through;
        color: var(--grey8);
        line-height: 1.4;
    }

    .gh-portal-offer-price .new {
        display: flex;
        align-items: flex-start;
        margin-top: 6px;
    }

    .gh-portal-offer-price .new .currency {
        font-weight: 500;
        line-height: 1.3;
        font-size: 1.5rem;
        margin-right: 1px;
    }

    .gh-portal-offer-price .new .value {
        font-size: 2.4rem;
        font-weight: 500;
    }

    .gh-portal-offer-details p {
        margin-bottom: 12px;
    }

    .gh-portal-offer-details .footnote {
        color: var(--grey7);
        margin-bottom: 0;
    }

    .gh-portal-offer .gh-portal-product-benefit {
        margin-bottom: 4px;
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

    onKeyDown(e) {
        // Handles submit on Enter press
        if (e.keyCode === 13){
            this.handleSignup(e);
        }
    }

    handleSignup(e) {
        return;
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
        const originalAmount = price.amount / 100;
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

    getOffAmount({offer}) {
        if (offer.type === 'fixed') {
            return `${getCurrencySymbol(offer.currency)}${offer.amount / 100}`;
        } else if (offer.type === 'percent') {
            return `${offer.amount}%`;
        }
        return '';
    }

    render() {
        const {pageData: offer, site} = this.context;
        if (!offer) {
            return null;
        }
        const product = getProductFromId({site, productId: offer.tier.id});
        const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;
        return (
            <>
                <div className='gh-portal-content gh-portal-offer'>
                    <CloseButton />
                    {this.renderFormHeader()}
                    {this.renderForm()}

                    <div className="gh-portal-offer-container">
                        <div className="gh-portal-offer-bar">
                            <h4 className="gh-portal-plan-name">{offer.display_title}</h4>
                            {this.renderOfferTag()}
                            <p>{offer.display_description}</p>
                        </div>
                        <div className="gh-portal-plans-container offer">
                            <div className="gh-portal-offer-details">
                                <h4 className="gh-portal-plan-name">{product.name} - {(offer.cadence === 'month' ? 'Monthly' : 'Yearly')}</h4>
                                <p>{product.description}</p>
                                {this.renderBenefits({product})}
                                <p className="footnote">{this.getOffAmount({offer})} off for first year. Renews at {this.getOriginalPrice({offer, product})}</p>
                            </div>
                            <div className="gh-portal-offer-price">
                                <div className="old">{getCurrencySymbol(price.currency)}{price.amount / 100}</div>
                                <div className="new">
                                    <span className="currency">{getCurrencySymbol(price.currency)}</span>
                                    <span className="value">{this.getUpdatedPrice({offer, product})}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <footer className='gh-portal-signup-footer'>
                    {this.renderSubmitButton()}
                    {this.renderLoginMessage()}
                </footer>
            </>
        );
    }
}
