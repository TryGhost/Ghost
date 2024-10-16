import React, {useContext, useEffect, useState} from 'react';
import {ReactComponent as LoaderIcon} from '../../images/icons/loader.svg';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import {getCurrencySymbol, getPriceString, getStripeAmount, getMemberActivePrice, getProductFromPrice, getFreeTierTitle, getFreeTierDescription, getFreeProduct, getFreeProductBenefits, getSupportAddress, formatNumber, isCookiesDisabled, hasOnlyFreeProduct, isMemberActivePrice, hasFreeTrialTier, isComplimentaryMember} from '../../utils/helpers';
import AppContext from '../../AppContext';
import calculateDiscount from '../../utils/discount';
import Interpolate from '@doist/react-interpolate';
import {SYNTAX_I18NEXT} from '@doist/react-interpolate';

export const ProductsSectionStyles = () => {
    // const products = getSiteProducts({site});
    // const noOfProducts = products.length;
    return `
        .gh-portal-products {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .gh-portal-products-pricetoggle {
            position: relative;
            display: flex;
            background: #F3F3F3;
            width: 100%;
            border-radius: 999px;
            padding: 4px;
            height: 44px;
            margin: 0 0 40px;
        }

        .gh-portal-products-pricetoggle:before {
            position: absolute;
            content: "";
            display: block;
            width: 50%;
            top: 4px;
            bottom: 4px;
            right: 4px;
            background: var(--white);
            box-shadow: 0px 1px 3px rgba(var(--blackrgb), 0.08);
            border-radius: 999px;
            transition: all 0.15s ease-in-out;
        }

        .gh-portal-products-pricetoggle.left:before {
            transform: translateX(calc(-100% + 8px));
        }

        .gh-portal-products-pricetoggle .gh-portal-btn {
            border: 0;
            height: 100% !important;
            width: 50%;
            border-radius: 999px;
            background: transparent;
            font-size: 1.5rem;
        }

        .gh-portal-products-pricetoggle .gh-portal-btn.active {
            border: 0;
            height: 100%;
            width: 50%;
            color: var(--grey0);
        }

        .gh-portal-priceoption-label {
            font-size: 1.4rem;
            font-weight: 400;
            letter-spacing: 0.3px;
            margin: 0 6px;
            min-width: 180px;
        }

        .gh-portal-priceoption-label.monthly {
            text-align: right;
        }

        .gh-portal-priceoption-label.inactive {
            color: var(--grey8);
        }

        .gh-portal-maximum-discount {
            font-weight: 400;
            margin-left: 4px;
            opacity: 0.5;
        }

        .gh-portal-products-grid {
            display: flex;
            flex-wrap: wrap;
            align-items: stretch;
            justify-content: center;
            gap: 40px;
            margin: 0 auto;
            padding: 0;
            width: 100%;
        }

        .gh-portal-product-card {
            flex: 1;
            max-width: 420px;
            min-width: 320px;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: stretch;
            background: var(--white);
            padding: 32px;
            border-radius: 7px;
            border: 1px solid var(--grey11);
            min-height: 200px;
            transition: border-color 0.25s ease-in-out;
        }

        .gh-portal-product-card.top {
            border-bottom: none;
            border-radius: 7px 7px 0 0;
            padding-bottom: 0;
        }

        .gh-portal-product-card.bottom {
            border-top: none;
            border-radius: 0 0 7px 7px;
            padding-top: 0;
        }

        .gh-portal-product-card:not(.disabled):hover {
            border-color: var(--grey9);
        }

        .gh-portal-product-card.checked::before {
            position: absolute;
            display: block;
            top: -2px;
            right: -2px;
            bottom: -2px;
            left: -2px;
            content: "";
            z-index: 999;
            border: 0px solid var(--brandcolor);
            pointer-events: none;
            border-radius: 7px;
        }

        .gh-portal-product-card-header {
            width: 100%;
            min-height: 56px;
        }

        .gh-portal-product-card-name-trial {
            display: flex;
            align-items: center;
        }

        .gh-portal-product-card-name-trial .gh-portal-discount-label {
            margin-top: -4px;
        }

        .gh-portal-product-card-details {
            flex: 1;
            display: flex;
            flex-direction: column;
            width: 100%;
        }

        .gh-portal-product-name {
            font-size: 1.8rem;
            font-weight: 600;
            line-height: 1.3em;
            letter-spacing: 0px;
            margin-top: -4px;
            word-break: break-word;
            width: 100%;
            color: var(--brandcolor);
        }

        .gh-portal-discount-label-trial {
            color: var(--brandcolor);
            font-weight: 600;
            font-size: 1.3rem;
            line-height: 1;
            margin-top: 4px;
        }

        .gh-portal-discount-label {
            position: relative;
            font-size: 1.25rem;
            line-height: 1em;
            font-weight: 600;
            letter-spacing: 0.3px;
            color: var(--grey0);
            padding: 6px 9px;
            text-align: center;
            white-space: nowrap;
            border-radius: 999px;
            margin-right: -4px;
            max-height: 24.5px;
        }

        .gh-portal-discount-label:before {
            position: absolute;
            content: "";
            display: block;
            background: var(--brandcolor);
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            border-radius: 999px;
            opacity: 0.2;
        }

        .gh-portal-product-card-price-trial {
            display: flex;
            flex-direction: row;
            align-items: flex-end;
            justify-content: space-between;
            flex-wrap: wrap;
            row-gap: 10px;
            column-gap: 4px;
            width: 100%;
        }

        .gh-portal-product-card-pricecontainer {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
            margin-top: 16px;
        }

        .gh-portal-product-price {
            display: flex;
            justify-content: center;
            color: var(--grey0);
        }

        .gh-portal-product-price .currency-sign {
            align-self: flex-start;
            font-size: 2.7rem;
            font-weight: 700;
            line-height: 1.135em;
        }

        .gh-portal-product-price .currency-sign.long {
            margin-right: 5px;
        }

        .gh-portal-product-price .amount {
            font-size: 3.5rem;
            font-weight: 700;
            line-height: 1em;
            letter-spacing: -1.3px;
            color: var(--grey0);
        }

        .gh-portal-product-price .amount.trial-duration {
            letter-spacing: -0.022em;
        }

        .gh-portal-product-price .billing-period {
            align-self: flex-end;
            font-size: 1.5rem;
            line-height: 1.6em;
            color: var(--grey5);
            letter-spacing: 0.3px;
            margin-left: 5px;
        }

        .gh-portal-product-alternative-price {
            font-size: 1.3rem;
            line-height: 1.6em;
            color: var(--grey8);
            letter-spacing: 0.3px;
            display: none;
        }

        .after-trial-amount {
            display: block;
            font-size: 1.5rem;
            color: var(--grey5);
            margin-top: 6px;
            margin-bottom: 6px;
            line-height: 1;
        }

        .gh-portal-product-card-detaildata {
            flex: 1;
        }

        .gh-portal-product-description {
            font-size: 1.55rem;
            font-weight: 600;
            line-height: 1.4em;
            width: 100%;
            margin-top: 16px;
        }

        .gh-portal-product-benefits {
            font-size: 1.5rem;
            line-height: 1.4em;
            width: 100%;
            margin-top: 16px;
        }

        .gh-portal-product-benefit {
            display: flex;
            align-items: flex-start;
            margin-bottom: 10px;
        }

        .gh-portal-benefit-checkmark {
            width: 14px;
            height: 14px;
            min-width: 14px;
            margin: 3px 10px 0 0;
            overflow: visible;
        }

        .gh-portal-benefit-checkmark polyline,
        .gh-portal-benefit-checkmark g {
            stroke-width: 3px;
        }

        .gh-portal-products-grid.change-plan {
            padding: 0;
        }

        .gh-portal-btn-product {
            position: sticky;
            bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
            justify-self: flex-end;
            padding: 40px 0 32px;
            margin-bottom: -32px;
            /*background: rgb(255,255,255);
            background: linear-gradient(0deg, rgba(255,255,255,1) 75%, rgba(255,255,255,0) 100%);*/
            background: transparent;
        }

        .gh-portal-btn-product::before {
            position: absolute;
            content: "";
            display: block;
            top: -16px;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(0deg, rgba(var(--whitergb),1) 60%, rgba(var(--whitergb),0) 100%);
            z-index: 800;
        }

        .gh-portal-btn-product .gh-portal-btn {
            background: var(--brandcolor);
            color: var(--white);
            border: none;
            width: 100%;
            z-index: 900;
        }

        .gh-portal-btn-product .gh-portal-btn:hover {
            opacity: 0.9;
        }

        .gh-portal-btn-product .gh-portal-btn {
            background: var(--brandcolor);
            color: var(--white);
            border: none;
            width: 100%;
            z-index: 900;
        }

        .gh-portal-btn-product .gh-portal-error-message {
            z-index: 900;
            color: var(--red);
            font-size: 1.4rem;
            min-height: 40px;
            padding-bottom: 13px;
            margin-bottom: -40px;
        }

        .gh-portal-current-plan {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            white-space: nowrap;
            width: 100%;
            height: 44px;
            border-radius: 5px;
            color: var(--grey5);
            font-size: 1.4rem;
            font-weight: 500;
            line-height: 1em;
            letter-spacing: 0.2px;
            font-weight: 500;
            background: var(--grey14);
            z-index: 900;
        }

        .gh-portal-product-card.only-free {
            margin: 0 0 16px;
            min-height: unset;
        }

        .gh-portal-product-card.only-free .gh-portal-product-card-header {
            min-height: unset;
        }

        @media (max-width: 670px) {
            .gh-portal-products-grid {
                grid-template-columns: unset;
                grid-gap: 20px;
                width: 100%;
                max-width: 440px;
            }

            .gh-portal-priceoption-label {
                font-size: 1.25rem;
            }

            .gh-portal-products-priceswitch .gh-portal-discount-label {
                display: none;
            }

            .gh-portal-products-priceswitch {
                padding-top: 18px;
            }

            .gh-portal-product-card {
                min-height: unset;
            }

            .gh-portal-singleproduct-benefits .gh-portal-product-description {
                text-align: center;
            }

            .gh-portal-product-benefit:last-of-type {
                margin-bottom: 0;
            }
        }

        @media (max-width: 480px) {
            .gh-portal-product-price .amount {
                font-size: 3.4rem;
            }

            .gh-portal-product-card {
                min-width: unset;
            }

            .gh-portal-btn-product {
                position: static;
            }

            .gh-portal-btn-product::before {
                display: none;
            }
        }

        @media (max-width: 370px) {
            .gh-portal-product-price .currency-sign {
                font-size: 1.8rem;
            }

            .gh-portal-product-price .amount {
                font-size: 2.8rem;
            }
        }


        /* Upgrade and change plan*/
        .gh-portal-upgrade-product {
            margin-top: -70px;
            padding-top: 60px;
        }

        .gh-portal-upgrade-product .gh-portal-products-grid {
            grid-template-columns: unset;
            grid-gap: 20px;
            width: 100%;
        }

        .gh-portal-upgrade-product .gh-portal-product-card .gh-portal-plan-current {
            display: inline-block;
            position: relative;
            padding: 2px 8px;
            font-size: 1.2rem;
            letter-spacing: 0.3px;
            text-transform: uppercase;
            margin-bottom: 4px;
        }

        .gh-portal-upgrade-product .gh-portal-product-card .gh-portal-plan-current::before {
            position: absolute;
            content: "";
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            border-radius: 999px;
            background: var(--brandcolor);
            opacity: 0.15;
        }

        @media (max-width: 880px) {
            .gh-portal-products-grid {
                flex-direction: column;
                margin: 0 auto;
                max-width: 420px;
            }

            .gh-portal-product-card-header {
                min-height: unset;
            }
        }
    `;
};

