import {useContext, useState} from 'react';
import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import SiteTitleBackButton from '../common/site-title-back-button';
import InputForm from '../common/input-form';
import LoadingPage from './loading-page';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import {getAvailableProducts, getCurrencySymbol, formatNumber, getStripeAmount, isCookiesDisabled, getActiveInterval} from '../../utils/helpers';
import {ValidateInputForm} from '../../utils/form';
import calculateDiscount from '../../utils/discount';

// TODO: wrap strings with t() once copy is finalised
/* eslint-disable i18next/no-literal-string */

function GiftProductCardBenefits({product}) {
    if (!product.benefits || !product.benefits.length) {
        return null;
    }

    return (
        <div className="gh-portal-product-benefits">
            {product.benefits.map((benefit, idx) => {
                const key = benefit?.id || `benefit-${idx}`;

                return (
                    <div className="gh-portal-product-benefit" key={key}>
                        <CheckmarkIcon className='gh-portal-benefit-checkmark' alt='' />
                        <div className="gh-portal-benefit-title">{benefit.name}</div>
                    </div>
                );
            })}
        </div>
    );
}

function GiftProductCardPrice({product, selectedInterval}) {
    const monthlyPrice = product.monthlyPrice;
    const yearlyPrice = product.yearlyPrice;

    if (!monthlyPrice || !yearlyPrice) {
        return null;
    }

    const activePrice = selectedInterval === 'month' ? monthlyPrice : yearlyPrice;
    const currencySymbol = getCurrencySymbol(activePrice.currency);
    const yearlyDiscount = calculateDiscount(monthlyPrice.amount, yearlyPrice.amount);

    return (
        <div className="gh-portal-product-card-pricecontainer">
            <div className="gh-portal-product-card-price-trial">
                <div className="gh-portal-product-price">
                    <span className={'currency-sign' + (currencySymbol.length > 1 ? ' long' : '')}>{currencySymbol}</span>
                    <span className="amount" data-testid="product-amount">{formatNumber(getStripeAmount(activePrice.amount))}</span>
                </div>
                {selectedInterval === 'year' && yearlyDiscount > 0 && (
                    <span className="gh-portal-discount-label">{yearlyDiscount}% discount</span>
                )}
            </div>
            <div className="gh-portal-product-alternative-price" style={{display: 'block'}}>one-time payment</div>
        </div>
    );
}

function GiftProductCard({product, selectedInterval, onPurchase, disabled}) {
    let productDescription = product.description;

    if ((!product.benefits || !product.benefits.length) && !productDescription) {
        productDescription = 'Full access';
    }

    return (
        <div className='gh-portal-product-card' data-test-tier="paid">
            <div className='gh-portal-product-card-header'>
                <h4 className="gh-portal-product-name">{product.name}</h4>
                <GiftProductCardPrice product={product} selectedInterval={selectedInterval} />
            </div>
            <div className='gh-portal-product-card-details'>
                <div className='gh-portal-product-card-detaildata'>
                    {productDescription && (
                        <div className="gh-portal-product-description" data-testid="product-description">
                            {productDescription}
                        </div>
                    )}
                    <GiftProductCardBenefits product={product} />
                </div>
                <div className='gh-portal-btn-product'>
                    <button
                        data-test-button='purchase-gift'
                        className='gh-portal-btn'
                        disabled={disabled}
                        onClick={onPurchase}
                    >
                        Purchase gift
                    </button>
                </div>
            </div>
        </div>
    );
}

