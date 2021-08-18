import React, {useContext, useEffect, useState} from 'react';
import Switch from '../common/Switch';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import {getSiteProducts, getCurrencySymbol, getPriceString, getStripeAmount, isCookiesDisabled, getMemberActivePrice, getProductFromPrice} from '../../utils/helpers';
import AppContext from '../../AppContext';
import ActionButton from './ActionButton';
import calculateDiscount from '../../utils/discount';

export const ProductsSectionStyles = ({site}) => {
    const products = getSiteProducts({site});
    const noOfProducts = products.length;
    return `
        .gh-portal-products {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: var(--grey13);
            margin: 40px -32px;
            padding: 0 32px;
        }

        .gh-portal-products-priceswitch {
            display: flex;
            justify-content: center;
            padding-top: 32px;
        }

        .gh-portal-priceoption-label {
            font-size: 1.3rem;
            font-weight: 600;
            letter-spacing: 0.3px;
            text-transform: uppercase;
            margin: 0 6px;
            min-width: 180px;
        }

        .gh-portal-priceoption-label.monthly {
            text-align: right;
        }

        .gh-portal-products-priceswitch .gh-portal-for-switch label, .gh-portal-for-switch .container {
            width: 43px !important;
        }

        .gh-portal-products-priceswitch .gh-portal-for-switch .input-toggle-component,
        .gh-portal-products-priceswitch .gh-portal-for-switch label:hover input:not(:checked) + .input-toggle-component,
        .gh-portal-products-priceswitch .gh-portal-for-switch .container:hover input:not(:checked) + .input-toggle-component {
            background: var(--grey1);
            border-color: var(--grey1);
            box-shadow: none;
            width: 43px !important;
            height: 24px !important;
        }

        .gh-portal-products-priceswitch .gh-portal-for-switch .input-toggle-component:before {
            height: 18px !important;
            width: 18px !important;
        }

        .gh-portal-products-priceswitch .gh-portal-for-switch input:checked + .input-toggle-component {
            background: var(--grey1);
        }

        .gh-portal-products-priceswitch .gh-portal-for-switch input:checked + .input-toggle-component:before {
            transform: translateX(19px);
        }

        .gh-portal-discount-label {
            position: absolute;
            top: -19px;
            left: -1px;
            right: -1px;
            color: var(--brandcolor);
            font-size: 1.1rem;
            font-weight: 600;
            letter-spacing: 0.3px;
            text-transform: uppercase;
            padding: 0px 4px;
            text-align: center;
        }
        
        .gh-portal-discount-label:before {
            position: absolute;
            content: "";
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            background: var(--brandcolor);
            opacity: 0.15;
            border-radius: 2px 2px 0 0;
        }

        .gh-portal-products-priceswitch .gh-portal-discount-label {
            position: relative;
            font-size: 1.3rem;
            letter-spacing: 0.3px;
            margin: 0 0 0 4px;
            padding: 2px 6px;
            top: unset;
            left: unset;
            right: unset;
            width: unset;
        }

        .gh-portal-products-priceswitch. gh-portal-discount-label:before {
            border-radius: 5px;
        }

        .gh-portal-products-grid {
            display: grid;
            grid-template-columns: repeat(${productColumns(noOfProducts)}, minmax(0, ${(productColumns(noOfProducts) <= 3 ? `360px` : `300px`)}));
            grid-gap: 32px;
            margin: 0 auto;
            padding: 32px 2vw;
        }

        @media (max-width: 1080px) {
            .gh-portal-products-grid {
                grid-template-columns: repeat(${((productColumns(noOfProducts) >= 3) ? 3 : productColumns(noOfProducts))}, minmax(0, 300px));
            }
        }

        @media (max-width: 800px) {
            .gh-portal-products-grid {
                grid-template-columns: repeat(${((productColumns(noOfProducts) >= 2) ? 2 : productColumns(noOfProducts))}, minmax(0, 300px));
            }
        }

        @media (max-width: 600px) {
            .gh-portal-products-grid {
                grid-template-columns: repeat(1, minmax(0, 1fr));
            }
        }

        @media (max-width: 360px) {
            div:not(.gh-portal-products-priceswitch) .gh-portal-discount-label {
                font-size: 0.9rem;
                white-space: nowrap;
            }
        }


        .gh-portal-product-card {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            background: white;
            padding: 24px;
            border-radius: 3px;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            min-height: 240px;
            cursor: pointer;
        }

        .gh-portal-product-card.checked::before {
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
            border-radius: 3px;
        }

        .gh-portal-product-card.checked {
            box-shadow: none;
        }

        .gh-portal-product-card-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
        }

        .gh-portal-product-name {
            font-size: 1.3rem;
            font-weight: 500;
            line-height: 1.45em;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-top: 7px;
            text-align: center;
            min-height: 24px;
            word-break: break-word;
            width: 100%;
            color: var(--grey1);
            border-bottom: 1px solid var(--grey12);
            padding: 8px 0 16px;
            margin-bottom: 12px;
        }

        .gh-portal-product-description {
            font-size: 1.35rem;
            font-weight: 500;
            line-height: 1.45em;
            text-align: center;
            color: var(--grey3);
            margin-bottom: 14px;
            margin-top: 8px;
            padding: 0 4px;
            width: 100%;
        }

        .gh-portal-product-card:not(.free) .gh-portal-product-description {
            padding-bottom: 20px;
            margin-bottom: 16px;
        }

        .gh-portal-product-price {
            display: flex;
            justify-content: center;
        }

        .gh-portal-product-price .currency-sign {
            align-self: flex-start;
            font-size: 2.0rem;
            font-weight: 500;
            line-height: 1.3em;
        }

        .gh-portal-product-price .amount {
            font-size: 3.3rem;
            font-weight: 500;
            line-height: 1em;
        }

        .gh-portal-product-price .billing-period {
            align-self: flex-end;
            font-size: 1.3rem;
            line-height: 1.6em;
            color: var(--grey4);
            letter-spacing: 0.3px;
            margin-left: 2px;
        }

        .gh-portal-product-alternative-price {
            font-size: 1.2rem;
            line-height: 1.6em;
            color: var(--grey3);
            text-align: center;
            margin-top: 4px;
            letter-spacing: 0.3px;
            height: 18px;
        }

        .gh-portal-product-benefits {
            font-size: 1.3rem;
            line-height: 1.45em;
            margin: -8px 0 0;
            padding: 16px 8px 16px;
            color: var(--grey3);
            width: 100%;
        }

        .gh-portal-product-card .gh-portal-product-description + .gh-portal-product-benefits {
            border-top: 1px solid var(--grey12);
            margin-top: -16px;
            padding-top: 24px;
        }

        .gh-portal-product-benefit {
            display: flex;
            align-items: flex-start;
            margin-bottom: 12px;
        }

        .gh-portal-benefit-checkmark {
            width: 12px;
            height: 12px;
            min-width: 12px;
            margin: 3px 6px 0 0;
            overflow: visible;
        }

        .gh-portal-benefit-checkmark path {
            stroke-width: 2.5px;
        }

        .gh-portal-benefit-title {
            flex-grow: 1;
            color: var(--grey5);
        }

        .gh-portal-product-benefits.vertical {
            display: none !important;
        }

        .gh-portal-products-grid.change-plan {
            padding: 0;
        }

        @media (max-width: 480px) {
            .gh-portal-products {
                margin: 0 -32px;
                background: none;
            }

            .gh-portal-products-grid {
                grid-template-columns: unset;
                grid-gap: 20px;
                padding: 32px 0 0;
                width: 100%;
            }

            .gh-portal-products-priceswitch {
                padding-top: 18px;
            }

            .gh-portal-product-card {
                display: grid;
                grid-template-columns: 1fr minmax(60px, auto);
                grid-gap: 12px;
                align-items: start;
                min-height: 68px;
                padding: 12px 20px;
                background: none;
                border: 1px solid var(--grey12);
                box-shadow: none;
            }

            .gh-portal-product-card-header {
                grid-row: 1;
                display: grid;
                grid-template-columns: 20px auto;
            }

            .gh-portal-product-name {
                margin: 4px 0;
                padding: 0;
                text-align: left;
                border-bottom: none;
                min-height: unset;
            }

            .gh-portal-product-description {
                grid-column: 2 / 3;
                margin-bottom: 0px;
                text-align: left;
            }

            .gh-portal-singleproduct-benefits .gh-portal-product-description {
                text-align: center;
                padding-bottom: 12px;
            }

            .gh-portal-product-price {
                position: relative;
                justify-content: flex-end;
                width: 100%;
            }

            .gh-portal-product-price .currency-sign {
                font-size: 1.5rem;
            }

            .gh-portal-product-price .amount {
                font-size: 2.6rem;
            }

            .gh-portal-product-price .billing-period {
                position: absolute;
                right: 0;
                top: 24px;
                font-size: 1.2rem;
            }

            .gh-portal-product-card-footer {
                grid-row: 1;
            }

            .gh-portal-product-alternative-price {
                display: none;
            }

            .gh-portal-product-benefits {
                display: none;
            }

            .gh-portal-product-benefits.vertical {
                grid-column: 2;
                padding: 12px 20px;
                margin-top: 0px;
                display: block !important;
                grid-row: 2;
                grid-column: 1 / 3;
            }

            .gh-portal-product-benefit:last-of-type {
                margin-bottom: 0;
            }
        }

        .gh-portal-upgrade-product.gh-portal-products {
            margin: 0 -32px;
            background: none;
        }

        .gh-portal-upgrade-product .gh-portal-products-grid {
            grid-template-columns: unset;
            grid-gap: 20px;
            width: 100%;
        }

        .gh-portal-upgrade-product .gh-portal-products-grid:not(.change-plan) {
            padding: 32px 0 0;
        }

        .gh-portal-upgrade-product .gh-portal-products-grid.change-plan .gh-portal-product-card {
            cursor: auto;
        }

        .gh-portal-upgrade-product .gh-portal-products-priceswitch {
            padding-top: 18px;
        }

        .gh-portal-upgrade-product .gh-portal-product-card {
            display: grid;
            grid-template-columns: 1fr minmax(60px,auto);
            grid-gap: 12px;
            align-items: start;
            min-height: 68px;
            padding: 12px 20px;
            background: none;
            border: 1px solid var(--grey11);
            box-shadow: none;
        }

        .gh-portal-upgrade-product .gh-portal-product-card-header {
            grid-row: 1;
            display: grid;
            grid-template-columns: 20px auto;
        }

        .gh-portal-upgrade-product .gh-portal-product-name {
            margin: 4px 0;
            padding: 0;
            text-align: left;
            border-bottom: none;
            min-height: unset;
        }

        .gh-portal-upgrade-product .gh-portal-product-description {
            grid-column: 2 / 3;
            grid-row: 2;
            margin-bottom: 0px;
            text-align: left;
        }

        .gh-portal-upgrade-product .gh-portal-product-price {
            position: relative;
            justify-content: flex-end;
            width: 100%;
        }

        .gh-portal-upgrade-product .gh-portal-product-price .currency-sign {
            font-size: 1.5rem;
        }

        .gh-portal-upgrade-product .gh-portal-product-price .amount {
            font-size: 2.6rem;
        }

        .gh-portal-upgrade-product .gh-portal-product-price .billing-period {
            position: absolute;
            right: 0;
            top: 24px;
            font-size: 1.2rem;
        }

        .gh-portal-upgrade-product .gh-portal-product-card-footer {
            grid-row: 1;
        }

        .gh-portal-upgrade-product .gh-portal-product-alternative-price {
            display: none;
        }

        .gh-portal-upgrade-product .gh-portal-product-benefits {
            display: none;
        }

        .gh-portal-upgrade-product .gh-portal-product-benefits.vertical {
            grid-column: 2;
            padding: 12px 20px;
            margin-top: 0px;
            display: block !important;
            grid-row: 2;
            grid-column: 1 / 3;
        }

        .gh-portal-upgrade-product .gh-portal-product-benefit:last-of-type {
            margin-bottom: 0;
        }

        .gh-portal-products-grid.change-plan .gh-portal-product-card-header {
            grid-template-columns: auto;
            grid-column: 1 / 3;
        }

        .gh-portal-products-grid.change-plan .gh-portal-product-name {
            text-align: center;
            font-weight: 600;
        }

        .gh-portal-products-grid.change-plan .gh-portal-product-description {
            text-align: center;
            grid-column: 1;
        }
    `;
};