const ProductsContext = React.createContext({
    selectedInterval: 'month',
    selectedProduct: 'free',
    selectedPlan: null,
    setSelectedProduct: null
});

function ProductBenefits({product}) {
    if (!product.benefits || !product.benefits.length) {
        return null;
    }

    return product.benefits.map((benefit, idx) => {
        const key = benefit?.id || `benefit-${idx}`;
        return (
            <div className="gh-portal-product-benefit" key={key}>
                <CheckmarkIcon className='gh-portal-benefit-checkmark' alt=''/>
                <div className="gh-portal-benefit-title">{benefit.name}</div>
            </div>
        );
    });
}

function ProductBenefitsContainer({product, hide = false}) {
    if (!product.benefits || !product.benefits.length || hide) {
        return null;
    }

    let className = 'gh-portal-product-benefits';
    return (
        <div className={className}>
            <ProductBenefits product={product} />
        </div>
    );
}

function ProductCardAlternatePrice({price}) {
    const {site} = useContext(AppContext);
    const {portal_plans: portalPlans} = site;
    if (!portalPlans.includes('monthly') || !portalPlans.includes('yearly')) {
        return (
            <div className="gh-portal-product-alternative-price"></div>
        );
    }

    return (
        <div className="gh-portal-product-alternative-price">{getPriceString(price)}</div>
    );
}

