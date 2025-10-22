import {useState, useContext} from 'react';
import ActionButton from '../common/ActionButton';
import AppContext from '../../AppContext';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import CloseButton from '../common/CloseButton';
import InputForm from '../common/InputForm';
import {getCurrencySymbol, getProductFromId, hasMultipleProductsFeature, isSameCurrency, formatNumber, hasMultipleNewsletters} from '../../utils/helpers';
import {ValidateInputForm} from '../../utils/form';
import {interceptAnchorClicks} from '../../utils/links';
import NewsletterSelectionPage from './NewsletterSelectionPage';
import {t} from '../../utils/i18n';

export const OfferPageStyles = () => {
    return `
.gh-portal-offer {
    padding-bottom: 0;
    overflow: unset;
    max-height: unset;
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
    padding: 26px 28px 28px;
    margin-bottom: 24px;
    /*border: 1px dashed var(--brandcolor);*/
    background-image: url("data:image/svg+xml,%3csvg width='100%25' height='99.9%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%23C3C3C3' stroke-width='3' stroke-dasharray='3%2c 9' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e");
    background-color: var(--white);
    border-radius: 6px;
}

.gh-portal-offer-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.gh-portal-offer-title h4 {
    font-size: 1.8rem;
    margin: 0 110px 0 0;
    width: 100%;
}
html[dir="rtl"] .gh-portal-offer-title h4 {
    margin: 0 0 0 110px;
}

.gh-portal-offer-title h4.placeholder {
    opacity: 0.4;
}

.gh-portal-offer-bar .gh-portal-discount-label {
    position: absolute;
    top: 23px;
    right: 25px;
}

.gh-portal-offer-bar p {
    padding-bottom: 0;
    margin: 12px 0 0;
}

.gh-portal-offer-title h4 + p {
    margin: 12px 0 0;
}

.gh-portal-offer-details .gh-portal-plan-name,
.gh-portal-offer-details p {
    margin-inline-end: 8px;
}

.gh-portal-offer .footnote {
    font-size: 1.35rem;
    color: var(--grey8);
    margin: 4px 0 0;
}

.offer .gh-portal-product-card {
    max-width: unset;
    min-height: 0;
}

.offer .gh-portal-product-card .gh-portal-product-card-pricecontainer:not(.offer-type-trial) {
    margin-top: 0px;
}

.offer .gh-portal-product-card-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.gh-portal-offer-oldprice {
    display: flex;
    position: relative;
    font-size: 1.8rem;
    font-weight: 300;
    color: var(--grey8);
    line-height: 1;
    white-space: nowrap;
    margin: 16px 0 4px;
}

.gh-portal-offer-oldprice:after {
    position: absolute;
    display: block;
    content: "";
    left: 0;
    top: 50%;
    right: 0;
    height: 1px;
    background: var(--grey8);
}

.gh-portal-offer-details p {
    margin-bottom: 12px;
}

.offer .after-trial-amount {
    margin-bottom: 0;
}

.offer .trial-duration {
    margin-top: 16px;
}

.gh-portal-cancel {
    white-space: nowrap;
}

.gh-portal-offer .gh-portal-signup-terms-wrapper {
    margin: 8px auto 16px;
}

.gh-portal-offer .gh-portal-signup-terms.gh-portal-error {
    margin: 0;
}
    `;
};