const ProductsContext = React.createContext({
    selectedInterval: 'month',
    selectedProduct: 'free',
    selectedPlan: null,
    setSelectedProduct: null
});

function productColumns(noOfProducts) {
    return noOfProducts >= 5 ? 5 : noOfProducts;
}

function Checkbox({name, id, onProductSelect, isChecked, disabled = false}) {
    if (isCookiesDisabled()) {
        disabled = true;
    }
    return (
        <div className='gh-portal-plan-checkbox'>
            <input
                name={name}
                key={id}
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                    onProductSelect(e, id);
                }}
                aria-label={name}
                disabled={disabled}
            />
            <span className='checkmark' onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                    onProductSelect(e, id);
                }
            }}></span>
        </div>
    );
}

function ProductBenefits({product}) {
    if (!product.benefits || !product.benefits.length) {
        return null;
    }

    return product.benefits.map((benefit) => {
        return (
            <div className="gh-portal-product-benefit">
                <CheckmarkIcon className='gh-portal-benefit-checkmark' alt=''/>
                <div className="gh-portal-benefit-title">{benefit.name}</div>
            </div>
        );
    });
}

function ProductBenefitsContainer({product, showVertical = false, hide = false}) {
    if (!product.benefits || !product.benefits.length || hide) {
        return null;
    }

    let className = 'gh-portal-product-benefits';
    if (showVertical) {
        className += ' vertical';
    }
    return (
        <div className={className}>
            <ProductBenefits product={product} />
        </div>
    );
}