function ProductCardTrialDays({trialDays, discount, selectedInterval}) {
    const {site, t} = useContext(AppContext);

    if (hasFreeTrialTier({site})) {
        if (trialDays) {
            return (
                <span className="gh-portal-discount-label">{t('{{trialDays}} days free', {trialDays})}</span>
            );
        } else {
            return null;
        }
    }

    if (selectedInterval === 'year') {
        return (
            <span className="gh-portal-discount-label">{t('{{discount}}% discount', {discount})}</span>
        );
    }

    return null;
}

function ProductCardPrice({product}) {
    const {selectedInterval} = useContext(ProductsContext);
    const {t, site} = useContext(AppContext);
    const monthlyPrice = product.monthlyPrice;
    const yearlyPrice = product.yearlyPrice;
    const trialDays = product.trial_days;
    const activePrice = selectedInterval === 'month' ? monthlyPrice : yearlyPrice;
    const alternatePrice = selectedInterval === 'month' ? yearlyPrice : monthlyPrice;
    const interval = activePrice.interval === 'year' ? t('year') : t('month');
    if (!monthlyPrice || !yearlyPrice) {
        return null;
    }

    const yearlyDiscount = calculateDiscount(product.monthlyPrice.amount, product.yearlyPrice.amount);
    const currencySymbol = getCurrencySymbol(activePrice.currency);

    if (hasFreeTrialTier({site})) {
        return (
            <>
                <div className="gh-portal-product-card-pricecontainer">
                    <div className="gh-portal-product-card-price-trial">
                        <div className="gh-portal-product-price">
                            <span className={'currency-sign' + (currencySymbol.length > 1 ? ' long' : '')}>{currencySymbol}</span>
                            <span className="amount" data-testid="product-amount">{formatNumber(getStripeAmount(activePrice.amount))}</span>
                            <span className="billing-period">/{interval}</span>
                        </div>
                        <ProductCardTrialDays trialDays={trialDays} discount={yearlyDiscount} selectedInterval={selectedInterval} />
                    </div>
                    {(selectedInterval === 'year' ? <YearlyDiscount discount={yearlyDiscount} trialDays={trialDays} /> : '')}
                    <ProductCardAlternatePrice price={alternatePrice} />
                </div>
                {/* <span className="after-trial-amount">Then {currencySymbol}{formatNumber(getStripeAmount(activePrice.amount))}/{activePrice.interval}</span> */}
            </>
        );
    }

    return (
        <div className="gh-portal-product-card-pricecontainer">
            <div className="gh-portal-product-card-price-trial">
                <div className="gh-portal-product-price">
                    <span className={'currency-sign' + (currencySymbol.length > 1 ? ' long' : '')}>{currencySymbol}</span>
                    <span className="amount" data-testid="product-amount">{formatNumber(getStripeAmount(activePrice.amount))}</span>
                    <span className="billing-period">/{interval}</span>
                </div>
                {(selectedInterval === 'year' ? <YearlyDiscount discount={yearlyDiscount} /> : '')}
            </div>
            <ProductCardAlternatePrice price={alternatePrice} />
        </div>
    );
}

