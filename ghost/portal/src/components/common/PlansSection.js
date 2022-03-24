import React, {useContext} from 'react';
import AppContext from '../../AppContext';
import calculateDiscount from '../../utils/discount';
import {isCookiesDisabled, formatNumber, hasOnlyFreePlan} from '../../utils/helpers';
import ProductsSection, {ChangeProductSection} from './ProductsSection';

export const PlanSectionStyles = `
    .gh-portal-plans-container {
        display: flex;
        align-items: stretch;
        border: 1px solid var(--grey11);
        border-radius: 5px;
    }

    .gh-portal-plan-section {
        display: flex;
        flex-direction: column;
        flex: 1;
        position: relative;
        align-items: center;
        justify-items: center;
        font-size: 1.4rem;
        line-height: 1.35em;
        border-right: 1px solid var(--grey11);
        padding: 24px 10px;
        cursor: pointer;
        user-select: none;
    }

    .gh-portal-change-plan-section {
        border-top-left-radius: 0;
        border-top-right-radius: 0;
    }

    .gh-portal-plans-container.disabled .gh-portal-plan-section {
        cursor: auto;
    }

    .gh-portal-plan-section.checked::before {
        position: absolute;
        display: block;
        top: -1px;
        right: -1px;
        bottom: -1px;
        left: -1px;
        content: "";
        z-index: 999;
        border: 2px solid var(--brandcolor);
        pointer-events: none;
    }

    .gh-portal-plan-section:first-of-type::before {
        border-top-left-radius: 5px;
        border-bottom-left-radius: 5px;
    }

    .gh-portal-plan-section:last-of-type::before {
        border-top-right-radius: 5px;
        border-bottom-right-radius: 5px;
    }

    .gh-portal-plan-section:last-of-type {
        border-right: none;
    }

    .gh-portal-plans-container:not(.empty-selected-benefits) .gh-portal-plan-section::before {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    .gh-portal-plans-container.has-discount {
        margin-top: 40px;
    }

    .gh-portal-plans-container.has-discount,
    .gh-portal-plans-container.has-discount .gh-portal-plan-section:last-of-type::before {
        border-top-right-radius: 0;
    }

    .gh-portal-plans-container.is-change-plan .gh-portal-plan-section::before {
        border-top-left-radius: 0;
        border-top-right-radius: 0;
    }

    .gh-portal-plans-container.disabled .gh-portal-plan-section.checked::before {
        opacity: 0.3;
    }

    .gh-portal-plan-pricelabel {
        display: flex;
        flex-direction: row;
        min-height: 28px;
        margin-top: 2px;
    }

    .gh-portal-plans-container .gh-portal-plan-pricelabel {
        min-height: unset;
    }

    .gh-portal-plan-pricecontainer {
        display: flex;
    }

    .gh-portal-plan-priceinterval {
        font-size: 1.25rem;
        line-height: 2;
        color: var(--grey7);
    }

    .gh-portal-plan-name {
        display: flex;
        align-items: center;
        font-size: 1.2rem;
        font-weight: 500;
        line-height: 1.0em;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-top: 4px;
        text-align: center;
        min-height: 24px;
        word-break: break-word;
    }

    .gh-portal-plan-currency {
        position: relative;
        bottom: 2px;
        font-size: 1.4rem;
        font-weight: 500;
        letter-spacing: 0.4px;
    }

    .gh-portal-plan-currency-code {
        margin-right: 2px;
        font-size: 1.15rem;
    }

    .gh-portal-plan-price {
        font-size: 2.2rem;
        font-weight: 500;
        letter-spacing: 0.1px;
    }

    .gh-portal-plan-type {
        color: var(--grey7);
    }

    .gh-portal-plan-featurewrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        border-top: 1px solid var(--grey12);
        padding-top: 12px;
        width: 100%;
    }

    .gh-portal-plan-feature {
        font-size: 1.25rem;
        font-weight: 500;
        line-height: 1.25em;
        text-align: center;
        letter-spacing: 0.2px;
        word-break: break-word;
    }

    .gh-portal-content.signup.singleplan .gh-portal-plan-section {
        cursor: auto;
    }

    .gh-portal-content.signup.singleplan .gh-portal-plan-section.checked::before {
        display: none;
    }

    .gh-portal-content.signup.singleplan .gh-portal-plan-name {
        margin-top: 0;
    }

    .gh-portal-plan-section:not(.checked)::before {
        position: absolute;
        display: block;
        top: -1px;
        right: -1px;
        bottom: -1px;
        left: -1px;
        content: "";
        z-index: 999;
        border: 1px solid var(--brandcolor);
        pointer-events: none;
        opacity: 0;
        transition: all 0.2s ease-in-out;
    }

    .gh-portal-plans-container.disabled .gh-portal-plan-section:not(.checked):hover::before {
        opacity: 0;
    }

    .gh-portal-plans-container.hide-checkbox .gh-portal-plan-section {
        padding-top: 12px;
        padding-bottom: 12px;
    }

    .gh-portal-plan-current {
        display: block;
        font-size: 1.25rem;
        letter-spacing: 0.2px;
        line-height: 1.25em;
        color: var(--brandcolor);
        margin: 3px 0 -2px;
    }

    .gh-portal-plans-container:not(.empty-selected-benefits) {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    .gh-portal-plans-container.is-change-plan {
        border-radius: 0 0 5px 5px;
        border-top: none;
    }

    .gh-portal-plans-container.is-change-plan .gh-portal-plan-section {
        min-height: 90px;
    }

    .gh-portal-plan-product {
        border: 1px solid var(--grey11);
        border-radius: 5px;
    }

    .gh-portal-plan-product:not(:last-of-type) {
        margin-bottom: 20px;
    }

    .gh-portal-plan-productname {
        border-radius: 5px 5px 0 0;
        padding: 2px 10px;
        font-size: 1.25rem;
        letter-spacing: 0.3px;
        text-transform: uppercase;
        font-weight: 600;
        border-bottom: 1px solid var(--grey12);
    }

    .gh-portal-accountplans-main .gh-portal-plan-section:hover:not(.checked) {
        background: var(--grey14);
    }

    .gh-portal-accountplans-main .gh-portal-plan-section:last-of-type {
        border-radius: 0 0 5px 5px;
    }

    .gh-portal-singleproduct-benefits {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--grey11);
        border-top: none !important;
        margin: 0 0 4px !important;
        padding: 16px 24px 12px !important;
        border-radius: 0 0 5px 5px;
    }

    .gh-portal-singleproduct-benefits.onlyfree {
        border-top: 1px solid var(--grey11) !important;
        border-radius: 5px;
        margin-top: 30px !important;
    }

    .gh-portal-singleproduct-benefits .gh-portal-product-benefit {
        padding: 0 8px;
    }

    .gh-portal-singleproduct-benefits .gh-portal-product-benefit:last-of-type {
        margin-bottom: 16px;
    }

    .gh-portal-singleproduct-benefits.onlyfree .gh-portal-product-benefit:last-of-type {
        margin-bottom: 4px;
    }

    .gh-portal-singleproduct-benefits:not(.no-benefits) .gh-portal-product-description {
        border-bottom: 1px solid var(--grey12);
        padding-bottom: 20px;
        margin-bottom: 16px;
    }
`;