const OfferPage = () => {
    const context = useContext(AppContext);
    const {member, site, pageData: offer, action, brandColor, doAction} = context;

    const [name, setName] = useState(member?.name || '');
    const [email, setEmail] = useState(member?.email || '');
    const [plan, setPlan] = useState('free');
    const [showNewsletterSelection, setShowNewsletterSelection] = useState(false);
    const [termsCheckboxChecked, setTermsCheckboxChecked] = useState(false);
    const [pageData, setPageData] = useState(null);
    const [errors, setErrors] = useState({});

    const getFormErrors = (state) => {
        const checkboxRequired = site.portal_signup_checkbox_required && site.portal_signup_terms_html;
        const checkboxError = checkboxRequired && !state.termsCheckboxChecked;

        return {
            ...ValidateInputForm({fields: getInputFields({state})}),
            checkbox: checkboxError
        };
    };

    const getInputFields = ({state, fieldNames}) => {
        const {portal_name: portalName} = site;
        const fieldErrors = state?.errors || {};
        const fields = [
            {
                type: 'email',
                value: member?.email || state?.email || email,
                placeholder: 'jamie@example.com',
                label: t('Email'),
                name: 'email',
                disabled: !!member,
                required: true,
                tabIndex: 2,
                errorMessage: fieldErrors.email || ''
            }
        ];

        /** Show Name field if portal option is set*/
        let showNameField = !!portalName;

        /** Hide name field for logged in member if empty */
        if (!!member && !member?.name) {
            showNameField = false;
        }

        if (showNameField) {
            fields.unshift({
                type: 'text',
                value: member?.name || state?.name || name,
                placeholder: t('Jamie Larson'),
                label: t('Name'),
                name: 'name',
                disabled: !!member,
                required: true,
                tabIndex: 1,
                errorMessage: fieldErrors.name || ''
            });
        }
        fields[0].autoFocus = true;
        if (fieldNames && fieldNames.length > 0) {
            return fields.filter((f) => {
                return fieldNames.includes(f.name);
            });
        }
        return fields;
    };

    const renderSignupTerms = () => {
        if (site.portal_signup_terms_html === null || site.portal_signup_terms_html === '') {
            return null;
        }

        const handleCheckboxChange = (e) => {
            setTermsCheckboxChecked(e.target.checked);
        };

        const termsText = (
            <div className="gh-portal-signup-terms-content"
                dangerouslySetInnerHTML={{__html: site.portal_signup_terms_html}}
            ></div>
        );

        const signupTerms = site.portal_signup_checkbox_required ? (
            <label>
                <input
                    type="checkbox"
                    checked={!!termsCheckboxChecked}
                    required={true}
                    onChange={handleCheckboxChange}
                />
                <span className="checkbox"></span>
                {termsText}
            </label>
        ) : termsText;

        const errorClassName = errors?.checkbox ? 'gh-portal-error' : '';

        const className = `gh-portal-signup-terms ${errorClassName}`;

        return (
            <div className={className} onClick={interceptAnchorClicks}>
                {signupTerms}
            </div>
        );
    };

    const onKeyDown = (e) => {
        // Handles submit on Enter press
        if (e.keyCode === 13){
            handleSignup(e);
        }
    };

    const handleSignup = (e) => {
        e.preventDefault();
        if (!offer) {
            return null;
        }
        const product = getProductFromId({site, productId: offer.tier.id});
        const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;

        const currentState = {name, email, termsCheckboxChecked, errors};
        const formErrors = getFormErrors(currentState);
        setErrors(formErrors);

        const hasFormErrors = (formErrors && Object.values(formErrors).filter(d => !!d).length > 0);
        if (!hasFormErrors) {
            const signupData = {
                name,
                email,
                plan: price?.id,
                offerId: offer?.id,
                phonenumber: undefined
            };
            if (hasMultipleNewsletters({site})) {
                setShowNewsletterSelection(true);
                setPageData(signupData);
                setErrors({});
            } else {
                doAction('signup', signupData);
                setErrors({});
            }
        }
    };

    const handleInputChange = (e, field) => {
        const fieldName = field.name;
        const value = e.target.value;
        if (fieldName === 'name') {
            setName(value);
        } else if (fieldName === 'email') {
            setEmail(value);
        }
    };

    const renderSiteLogo = () => {
        const siteLogo = site.icon;

        const logoStyle = {};

        if (siteLogo) {
            logoStyle.backgroundImage = `url(${siteLogo})`;
            return (
                <img className='gh-portal-signup-logo' src={siteLogo} alt={site.title} />
            );
        }
        return null;
    };

    const renderFormHeader = () => {
        const siteTitle = site.title || '';
        return (
            <header className='gh-portal-signup-header'>
                {renderSiteLogo()}
                <h2 className="gh-portal-main-title">{siteTitle}</h2>
            </header>
        );
    };

    const renderForm = () => {
        const currentState = {name, email, termsCheckboxChecked, errors};
        const fields = getInputFields({state: currentState});

        if (showNewsletterSelection) {
            return (
                <NewsletterSelectionPage
                    pageData={pageData}
                    onBack={() => {
                        setShowNewsletterSelection(false);
                    }}
                />
            );
        }

        return (
            <section>
                <div className='gh-portal-section'>
                    <InputForm
                        fields={fields}
                        onChange={(e, field) => handleInputChange(e, field)}
                        onKeyDown={e => onKeyDown(e)}
                    />
                </div>
            </section>
        );
    };

    const renderSubmitButton = () => {
        let label = t('Continue');

        if (offer.type === 'trial') {
            label = t('Start {amount}-day free trial', {amount: offer.amount});
        }

        let isRunning = false;
        if (action === 'signup:running') {
            label = t('Sending...');
            isRunning = true;
        }
        let retry = false;
        if (action === 'signup:failed') {
            label = t('Retry');
            retry = true;
        }

        const disabled = (action === 'signup:running') ? true : false;
        return (
            <ActionButton
                style={{width: '100%'}}
                retry={retry}
                onClick={e => handleSignup(e)}
                disabled={disabled}
                brandColor={brandColor}
                label={label}
                isRunning={isRunning}
                tabIndex={3}
                classes={'sticky bottom'}
            />
        );
    };

    const renderLoginMessage = () => {
        if (member) {
            return null;
        }
        return (
            <div className='gh-portal-signup-message'>
                <div>{t('Already a member?')}</div>
                <button
                    className='gh-portal-btn gh-portal-btn-link'
                    style={{color: brandColor}}
                    onClick={() => doAction('switchPage', {page: 'signin'})}
                >
                    <span>{t('Sign in')}</span>
                </button>
            </div>
        );
    };

    const renderOfferTag = () => {
        if (offer.amount <= 0) {
            return (
                <></>
            );
        }

        if (offer.type === 'fixed') {
            return (
                <h5 className="gh-portal-discount-label">{t('{amount} off', {
                    amount: `${getCurrencySymbol(offer.currency)}${offer.amount / 100}`
                })}</h5>
            );
        }

        if (offer.type === 'trial') {
            return (
                <h5 className="gh-portal-discount-label">{t('{amount} days free', {amount: offer.amount})}</h5>
            );
        }

        return (
            <h5 className="gh-portal-discount-label">{t('{amount} off', {amount: offer.amount + '%'})}</h5>
        );
    };

    const renderBenefits = ({product}) => {
        const benefits = product.benefits || [];
        if (!benefits?.length) {
            return;
        }
        const benefitsUI = benefits.map((benefit, idx) => {
            return (
                <div className="gh-portal-product-benefit" key={`${benefit.name}-${idx}`}>
                    <CheckmarkIcon className='gh-portal-benefit-checkmark' />
                    <div className="gh-portal-benefit-title">{benefit.name}</div>
                </div>
            );
        });
        return (
            <div className="gh-portal-product-benefits">
                {benefitsUI}
            </div>
        );
    };

    const renderRoundedPrice = (price) => {
        if (price % 1 !== 0) {
            const roundedPrice = Math.round(price * 100) / 100;
            return Number(roundedPrice).toFixed(2);
        }
        return price;
    };

    const getOriginalPrice = ({offer, product}) => {
        const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;
        const originalAmount = renderRoundedPrice(price.amount / 100);
        return `${getCurrencySymbol(price.currency)}${originalAmount}/${offer.cadence}`;
    };

    const getUpdatedPrice = ({offer, product}) => {
        const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;
        const originalAmount = price.amount;
        let updatedAmount;
        if (offer.type === 'fixed' && isSameCurrency(offer.currency, price.currency)) {
            updatedAmount = ((originalAmount - offer.amount)) / 100;
            return updatedAmount > 0 ? updatedAmount : 0;
        } else if (offer.type === 'percent') {
            updatedAmount = (originalAmount - ((originalAmount * offer.amount) / 100)) / 100;
            return updatedAmount;
        }
        return originalAmount / 100;
    };

    const getOffAmount = ({offer}) => {
        if (offer.type === 'fixed') {
            return `${getCurrencySymbol(offer.currency)}${offer.amount / 100}`;
        } else if (offer.type === 'percent') {
            return `${offer.amount}%`;
        } else if (offer.type === 'trial') {
            return offer.amount;
        }
        return '';
    };

    const renderOfferMessage = ({offer, product}) => {
        const offerMessages = {
            forever: t(`{amount} off forever.`, {
                amount: getOffAmount({offer})
            }),
            firstPeriod: t(`{amount} off for first {period}.`, {
                amount: getOffAmount({offer}),
                period: offer.cadence
            }),
            firstNMonths: t(`{amount} off for first {number} months.`, {
                amount: getOffAmount({offer}),
                number: offer.duration_in_months || ''
            })
        };

        const originalPrice = getOriginalPrice({offer, product});
        const renewsLabel = t(`Renews at {price}.`, {price: originalPrice, interpolation: {escapeValue: false}});

        let offerLabel = '';
        let useRenewsLabel = false;
        const discountDuration = offer.duration;
        if (discountDuration === 'once') {
            offerLabel = offerMessages.firstPeriod;
            useRenewsLabel = true;
        } else if (discountDuration === 'forever') {
            offerLabel = offerMessages.forever;
        } else if (discountDuration === 'repeating') {
            const durationInMonths = offer.duration_in_months || '';
            if (durationInMonths === 1) {
                offerLabel = offerMessages.firstPeriod;
            } else {
                offerLabel = offerMessages.firstNMonths;
            }
            useRenewsLabel = true;
        }
        if (discountDuration === 'trial') {
            return (
                <p className="footnote">{t('Try free for {amount} days, then {originalPrice}.', {
                    amount: offer.amount,
                    originalPrice: originalPrice,
                    interpolation: {escapeValue: false}
                })} <span className="gh-portal-cancel">{t('Cancel anytime.')}</span></p>
            );
        }
        return (
            <p className="footnote">{offerLabel} {useRenewsLabel ? renewsLabel : ''}</p>
        );
    };

    const renderProductLabel = ({product, offer}) => {
        if (hasMultipleProductsFeature({site})) {
            return (
                <h4 className="gh-portal-plan-name">{product.name} - {(offer.cadence === 'month' ? t('Monthly') : t('Yearly'))}</h4>
            );
        }
        return (
            <h4 className="gh-portal-plan-name">{(offer.cadence === 'month' ? t('Monthly') : t('Yearly'))}</h4>
        );
    };

    const renderUpdatedTierPrice = ({offer, currencyClass, updatedPrice, price}) => {
        if (offer.type === 'trial') {
            return (
                <div className="gh-portal-product-card-pricecontainer offer-type-trial">
                    <div className="gh-portal-product-price">
                        <span className={'currency-sign ' + currencyClass}>{getCurrencySymbol(price.currency)}</span>
                        <span className="amount">{formatNumber(renderRoundedPrice(updatedPrice))}</span>
                    </div>
                </div>
            );
        }
        return (
            <div className="gh-portal-product-card-pricecontainer">
                <div className="gh-portal-product-price">
                    <span className={'currency-sign ' + currencyClass}>{getCurrencySymbol(price.currency)}</span>
                    <span className="amount">{formatNumber(renderRoundedPrice(updatedPrice))}</span>
                </div>
            </div>
        );
    };

    const renderOldTierPrice = ({offer, price}) => {
        if (offer.type === 'trial') {
            return null;
        }
        return (
            <div className="gh-portal-offer-oldprice">{getCurrencySymbol(price.currency)} {formatNumber(price.amount / 100)}</div>
        );
    };

    const renderProductCard = ({product, offer, currencyClass, updatedPrice, price, benefits}) => {
        if (showNewsletterSelection) {
            return null;
        }
        return (
            <>
                <div className='gh-portal-product-card top'>
                    <div className='gh-portal-product-card-header'>
                        <h4 className="gh-portal-product-name">{product.name} - {(offer.cadence === 'month' ? t('Monthly') : t('Yearly'))}</h4>
                        {renderOldTierPrice({offer, price})}
                        {renderUpdatedTierPrice({offer, currencyClass, updatedPrice, price})}
                        {renderOfferMessage({offer, product, price})}
                    </div>
                </div>

                <div>
                    <div className='gh-portal-product-card bottom'>
                        <div className='gh-portal-product-card-detaildata'>
                            {(product.description ? <div className="gh-portal-product-description">{product.description}</div> : '')}
                            {(benefits.length ? renderBenefits({product}) : '')}
                        </div>
                    </div>

                    <div className='gh-portal-btn-container sticky m32'>
                        <div className='gh-portal-signup-terms-wrapper'>
                            {renderSignupTerms()}
                        </div>
                        {renderSubmitButton()}
                    </div>
                    {renderLoginMessage()}
                </div>
            </>
        );
    };

    if (!offer) {
        return null;
    }
    const product = getProductFromId({site, productId: offer.tier.id});
    if (!product) {
        return null;
    }
    const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;
    const updatedPrice = getUpdatedPrice({offer, product});
    const benefits = product.benefits || [];

    const currencyClass = (getCurrencySymbol(price.currency)).length > 1 ? 'long' : '';

    return (
        <>
            <div className='gh-portal-content gh-portal-offer'>
                <CloseButton />
                {renderFormHeader()}

                <div className="gh-portal-offer-bar">
                    <div className="gh-portal-offer-title">
                        {(offer.display_title ? <h4>{offer.display_title}</h4> : <h4 className='placeholder'>{t('Black Friday')}</h4>)}
                        {renderOfferTag()}
                    </div>
                    {(offer.display_description ? <p>{offer.display_description}</p> : '')}
                </div>

                {renderForm()}
                {renderProductCard({product, offer, currencyClass, updatedPrice, price, benefits})}
            </div>
        </>
    );
};

export default OfferPage;