function FreeProductCard({products, handleChooseSignup, error}) {
    const {site, action, t} = useContext(AppContext);
    const {selectedProduct, setSelectedProduct} = useContext(ProductsContext);

    let cardClass = selectedProduct === 'free' ? 'gh-portal-product-card free checked' : 'gh-portal-product-card free';
    const product = getFreeProduct({site});
    let freeProductDescription = getFreeTierDescription({site});

    let disabled = (action === 'signup:running') ? true : false;

    if (isCookiesDisabled()) {
        disabled = true;
    }

    // @TODO: doublecheck this!
    let currencySymbol = '$';
    if (products && products[1]) {
        currencySymbol = getCurrencySymbol(products[1].monthlyPrice.currency);
    } else {
        currencySymbol = '$';
    }

    const hasOnlyFree = hasOnlyFreeProduct({site});
    const freeBenefits = getFreeProductBenefits({site});

    if (hasOnlyFree) {
        if (!freeProductDescription && !freeBenefits.length) {
            return null;
        }
        cardClass += ' only-free';
    }

    if (!freeProductDescription && !freeBenefits.length) {
        freeProductDescription = 'Free preview';
    }

    return (
        <>
            <div className={cardClass} onClick={(e) => {
                e.stopPropagation();
                setSelectedProduct('free');
            }} data-test-tier="free">
                <div className='gh-portal-product-card-header'>
                    <h4 className="gh-portal-product-name">{getFreeTierTitle({site})}</h4>
                    {(!hasOnlyFree ?
                        <div className="gh-portal-product-card-pricecontainer free-trial-disabled">
                            <div className="gh-portal-product-price">
                                <span className={'currency-sign' + (currencySymbol.length > 1 ? ' long' : '')}>{currencySymbol}</span>
                                <span className="amount" data-testid="product-amount">0</span>
                            </div>
                            {/* <div className="gh-portal-product-alternative-price"></div> */}
                        </div>
                        : '')}
                </div>
                <div className='gh-portal-product-card-details'>
                    <div className='gh-portal-product-card-detaildata'>
                        {freeProductDescription
                            ? <div className="gh-portal-product-description" data-testid="product-description">{freeProductDescription}</div>
                            : ''
                        }
                        <ProductBenefitsContainer product={product} />
                    </div>
                    {(!hasOnlyFree ?
                        <div className='gh-portal-btn-product'>
                            {}
                            <button
                                data-test-button='select-tier'
                                className='gh-portal-btn'
                                disabled={disabled}
                                onClick={(e) => {
                                    handleChooseSignup(e, 'free');
                                }}>
                                {((selectedProduct === 'free' && disabled) ? <LoaderIcon className='gh-portal-loadingicon' /> : t('Choose'))}
                            </button>
                            {error && <div className="gh-portal-error-message">{error}</div>}
                        </div>
                        : '')}
                </div>
            </div>
        </>
    );
}