function PriceLabel({currencySymbol, price, interval}) {
    const isSymbol = currencySymbol.length !== 3;
    const currencyClass = isSymbol ? 'gh-portal-plan-currency gh-portal-plan-currency-symbol' : 'gh-portal-plan-currency gh-portal-plan-currency-code';
    return (
        <div className='gh-portal-plan-pricelabel'>
            <div className='gh-portal-plan-pricecontainer'>
                <span className={currencyClass}>{currencySymbol}</span>
                <span className='gh-portal-plan-price'>{formatNumber(price)}</span>
            </div>
        </div>
    );
}

function addDiscountToPlans(plans) {
    const filteredPlans = plans.filter(d => d.id !== 'free');
    const monthlyPlan = plans.find((d) => {
        return d.name === 'Monthly' && d.interval === 'month';
    });
    const yearlyPlan = plans.find((d) => {
        return d.name === 'Yearly' && d.interval === 'year';
    });

    if (filteredPlans.length === 2 && monthlyPlan && yearlyPlan) {
        const discount = calculateDiscount(monthlyPlan.amount, yearlyPlan.amount);
        yearlyPlan.description = discount > 0 ? `${discount}% discount` : '';
        monthlyPlan.description = '';
    }
}

export function MultipleProductsPlansSection({products, selectedPlan, onPlanSelect, onPlanCheckout, changePlan = false}) {
    const cookiesDisabled = isCookiesDisabled();
    /**Don't allow plans selection if cookies are disabled */
    if (cookiesDisabled) {
        onPlanSelect = () => {};
    }

    if (changePlan) {
        return (
            <section className="gh-portal-plans">
                <div>
                    <ChangeProductSection
                        type='changePlan'
                        products={products}
                        selectedPlan={selectedPlan}
                        onPlanSelect={onPlanSelect}
                    />
                </div>
            </section>
        );
    }

    return (
        <section className="gh-portal-plans">
            <div>
                <ProductsSection
                    type='upgrade'
                    products={products}
                    onPlanSelect={onPlanSelect}
                    handleChooseSignup={(...args) => {
                        onPlanCheckout(...args);
                    }}
                />
            </div>
        </section>
    );
}

