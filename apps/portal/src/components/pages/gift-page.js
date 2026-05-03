import {useContext, useState} from 'react';
import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import SiteTitleBackButton from '../common/site-title-back-button';
import ActionButton from '../common/action-button';
import LoadingPage from './loading-page';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import {ReactComponent as GiftIcon} from '../../images/icons/gift.svg';
import {getAvailableProducts, getCurrencySymbol, formatNumber, getStripeAmount, isCookiesDisabled, getActiveInterval} from '../../utils/helpers';
import calculateDiscount from '../../utils/discount';

// TODO: wrap strings with t() once copy is finalised
/* eslint-disable i18next/no-literal-string */

export const GiftPageStyles = `
.gh-portal-content.gift {
    position: relative;
    padding-top: 0;
}

.gh-portal-gift-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 320px;
    background: linear-gradient(180deg, var(--brandcolor), transparent);
    opacity: 0.08;
    pointer-events: none;
    z-index: 0;
}

.gh-portal-popup-wrapper.full-size .gh-portal-gift-bg {
    top: -2vmin;
    left: -6vmin;
    right: -6vmin;
    height: calc(320px + 2vmin);
}

.gh-portal-gift-sitetitle {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 15px 32px 0;
}

.gh-portal-gift-sitetitle-icon {
    display: block;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    background-position: 50%;
    background-size: cover;
    object-fit: cover;
}

.gh-portal-gift-sitetitle-name {
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--grey0);
    line-height: 1;
}

.gh-portal-gift-hero {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 56px 32px 40px;
}

.gh-portal-gift-hero-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    color: var(--brandcolor);
    margin-bottom: 20px;
}

.gh-portal-gift-hero-icon svg {
    width: 48px;
    height: 48px;
    stroke-width: 1.5;
}

.gh-portal-gift-hero .gh-portal-main-title {
    margin: 0 0 14px;
}

.gh-portal-gift-hero .gh-portal-main-subtitle {
    margin: 0;
    font-size: 1.7rem;
    line-height: 1.45em;
    color: var(--grey3);
    text-align: center;
}

.gh-portal-content.gift > section {
    position: relative;
    z-index: 1;
}

.gh-portal-popup-wrapper.gift .gh-portal-btn-site-title-back {
    background: transparent;
    border-color: transparent;
}

.gh-portal-popup-wrapper.gift .gh-portal-btn-site-title-back:hover {
    border-color: transparent;
}

@media (max-width: 480px) {
    .gh-portal-gift-hero {
        padding: 40px 24px 32px;
    }

    .gh-portal-gift-bg {
        height: 240px;
    }
}
`;

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
                        label='Continue'
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

    const siteIcon = site.icon;
    const siteTitle = site.title || '';

    const giftPageHeader = (
        <>
            <div className='gh-portal-gift-bg' aria-hidden='true' />
            <div className='gh-portal-gift-sitetitle'>
                {siteIcon && (
                    <img className='gh-portal-gift-sitetitle-icon' src={siteIcon} alt='' />
                )}
                <span className='gh-portal-gift-sitetitle-name'>{siteTitle}</span>
            </div>
            <div className='gh-portal-gift-hero'>
                <div className='gh-portal-gift-hero-icon'>
                    <GiftIcon />
                </div>
                <h1 className='gh-portal-main-title'>Gift a membership</h1>
                <p className='gh-portal-main-subtitle'>Share a full membership to {siteTitle} with a friend or colleague</p>
            </div>
        </>
    );

    if (products.length === 0) {
        return (
            <>
                <div className='gh-portal-back-sitetitle'>
                    <SiteTitleBackButton />
                </div>
                <CloseButton />
                <div className='gh-portal-content signup gift'>
                    {giftPageHeader}
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
            <div className='gh-portal-content signup gift'>
                {giftPageHeader}

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
                    </div>
                </section>
            </div>
        </>
    );
};

export default GiftPage;
