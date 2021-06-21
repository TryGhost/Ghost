import React, {useContext, useEffect, useState} from 'react';
import Switch from '../common/Switch';
import {getAllProducts, getCurrencySymbol, getPriceString, getStripeAmount, isCookiesDisabled} from '../../utils/helpers';
import AppContext from '../../AppContext';

export const ProductsSectionStyles = ({site}) => {
    const products = getAllProducts({site});
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

        .gh-portal-products-grid {
            display: grid;
            grid-template-columns: repeat(${productColumns(noOfProducts)}, minmax(0, 280px));
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


        .gh-portal-product-card {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            background: white;
            padding: 24px 24px 18px;
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
            font-size: 1.2rem;
            font-weight: 500;
            line-height: 1.45em;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-top: 7px;
            text-align: center;
            min-height: 24px;
            word-break: break-word;
            width: 100%;
            border-bottom: 1px solid var(--grey12);
            padding: 8px 0 16px;
            margin-bottom: 12px;
        }

        .gh-portal-product-description {
            font-size: 1.4rem;
            line-height: 1.5em;
            text-align: center;
            color: var(--grey5);
            margin-bottom: 24px;
        }

        .gh-portal-product-price {
            display: flex;
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
            color: var(--grey7);
            letter-spacing: 0.3px;
            margin-left: 2px;
        }

        .gh-portal-product-alternative-price {
            font-size: 1.15rem;
            line-height: 1.6em;
            color: var(--grey7);
            text-align: center;
            margin-top: 4px;
            letter-spacing: 0.3px;
            height: 18px;
        }

        @media (max-width: 480px) {
            .gh-portal-products {
                margin: 0 -32px;
                background: none;
            }

            .gh-portal-products-grid {
                grid-template-columns: unset;
                grid-gap: 20px;
                padding: 32px 0;
                width: 100%;
            }

            .gh-portal-products-priceswitch {
                padding-top: 18px;
            }

            .gh-portal-product-card {
                display: grid;
                grid-template-columns: 1fr auto;
                grid-gap: 12px;
                align-items: start;
                min-height: unset;
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

            .gh-portal-product-price {
                position: relative;
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
        }
    `;
};

const ProductsContext = React.createContext({
    selectedInterval: 'month',
    selectedProduct: 'free',
    setSelectedProduct: null
});

function productColumns(noOfProducts) {
    // TODO: has to take Free on/off setting into account
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
                <div className="gh-portal-product-description">{product.description}</div>
            </div>
            <ProductCardFooter product={product} />
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
    const {selectedProduct, setSelectedProduct} = useContext(ProductsContext);

    const cardClass = selectedProduct === 'free' ? 'gh-portal-product-card checked' : 'gh-portal-product-card';

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
                <div className="gh-portal-product-description">Free preview</div>
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

function ProductPriceSwitch({selectedInterval, setSelectedInterval}) {
    const {site} = useContext(AppContext);
    const {portal_plans: portalPlans} = site;
    if (!portalPlans.includes('monthly') || !portalPlans.includes('yearly')) {
        return null;
    }
    return (
        <div className="gh-portal-products-priceswitch">
            <span className="gh-portal-priceoption-label">Monthly</span>
            <Switch id='product-interval' onToggle={(e) => {
                const interval = selectedInterval === 'month' ? 'year' : 'month';
                setSelectedInterval(interval);
            }} checked={selectedInterval === 'year'} />
            <span className="gh-portal-priceoption-label">Yearly</span>
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

function ProductsSection({onPlanSelect, products}) {
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
        console.log('here');
        setSelectedProduct(defaultProductId);
    }, [defaultProductId]);

    if (!portalPlans.includes('monthly') && !portalPlans.includes('yearly')) {
        return null;
    }

    if (products.length === 0) {
        return null;
    }

    return (
        <ProductsContext.Provider value={{
            selectedInterval: activeInterval,
            selectedProduct,
            setSelectedProduct
        }}>
            <section className="gh-portal-products">
                <ProductPriceSwitch
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

export default ProductsSection;