function ProductCardFooterAlternatePrice({price}) {
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

function ProductCardFooter({product}) {
    const {selectedInterval} = useContext(ProductsContext);
    const monthlyPrice = product.monthlyPrice;
    const yearlyPrice = product.yearlyPrice;
    const activePrice = selectedInterval === 'month' ? monthlyPrice : yearlyPrice;
    const alternatePrice = selectedInterval === 'month' ? yearlyPrice : monthlyPrice;
    if (!monthlyPrice || !yearlyPrice) {
        return null;
    }
    return (
        <div className="gh-portal-product-card-footer">
            <div className="gh-portal-product-price">
                <span className="currency-sign">{getCurrencySymbol(activePrice.currency)}</span>
                <span className="amount">{getStripeAmount(activePrice.amount)}</span>
                <span className="billing-period">/{activePrice.interval}</span>
            </div>
            <ProductCardFooterAlternatePrice price={alternatePrice} />
        </div>
    );
}

function ProductCard({product}) {
    const {selectedProduct, setSelectedProduct} = useContext(ProductsContext);
    const cardClass = selectedProduct === product.id ? 'gh-portal-product-card checked' : 'gh-portal-product-card';

    return (
        <div className={cardClass} key={product.id} onClick={(e) => {
            e.stopPropagation();
            setSelectedProduct(product.id);
        }}>
            <div className="gh-portal-product-card-header">
                <Checkbox name={product.id} id={`${product.id}-checkbox`} isChecked={selectedProduct === product.id} onProductSelect={() => {
                    setSelectedProduct(product.id);
                }} />
                <h4 className="gh-portal-product-name">{product.name}</h4>
                {product.description ? <div className="gh-portal-product-description">{product.description}</div> : ''}
                <ProductBenefitsContainer product={product} />
            </div>
            <ProductCardFooter product={product} />
            <ProductBenefitsContainer product={product} showVertical={true} />
        </div>
    );
}

function ProductCards({products}) {
    return products.map((product) => {
        if (product.id === 'free') {
            return (
                <FreeProductCard key={product.id} />
            );
        }
        return (
            <ProductCard product={product} key={product.id} />
        );
    });
}

function FreeProductCard() {
    const {site} = useContext(AppContext);
    const {selectedProduct, setSelectedProduct} = useContext(ProductsContext);

    const cardClass = selectedProduct === 'free' ? 'gh-portal-product-card free checked' : 'gh-portal-product-card free';

    return (
        <div className={cardClass} onClick={(e) => {
            e.stopPropagation();
            setSelectedProduct('free');
        }}>
            <div className="gh-portal-product-card-header">
                <Checkbox name='x' id='x' isChecked={selectedProduct === 'free'} onProductSelect={() => {
                    setSelectedProduct('free');
                }} />
                <h4 className="gh-portal-product-name">Free</h4>
                <div className="gh-portal-product-description">Free preview of {(site.title)}</div>
            </div>
            <div className="gh-portal-product-card-footer">
                <div className="gh-portal-product-price">
                    <span className="currency-sign">$</span>
                    <span className="amount">0</span>
                </div>
                <div className="gh-portal-product-alternative-price"></div>
            </div>
        </div>
    );
}

function YearlyDiscount({discount}) {
    if (discount === 0) {
        return null;
    }

    return (
        <>
            <span className="gh-portal-discount-label">{discount}% discount</span>
        </>
    );
}

function ProductPriceSwitch({products, selectedInterval, setSelectedInterval}) {
    const {site} = useContext(AppContext);
    const {selectedProduct} = useContext(ProductsContext);
    const {portal_plans: portalPlans} = site;
    if (!portalPlans.includes('monthly') || !portalPlans.includes('yearly')) {
        return null;
    }

    let yearlyDiscount = 0;

    if (selectedProduct !== 'free') {
        const product = products.find(prod => prod.id === selectedProduct);
        yearlyDiscount = calculateDiscount(product.monthlyPrice.amount, product.yearlyPrice.amount);
    }

    return (
        <div className="gh-portal-products-priceswitch">
            <span className="gh-portal-priceoption-label monthly">Monthly</span>
            <Switch id='product-interval' onToggle={(e) => {
                const interval = selectedInterval === 'month' ? 'year' : 'month';
                setSelectedInterval(interval);
            }} checked={selectedInterval === 'year'} />
            <span className="gh-portal-priceoption-label">
                Yearly
                <YearlyDiscount discount={yearlyDiscount} />
            </span>
        </div>
    );
}

function getSelectedPrice({products, selectedProduct, selectedInterval}) {
    let selectedPrice = null;
    if (selectedProduct === 'free') {
        selectedPrice = {id: 'free'};
    } else {
        const product = products.find(prod => prod.id === selectedProduct);
        selectedPrice = selectedInterval === 'month' ? product.monthlyPrice : product.yearlyPrice;
    }
    return selectedPrice;
}

function getActiveInterval({portalPlans, selectedInterval = 'month'}) {
    if (selectedInterval === 'month' && portalPlans.includes('monthly')) {
        return 'month';
    }

    if (selectedInterval === 'year' && portalPlans.includes('yearly')) {
        return 'year';
    }

    if (portalPlans.includes('monthly')) {
        return 'month';
    }

    if (portalPlans.includes('yearly')) {
        return 'year';
    }
}

function ProductsSection({onPlanSelect, products, type = null}) {
    const {site} = useContext(AppContext);
    const {portal_plans: portalPlans} = site;
    const defaultInterval = getActiveInterval({portalPlans});

    const defaultProductId = products.length > 0 ? products[0].id : 'free';
    const [selectedInterval, setSelectedInterval] = useState(defaultInterval);
    const [selectedProduct, setSelectedProduct] = useState(defaultProductId);

    const selectedPrice = getSelectedPrice({products, selectedInterval, selectedProduct});
    const activeInterval = getActiveInterval({portalPlans, selectedInterval});

    useEffect(() => {
        onPlanSelect(null, selectedPrice.id);
    }, [selectedPrice.id, onPlanSelect]);

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
    return (
        <ProductsContext.Provider value={{
            selectedInterval: activeInterval,
            selectedProduct,
            setSelectedProduct
        }}>
            <section className={className}>
                <ProductPriceSwitch
                    products={products}
                    selectedInterval={activeInterval}
                    setSelectedInterval={setSelectedInterval}
                />

                <div className="gh-portal-products-grid">
                    <ProductCards products={products} />
                </div>
            </section>
        </ProductsContext.Provider>
    );
}

export function ChangeProductSection({onPlanSelect, selectedPlan, products, type = null}) {
    const {site, member, brandColor} = useContext(AppContext);
    const {portal_plans: portalPlans} = site;
    const activePrice = getMemberActivePrice({member});
    const activeMemberProduct = getProductFromPrice({site, priceId: activePrice.id});
    const defaultInterval = getActiveInterval({portalPlans, selectedInterval: activePrice.interval});
    const defaultProductId = activeMemberProduct?.id || products?.[0]?.id;
    const [selectedInterval, setSelectedInterval] = useState(defaultInterval);
    const [selectedProduct, setSelectedProduct] = useState(defaultProductId);

    const selectedPrice = getSelectedPrice({products, selectedInterval, selectedProduct});
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
                />

                <div className="gh-portal-products-grid">
                    <ChangeProductCards products={products} />
                </div>
                <ActionButton
                    onClick={e => onPlanSelect(null, selectedPrice.id)}
                    isRunning={false}
                    disabled={activePrice.id === selectedPrice.id}
                    isPrimary={true}
                    brandColor={brandColor}
                    label={'Continue'}
                    style={{height: '40px', width: '100%', marginTop: '24px'}}
                />
            </section>
        </ProductsContext.Provider>
    );
}