function ProductCardButton({selectedProduct, product, disabled, noOfProducts, trialDays}) {
    const {t} = useContext(AppContext);
    if (selectedProduct === product.id && disabled) {
        return (
            <LoaderIcon className='gh-portal-loadingicon' />
        );
    }

    if (trialDays > 0) {
        return (
            <Interpolate
                syntax={SYNTAX_I18NEXT}
                string={t('Start {{amount}}-day free trial')}
                mapping={{
                    amount: trialDays
                }}
            />
        );
    }

    return (noOfProducts > 1 ? t('Choose') : t('Continue'));
}

function ProductCard({product, products, selectedInterval, handleChooseSignup, error}) {
    const {selectedProduct, setSelectedProduct} = useContext(ProductsContext);
    const {action} = useContext(AppContext);
    const trialDays = product.trial_days;

    const cardClass = selectedProduct === product.id ? 'gh-portal-product-card checked' : 'gh-portal-product-card';
    const noOfProducts = products?.filter((d) => {
        return d.type === 'paid';
    })?.length;

    let disabled = (['signup:running', 'checkoutPlan:running'].includes(action)) ? true : false;

    if (isCookiesDisabled()) {
        disabled = true;
    }

    let productDescription = product.description;
    if ((!product.benefits || !product.benefits.length) && !productDescription) {
        productDescription = 'Full access';
    }

    return (
        <>
            <div className={cardClass} key={product.id} onClick={(e) => {
                e.stopPropagation();
                setSelectedProduct(product.id);
            }} data-test-tier="paid">
                <div className='gh-portal-product-card-header'>
                    <h4 className="gh-portal-product-name">{product.name}</h4>
                    <ProductCardPrice product={product} />
                </div>
                <div className='gh-portal-product-card-details'>
                    <div className='gh-portal-product-card-detaildata'>
                        <div className="gh-portal-product-description" data-testid="product-description">
                            {productDescription}
                        </div>
                        <ProductBenefitsContainer product={product} />
                    </div>
                    <div className='gh-portal-btn-product'>
                        <button
                            data-test-button='select-tier'
                            disabled={disabled}
                            className='gh-portal-btn'
                            onClick={(e) => {
                                const selectedPrice = getSelectedPrice({products, selectedInterval, selectedProduct: product.id});
                                handleChooseSignup(e, selectedPrice.id);
                            }}>
                            <ProductCardButton
                                {...{selectedProduct, product, disabled, noOfProducts, trialDays}}
                            />
                        </button>
                        {error && <div className="gh-portal-error-message">{error}</div>}
                    </div>
                </div>
            </div>
        </>
    );
}