function GiftPriceSwitch({selectedInterval, setSelectedInterval, products}) {
    const {site} = useContext(AppContext);
    const {portal_plans: portalPlans} = site;
    const discounts = products.map(product => calculateDiscount(product.monthlyPrice?.amount, product.yearlyPrice?.amount));
    const highestDiscount = Math.max(...discounts);

    if (!portalPlans.includes('monthly') || !portalPlans.includes('yearly')) {
        return null;
    }

    return (
        <div className='gh-portal-logged-out-form-container'>
            <div className={'gh-portal-products-pricetoggle' + (selectedInterval === 'month' ? ' left' : '')}>
                <button
                    data-test-button='switch-monthly'
                    className={'gh-portal-btn' + (selectedInterval === 'month' ? ' active' : '')}
                    onClick={() => setSelectedInterval('month')}
                >
                    Monthly
                </button>
                <button
                    data-test-button='switch-yearly'
                    className={'gh-portal-btn' + (selectedInterval === 'year' ? ' active' : '')}
                    onClick={() => setSelectedInterval('year')}
                >
                    Yearly
                    {highestDiscount > 0 && <span className='gh-portal-maximum-discount'>(save {highestDiscount}%)</span>}
                </button>
            </div>
        </div>
    );
}

const GiftPage = () => {
    const {site, member} = useContext(AppContext);
    const [email, setEmail] = useState(member?.email || '');
    const [emailError, setEmailError] = useState('');
    const [selectedInterval, setSelectedInterval] = useState(null);

    if (!site) {
        return <LoadingPage />;
    }

    const {portal_plans: portalPlans, portal_default_plan: portalDefaultPlan} = site;

    const activeInterval = getActiveInterval({portalPlans, portalDefaultPlan, selectedInterval});

    const products = getAvailableProducts({site}).filter(p => p.type === 'paid');

    if (products.length === 0) {
        const siteIcon = site.icon;
        return (
            <>
                <div className='gh-portal-back-sitetitle'>
                    <SiteTitleBackButton />
                </div>
                <CloseButton />
                <div className='gh-portal-content signup'>
                    <header className='gh-portal-signup-header'>
                        {siteIcon && (
                            <img className='gh-portal-signup-logo' src={siteIcon} alt={site.title} />
                        )}
                        <h1 className="gh-portal-main-title">{site.title || ''}</h1>
                    </header>
                    <section>
                        <div className='gh-portal-section'>
                            <p className='gh-portal-invite-only-notification'>
                                Gift subscriptions are not available right now.
                            </p>
                        </div>
                    </section>
                </div>
            </>
        );
    }

    const siteIcon = site.icon;
    const siteTitle = site.title || '';
    const disabled = isCookiesDisabled();

    const emailField = [{
        type: 'email',
        value: email,
        placeholder: 'jamie@example.com',
        label: 'Your email',
        name: 'email',
        required: true,
        tabIndex: 1,
        autoFocus: true,
        errorMessage: emailError
    }];

    const handlePurchase = (e) => {
        e.preventDefault();

        const errors = ValidateInputForm({fields: emailField});

        if (errors.email) {
            setEmailError(errors.email);
            return;
        }

        setEmailError('');
        // TODO: implement gift checkout using priceId and email
    };

    return (
        <>
            <div className='gh-portal-back-sitetitle'>
                <SiteTitleBackButton />
            </div>
            <CloseButton />
            <div className='gh-portal-content signup'>
                <header className='gh-portal-signup-header'>
                    {siteIcon && (
                        <img className='gh-portal-signup-logo' src={siteIcon} alt={siteTitle} />
                    )}
                    <h1 className="gh-portal-main-title">{siteTitle}</h1>
                    <p className="gh-portal-main-subtitle">Give the gift of a membership</p>
                </header>

                <section className="gh-portal-signup">
                    <div className='gh-portal-section'>
                        <div className='gh-portal-logged-out-form-container'>
                            <InputForm
                                fields={emailField}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (emailError) {
                                        setEmailError('');
                                    }
                                }}
                            />
                        </div>

                        <section className='gh-portal-products'>
                            <GiftPriceSwitch
                                selectedInterval={activeInterval}
                                setSelectedInterval={setSelectedInterval}
                                products={products}
                            />
                            <div className="gh-portal-products-grid">
                                {products.map(product => (
                                    <GiftProductCard
                                        key={product.id}
                                        product={product}
                                        selectedInterval={activeInterval}
                                        onPurchase={handlePurchase}
                                        disabled={disabled}
                                    />
                                ))}
                            </div>
                        </section>

                        <div className='gh-portal-signup-message'>
                            <div>Gift can only be redeemed by members without an active paid subscription.</div>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default GiftPage;