function getChangePlanClassNames({cookiesDisabled, site}) {
    let className = 'gh-portal-plans-container is-change-plan hide-checkbox';
    if (cookiesDisabled) {
        className += ' disabled';
    }

    return className;
}

function ChangePlanOptions({plans, selectedPlan, onPlanSelect, changePlan}) {
    addDiscountToPlans(plans);

    return plans.map(({name, currency_symbol: currencySymbol, amount, description, interval, id}) => {
        const price = amount / 100;
        const isChecked = selectedPlan === id;
        let displayName = interval === 'month' ? 'Monthly' : 'Yearly';

        let planClass = (isChecked ? 'gh-portal-plan-section checked' : 'gh-portal-plan-section');
        planClass += ' gh-portal-change-plan-section';
        const planNameClass = 'gh-portal-plan-name no-description';
        const featureClass = 'gh-portal-plan-featurewrapper';

        return (
            <div className={planClass} key={id} onClick={e => onPlanSelect(e, id)}>
                <h4 className={planNameClass}>{displayName}</h4>
                <PriceLabel currencySymbol={currencySymbol} price={price} interval={interval} />
                <div className={featureClass} style={{border: 'none', paddingTop: '3px'}}>
                    {(changePlan && selectedPlan === id ? <span className='gh-portal-plan-current'>Current plan</span> : '')}
                </div>
            </div>
        );
    });
}

export function ChangeProductPlansSection({product, plans, selectedPlan, onPlanSelect, changePlan = false}) {
    const {site} = useContext(AppContext);
    if (!product || hasOnlyFreePlan({plans})) {
        return null;
    }

    const cookiesDisabled = isCookiesDisabled();
    /**Don't allow plans selection if cookies are disabled */
    if (cookiesDisabled) {
        onPlanSelect = () => {};
    }
    const className = getChangePlanClassNames({cookiesDisabled, site});

    return (
        <section className="gh-portal-plans">
            <div className={className}>
                <ChangePlanOptions plans={plans} onPlanSelect={onPlanSelect} selectedPlan={selectedPlan} changePlan={changePlan} />
            </div>
        </section>
    );
}