function getProductErrorMessage({product, products, selectedInterval, errors}) {
    const selectedPrice = getSelectedPrice({products, selectedInterval, selectedProduct: product.id});
    if (selectedPrice && selectedPrice.id && errors && errors[selectedPrice.id]) {
        return errors[selectedPrice.id];
    }
    return null;
}

function ProductCards({products, selectedInterval, handleChooseSignup, errors}) {
    return products.map((product) => {
        const error = getProductErrorMessage({product, products, selectedInterval, errors});
        if (product.id === 'free') {
            return (
                <FreeProductCard products={products} key={product.id} handleChooseSignup={handleChooseSignup} error={error} />
            );
        }
        return (
            <ProductCard products={products} product={product} selectedInterval={selectedInterval} key={product.id} handleChooseSignup={handleChooseSignup} error={error}/>
        );
    });
}

function YearlyDiscount({discount}) {
    const {site, t} = useContext(AppContext);
    const {portal_plans: portalPlans} = site;

    if (discount === 0 || !portalPlans.includes('monthly')) {
        return null;
    }

    if (hasFreeTrialTier({site})) {
        return (
            <>
                <span className="gh-portal-discount-label-trial">{t('{{discount}}% discount', {discount})}</span>
            </>
        );
    } else {
        return (
            <>
                <span className="gh-portal-discount-label">{t('{{discount}}% discount', {discount})}</span>
            </>
        );
    }
}

function ProductPriceSwitch({selectedInterval, setSelectedInterval, products}) {
    const {site, t} = useContext(AppContext);
    const {portal_plans: portalPlans} = site;
    const paidProducts = products.filter(product => product.type !== 'free');

    // Extract discounts from products
    const prices = paidProducts.map(product => calculateDiscount(product.monthlyPrice?.amount, product.yearlyPrice?.amount));

    // Find the highest price using Math.max
    const highestYearlyDiscount = Math.max(...prices);

    if (!portalPlans.includes('monthly') || !portalPlans.includes('yearly')) {
        return null;
    }

    return (
        <div className='gh-portal-logged-out-form-container'>
            <div className={'gh-portal-products-pricetoggle' + (selectedInterval === 'month' ? ' left' : '')}>
                <button
                    data-test-button='switch-monthly'
                    data-testid="monthly-switch"
                    className={'gh-portal-btn' + (selectedInterval === 'month' ? ' active' : '')}
                    onClick={() => {
                        setSelectedInterval('month');
                    }}
                >
                    {t('Monthly')}
                </button>
                <button
                    data-test-button='switch-yearly'
                    data-testid="yearly-switch"
                    className={'gh-portal-btn' + (selectedInterval === 'year' ? ' active' : '')}
                    onClick={() => {
                        setSelectedInterval('year');
                    }}
                >
                    {t('Yearly')}
                    {(highestYearlyDiscount > 0) && <span className='gh-portal-maximum-discount'>{t('(save {{highestYearlyDiscount}}%)', {highestYearlyDiscount})}</span>}
                </button>
            </div>
        </div>
    );
}

