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
            font-size: 1.25rem;
            letter-spacing: 0.25px;
            margin: 0 0 0 6px;
            padding: 2px 6px;
            top: unset;
            left: unset;
            right: unset;
            width: unset;
        }

        .gh-portal-products-priceswitch .gh-portal-discount-label:before {
            border-radius: 3px;
        }

        .gh-portal-products-grid {
            display: grid;
            grid-template-columns: repeat(${productColumns(noOfProducts)}, minmax(0, ${(productColumns(noOfProducts) <= 3 ? `360px` : `300px`)}));
            grid-gap: 32px;
            margin: 0 auto;
            padding: 32px 2vw;
        }

        @media (max-width: 1280px) {
            .gh-portal-products-grid {
                grid-template-columns: repeat(${((productColumns(noOfProducts) >= 3) ? 3 : productColumns(noOfProducts))}, minmax(0, 300px));
            }
        }

        @media (max-width: 960px) {
            .gh-portal-products-grid {
                grid-template-columns: repeat(${((productColumns(noOfProducts) >= 2) ? 2 : productColumns(noOfProducts))}, minmax(0, 300px));
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
            color: var(--grey2);
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
            color: var(--grey8);
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
            width: 13px;
            height: 13px;
            min-width: 12px;
            margin: 3px 6px 0 0;
            overflow: visible;
        }

        .gh-portal-benefit-checkmark polyline {
            stroke-width: 3px;
        }

        .gh-portal-benefit-title {
            flex-grow: 1;
            color: var(--grey5);
        }

        .gh-portal-products-grid.change-plan {
            padding: 0;
        }

        /* Vertical card style - for smaller screens sizes*/
        .gh-portal-product-card.vertical {
            display: none !important;
            grid-template-columns: 16px auto minmax(0, 300px);
            column-gap: 12px;
            row-gap: 8px;
            align-items: center;
            min-height: 68px;
            padding: 12px 20px;
        }

        .gh-portal-product-card.vertical .gh-portal-plan-checkbox {
            grid-row: 1;
            grid-column: 1 / 2;
            height: unset;
        }

        .gh-portal-product-card.vertical .gh-portal-plan-checkbox .checkmark {
            top: -9px;
            left: -5px;
        }

        .gh-portal-product-card.vertical .gh-portal-product-name {
            grid-row: 1;
            grid-column: 2 / 3;
            font-size: 1.7rem;
            letter-spacing: 0.3px;
            line-height: 1.3em;
            font-weight: 500;
            text-transform: none;
            text-align: left;
            margin: 4px 0;
            padding: 0;
            border-bottom: none;
            min-height: unset;
        }

        .gh-portal-product-card.vertical .gh-portal-product-pricecontainer {
            grid-row: 1;
            grid-column: 3 / 4;
        }

        .gh-portal-product-card.vertical .gh-portal-product-price {
            justify-content: flex-end;
            margin-top: -1px;
        }

        .gh-portal-product-card.vertical .gh-portal-product-price .amount {
            font-size: 2.6rem !important;
        }

        .gh-portal-product-card.vertical .gh-portal-product-price .billing-period {
            line-height: 1.3em;
            font-size: 1.1rem;
        }

        .gh-portal-product-card.vertical .gh-portal-product-alternative-price {
            display: none;
            text-align: right;
            margin-top: 1px;
            font-size: 1.1rem;
        }

        .gh-portal-product-card.vertical .gh-portal-product-description {
            grid-row: 2;
            grid-column: 2 / 4;
            margin-bottom: 0px;
            padding-top: 12px;
            padding-bottom: 8px;
            padding-left: 0;
            margin-top: 2px;
            border-top: 1px solid var(--grey12);
            text-align: left;
        }

        .gh-portal-product-card.vertical .gh-portal-product-benefits {
            grid-row: 3;
            grid-column: 2 / 4;
            margin: 0;
            padding-top: 0;
            padding-left: 2px;
        }

        .gh-portal-product-card.vertical .gh-portal-product-benefit {
            margin-bottom: 8px;
        }

        .gh-portal-product-card.vertical .gh-portal-product-description + .gh-portal-product-benefits {
            border-top: none;
            padding-top: 0;
            margin-top: -2px;
        }

        @media (max-width: 670px) {
            .gh-portal-products {
                margin: 24px -32px 0 -32px;
                padding: 12px 32px 20px 32px;
            }

            .gh-portal-products-grid {
                grid-template-columns: unset;
                grid-gap: 20px;
                padding: 32px 0 0;
                width: 100%;
                max-width: 420px;
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

            .gh-portal-product-card:not(.vertical) {
                display: none !important;
            }

            .gh-portal-product-card.vertical {
                display: grid !important;
            }

            .gh-portal-singleproduct-benefits .gh-portal-product-description {
                text-align: center;
                padding-bottom: 12px;
            }

            .gh-portal-product-price .currency-sign {
                font-size: 1.5rem;
            }

            .gh-portal-product-price .amount {
                font-size: 2.6rem;
            }

            .gh-portal-product-benefit:last-of-type {
                margin-bottom: 0;
            }
        }

        @media (max-width: 390px) {
            .gh-portal-product-card.vertical {
                padding: 12px;
            }

            .gh-portal-product-card.vertical .gh-portal-plan-checkbox {
                margin: 0 5px;
            }
        }

        /* Upgrade and change plan*/
        .gh-portal-upgrade-product {
            margin-top: -70px;
            margin-bottom: 32px;
            padding-top: 60px;
            padding-bottom: 32px;
        }

        .gh-portal-upgrade-product .gh-portal-products-grid {
            grid-template-columns: unset;
            grid-gap: 20px;
            width: 100%;
            padding: 32px 0 0;
        }

        .gh-portal-upgrade-product .gh-portal-product-card {
            display: none !important;
        }

        .gh-portal-upgrade-product .gh-portal-product-card.vertical {
            display: grid !important;
        }

        .gh-portal-upgrade-product .gh-portal-discount-label {
            display: none;
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

function ProductCardPrice({product}) {
    const {selectedInterval} = useContext(ProductsContext);
    const monthlyPrice = product.monthlyPrice;
    const yearlyPrice = product.yearlyPrice;
    const activePrice = selectedInterval === 'month' ? monthlyPrice : yearlyPrice;
    const alternatePrice = selectedInterval === 'month' ? yearlyPrice : monthlyPrice;
    if (!monthlyPrice || !yearlyPrice) {
        return null;
    }
    return (
        <div className="gh-portal-product-card-pricecontainer">
            <div className="gh-portal-product-price">
                <span className="currency-sign">{getCurrencySymbol(activePrice.currency)}</span>
                <span className="amount">{getStripeAmount(activePrice.amount)}</span>
                <span className="billing-period">/{activePrice.interval}</span>
            </div>
            <ProductCardAlternatePrice price={alternatePrice} />
        </div>
    );
}

function ProductCard({product}) {
    const {selectedProduct, setSelectedProduct} = useContext(ProductsContext);
    const cardClass = selectedProduct === product.id ? 'gh-portal-product-card checked' : 'gh-portal-product-card';

    // Product cards are duplicated because their design is too different for mobile devices to handle it purely in CSS
    return (
        <>
            {/* Standard, desktop card */}
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
                <ProductCardPrice product={product} />
            </div>

            {/* Vertical version */}
            <div className={cardClass + ' vertical'} key={product.id} onClick={(e) => {
                e.stopPropagation();
                setSelectedProduct(product.id);
            }}>
                <Checkbox name={product.id} id={`${product.id}-checkbox`} isChecked={selectedProduct === product.id} onProductSelect={() => {
                    setSelectedProduct(product.id);
                }} />
                <h4 className="gh-portal-product-name">{product.name}</h4>
                <ProductCardPrice product={product} />
                {product.description ? <div className="gh-portal-product-description">{product.description}</div> : ''}
                <ProductBenefitsContainer product={product} />
            </div>
        </>
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
    const {selectedProduct, selectedInterval, setSelectedProduct} = useContext(ProductsContext);

    const cardClass = selectedProduct === 'free' ? 'gh-portal-product-card free checked' : 'gh-portal-product-card free';

    // Product cards are duplicated because their design is too different for mobile devices to handle it purely in CSS
    return (
        <>
            {/* Standard, desktop card */}
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
                <div className="gh-portal-product-card-pricecontainer">
                    <div className="gh-portal-product-price">
                        <span className="currency-sign">$</span>
                        <span className="amount">0</span>
                    </div>
                    <div className="gh-portal-product-alternative-price"></div>
                </div>
            </div>

            {/* Vertical version */}
            <div className={cardClass + ' vertical'} onClick={(e) => {
                e.stopPropagation();
                setSelectedProduct('free');
            }}>
                <Checkbox name='x' id='x' isChecked={selectedProduct === 'free'} onProductSelect={() => {
                    setSelectedProduct('free');
                }} />
                <h4 className="gh-portal-product-name">Free</h4>
                <div className="gh-portal-product-price">
                    <span className="currency-sign">$</span>
                    <span className="amount">0</span>
                    <span className="billing-period">/{selectedInterval}</span>
                </div>
                <div className="gh-portal-product-description">Free preview of {(site.title)}</div>
            </div>
        </>
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

    if (products && selectedProduct !== 'free') {
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
    if (selectedPrice.id === activePrice.id) {
        return (
            <div className="mt1">
                <span className="gh-portal-plan-current">Current Plan</span>
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
    const cardClass = selectedProduct === product.id ? 'gh-portal-product-card vertical checked' : 'gh-portal-product-card vertical';
    const monthlyPrice = product.monthlyPrice;
    const yearlyPrice = product.yearlyPrice;
    const memberActivePrice = getMemberActivePrice({member});

    const selectedPrice = selectedInterval === 'month' ? monthlyPrice : yearlyPrice;

    return (
        <div className={cardClass} key={product.id} onClick={(e) => {
            e.stopPropagation();
            setSelectedProduct(product.id);
        }}>
            <Checkbox name={product.id} id={`${product.id}-checkbox`} isChecked={selectedProduct === product.id} onProductSelect={() => {
                setSelectedProduct(product.id);
            }} />
            <h4 className="gh-portal-product-name">{product.name}</h4>
            <ProductCardPrice product={product} />
            {/* {product.description ? <div className="gh-portal-product-description">{product.description}</div> : ''} */}
            <ProductDescription product={product} selectedPrice={selectedPrice} activePrice={memberActivePrice} />
            <ProductBenefitsContainer product={product} />
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
