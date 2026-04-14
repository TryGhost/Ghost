import {useContext, useState} from 'react';
import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import SiteTitleBackButton from '../common/site-title-back-button';
import ActionButton from '../common/action-button';
import LoadingPage from './loading-page';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import {getAvailableProducts, getCurrencySymbol, formatNumber, getStripeAmount, isCookiesDisabled, getActiveInterval} from '../../utils/helpers';
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
            <span style={{display: 'block', opacity: '0.5'}}>one-time payment</span>
        </div>
    );
}

function GiftProductCard({brandColor, product, selectedInterval, isDisabled, isPurchasing, onPurchase}) {
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
                    <ActionButton
                        dataTestId='purchase-gift'
                        label={<><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'middle'}}><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg> Gift this</>}
                        onClick={e => onPurchase(e, product)}
                        disabled={isDisabled}
                        isRunning={isPurchasing}
                        brandColor={brandColor}
                        style={{width: '100%'}}
                    />
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
                    1 month
                </button>
                <button
                    data-test-button='switch-yearly'
                    className={'gh-portal-btn' + (selectedInterval === 'year' ? ' active' : '')}
                    onClick={() => setSelectedInterval('year')}
                >
                    1 year
                    {highestDiscount > 0 && <span className='gh-portal-maximum-discount'>(save {highestDiscount}%)</span>}
                </button>
            </div>
        </div>
    );
}

const GiftPage = () => {
    const {site, brandColor, action, doAction} = useContext(AppContext);
    const [selectedInterval, setSelectedInterval] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);

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
    const isPurchasing = action === 'checkoutGift:running';
    const isDisabled = isCookiesDisabled() || isPurchasing;

    const handlePurchase = (e, product) => {
        e.preventDefault();

        setSelectedProduct(product.id);

        doAction('checkoutGift', {
            tierId: product.id,
            cadence: activeInterval
        });
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
                    <p className="gh-portal-main-subtitle" style={{fontSize: '1.7rem', marginTop: '8px'}}>Give the gift of a membership</p>
                </header>

                <section className="gh-portal-signup">
                    <div className='gh-portal-section'>
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
                                        brandColor={brandColor}
                                        product={product}
                                        selectedInterval={activeInterval}
                                        isDisabled={isDisabled}
                                        isPurchasing={isPurchasing && selectedProduct === product.id}
                                        onPurchase={handlePurchase}
                                    />
                                ))}
                            </div>
                        </section>

                        <div className='gh-portal-signup-message'>
                            <div>Only redeemable by free or new members.</div>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default GiftPage;