function getSelectedPrice({products, selectedProduct, selectedInterval}) {
    let selectedPrice = null;
    if (selectedProduct === 'free') {
        selectedPrice = {id: 'free'};
    } else {
        let product = products.find(prod => prod.id === selectedProduct);
        if (!product) {
            product = products.find(p => p.type === 'paid');
        }
        selectedPrice = selectedInterval === 'month' ? product?.monthlyPrice : product?.yearlyPrice;
    }
    return selectedPrice;
}

function getActiveInterval({portalPlans, portalDefaultPlan, selectedInterval}) {
    if (selectedInterval === 'month' && portalPlans.includes('monthly')) {
        return 'month';
    }

    if (selectedInterval === 'year' && portalPlans.includes('yearly')) {
        return 'year';
    }

    if (portalDefaultPlan) {
        if (portalDefaultPlan === 'monthly' && portalPlans.includes('monthly')) {
            return 'month';
        }
    }

    if (portalPlans.includes('yearly')) {
        return 'year';
    }

    if (portalPlans.includes('monthly')) {
        return 'month';
    }
}

function ProductsSection({onPlanSelect, products, type = null, handleChooseSignup, errors}) {
    const {site, member, t} = useContext(AppContext);
    const {portal_plans: portalPlans, portal_default_plan: portalDefaultPlan} = site;
    const defaultProductId = products.length > 0 ? products[0].id : 'free';

    // Note: by default we set it to null, so that it changes reactively in the preview version of Portal
    const [selectedInterval, setSelectedInterval] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(defaultProductId);

    const selectedPrice = getSelectedPrice({products, selectedInterval, selectedProduct});
    const activeInterval = getActiveInterval({portalPlans, portalDefaultPlan, selectedInterval});

    const isComplimentary = isComplimentaryMember({member});
    const hasOnlyFree = hasOnlyFreeProduct({site});

    useEffect(() => {
        setSelectedProduct(defaultProductId);
    }, [defaultProductId]);

    useEffect(() => {
        onPlanSelect(null, selectedPrice.id);
    }, [selectedPrice.id, onPlanSelect]);

    if (products.length === 0) {
        if (isComplimentary) {
            const supportAddress = getSupportAddress({site});
            return (
                <p style={{textAlign: 'center'}}>
                    {t('Please contact {{supportAddress}} to adjust your complimentary subscription.', {supportAddress})}
                </p>
            );
        } else {
            return null;
        }
    }

    let className = 'gh-portal-products';
    if (type === 'upgrade') {
        className += ' gh-portal-upgrade-product';
    }

    let finalProduct = products.find(p => p.id === selectedProduct)?.id || products.find(p => p.type === 'paid')?.id;
    return (
        <ProductsContext.Provider value={{
            selectedInterval: activeInterval,
            selectedProduct: finalProduct,
            setSelectedProduct
        }}>
            <section className={className}>

                {(!(hasOnlyFree) ?
                    <ProductPriceSwitch
                        products={products}
                        selectedInterval={activeInterval}
                        setSelectedInterval={setSelectedInterval}
                    />
                    : '')}

                <div className="gh-portal-products-grid">
                    <ProductCards products={products} selectedInterval={activeInterval} handleChooseSignup={handleChooseSignup} errors={errors}/>
                </div>
            </section>
        </ProductsContext.Provider>
    );
}