function CurrentPlanLabel({selectedPrice, activePrice}) {
    const {brandColor} = useContext(AppContext);
    if (selectedPrice.id === activePrice.id) {
        return (
            <div style={{marginTop: '6px'}}>
                <span style={{
                    color: 'black',
                    border: `1px solid ${brandColor}`,
                    background: brandColor,
                    borderRadius: '6px',
                    padding: '3px'
                }}>Current Plan</span>
            </div>
        );
    }
    return null;
}

function ProductDescription({product, selectedPrice, activePrice}) {
    if (product?.description) {
        return (
            <div className="gh-portal-product-description">
                {product.description}
                <CurrentPlanLabel selectedPrice={selectedPrice} activePrice={activePrice} />
            </div>
        );
    }
    return null;
}

function ChangeProductCard({product}) {
    const {member} = useContext(AppContext);
    const {selectedProduct, setSelectedProduct, selectedInterval} = useContext(ProductsContext);
    const cardClass = selectedProduct === product.id ? 'gh-portal-product-card checked' : 'gh-portal-product-card';
    const monthlyPrice = product.monthlyPrice;
    const yearlyPrice = product.yearlyPrice;
    const memberActivePrice = getMemberActivePrice({member});

    const selectedPrice = selectedInterval === 'month' ? monthlyPrice : yearlyPrice;

    return (
        <div className={cardClass} key={product.id} onClick={(e) => {
            e.stopPropagation();
            setSelectedProduct(product.id);
        }}>
            <div className="gh-portal-product-card-header">
                <Checkbox name={product.id} id={`${product.id}-checkbox`} isChecked={selectedProduct === product.id} onProductSelect={() => {
                    setSelectedProduct(product.id);
                }} />
                <h4 className="gh-portal-product-name">{product.name}</h4>
                <ProductDescription product={product} selectedPrice={selectedPrice} activePrice={memberActivePrice} />
                <ProductBenefitsContainer product={product} hide={selectedProduct !== product.id} />
            </div>
            <ProductCardFooter product={product} />
            <ProductBenefitsContainer product={product} showVertical={true} hide={selectedProduct !== product.id} />
        </div>
    );
}

function ChangeProductCards({products}) {
    return products.map((product) => {
        if (product.id === 'free') {
            return null;
        }
        return (
            <ChangeProductCard product={product} key={product.id} />
        );
    });
}

export default ProductsSection;