export function ChangeProductSection({onPlanSelect, selectedPlan, products, type = null}) {
    const {site, member} = useContext(AppContext);
    const {portal_plans: portalPlans} = site;
    const activePrice = getMemberActivePrice({member});
    const activeMemberProduct = getProductFromPrice({site, priceId: activePrice.id});
    const defaultInterval = getActiveInterval({portalPlans, selectedInterval: activePrice.interval});
    const defaultProductId = activeMemberProduct?.id || products?.[0]?.id;
    const [selectedInterval, setSelectedInterval] = useState(defaultInterval);
    const [selectedProduct, setSelectedProduct] = useState(defaultProductId);

    // const selectedPrice = getSelectedPrice({products, selectedInterval, selectedProduct});
    const activeInterval = getActiveInterval({portalPlans, selectedInterval});

    useEffect(() => {
        setSelectedProduct(defaultProductId);
    }, [defaultProductId]);

    if (!portalPlans.includes('monthly') && !portalPlans.includes('yearly')) {
        return null;
    }

    if (products.length === 0) {
        return null;
    }

    let className = 'gh-portal-products';
    if (type === 'upgrade') {
        className += ' gh-portal-upgrade-product';
    }
    if (type === 'changePlan') {
        className += ' gh-portal-upgrade-product gh-portal-change-plan';
    }

    return (
        <ProductsContext.Provider value={{
            selectedInterval: activeInterval,
            selectedProduct,
            selectedPlan,
            setSelectedProduct
        }}>
            <section className={className}>
                <ProductPriceSwitch
                    selectedInterval={activeInterval}
                    setSelectedInterval={setSelectedInterval}
                    products={products}
                />

                <div className="gh-portal-products-grid">
                    <ChangeProductCards products={products} onPlanSelect={onPlanSelect} />
                </div>
                {/* <ActionButton
                    onClick={e => onPlanSelect(null, selectedPrice?.id)}
                    isRunning={false}
                    disabled={!selectedPrice?.id || (activePrice.id === selectedPrice?.id)}
                    isPrimary={true}
                    brandColor={brandColor}
                    label={'Continue'}
                    style={{height: '40px', width: '100%', marginTop: '24px'}}
                /> */}
            </section>
        </ProductsContext.Provider>
    );
}

function ProductDescription({product}) {
    if (product?.description) {
        return (
            <div className="gh-portal-product-description" data-testid="product-description">
                {product.description}
            </div>
        );
    }
    return null;
}

function ChangeProductCard({product, onPlanSelect}) {
    const {member, site, t} = useContext(AppContext);
    const {selectedProduct, setSelectedProduct, selectedInterval} = useContext(ProductsContext);
    const cardClass = selectedProduct === product.id ? 'gh-portal-product-card checked' : 'gh-portal-product-card';
    const monthlyPrice = product.monthlyPrice;
    const yearlyPrice = product.yearlyPrice;
    const memberActivePrice = getMemberActivePrice({member});

    const selectedPrice = selectedInterval === 'month' ? monthlyPrice : yearlyPrice;

    const currentPlan = isMemberActivePrice({member, site, priceId: selectedPrice.id});

    return (
        <div className={cardClass + (currentPlan ? ' disabled' : '')} key={product.id} onClick={(e) => {
            e.stopPropagation();
            setSelectedProduct(product.id);
        }} data-test-tier="paid">
            <div className='gh-portal-product-card-header'>
                <h4 className="gh-portal-product-name">{product.name}</h4>
                <ProductCardPrice product={product} />
            </div>
            <div className='gh-portal-product-card-details'>
                <div className='gh-portal-product-card-detaildata'>
                    {product.description ? <ProductDescription product={product} selectedPrice={selectedPrice} activePrice={memberActivePrice} /> : ''}
                    <ProductBenefitsContainer product={product} />
                </div>
                {(currentPlan ?
                    <div className='gh-portal-btn-product'>
                        <span className='gh-portal-current-plan'><span>{t('Current plan')}</span></span>
                    </div>
                    :
                    <div className='gh-portal-btn-product'>
                        <button
                            data-test-button='select-tier'
                            className='gh-portal-btn'
                            onClick={() => {
                                onPlanSelect(null, selectedPrice?.id);
                            }}
                        >{t('Choose')}</button>
                    </div>)}
            </div>
        </div>
    );
}

function ChangeProductCards({products, onPlanSelect}) {
    return products.map((product) => {
        if (!product || product.id === 'free') {
            return null;
        }
        return (
            <ChangeProductCard product={product} key={product.id} onPlanSelect={onPlanSelect} />
        );
    });
}

export default ProductsSection;
