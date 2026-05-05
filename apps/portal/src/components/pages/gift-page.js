import {useContext, useEffect, useRef, useState} from 'react';
import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import ActionButton from '../common/action-button';
import LoadingPage from './loading-page';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import {getAvailableProducts, getCurrencySymbol, formatNumber, getStripeAmount, isCookiesDisabled, getActiveInterval} from '../../utils/helpers';
import useCardTilt from '../../utils/use-card-tilt';

// TODO: wrap strings with t() once copy is finalised
/* eslint-disable i18next/no-literal-string */

export const GiftPageStyles = `
.gh-portal-popup-container.full-size.gift,
.gh-portal-popup-container.full-size.giftSuccess,
.gh-portal-popup-container.full-size.giftRedemption {
    padding: 0;
}

.gh-portal-content.gift,
.gh-portal-content.giftSuccess,
.gh-portal-content.giftRedemption {
    position: relative;
    padding: 0;
    min-height: 100vh;
}

.gh-portal-gift-checkout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 100vh;
    width: 100%;
}

.gh-portal-gift-checkout-left {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--white);
    padding: 64px 48px 128px;
    overflow: hidden;
}

.gh-portal-gift-checkout-bg {
    display: none;
}

.gh-portal-gift-checkout-inner {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 496px;
    display: flex;
    flex-direction: column;
}

.gh-portal-gift-checkout-header {
    margin-bottom: 8px;
}

.gh-portal-gift-checkout-header .gh-portal-main-title {
    text-align: start;
    margin: 0 0 12px;
}

.gh-portal-gift-checkout-subtitle {
    margin: 0;
    font-size: 1.6rem;
    line-height: 1.45em;
    color: var(--grey3);
}

.gh-portal-gift-checkout-section {
    margin-top: 24px;
}

.gh-portal-gift-checkout-label {
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--grey6);
    margin-bottom: 12px;
}

.gh-portal-gift-checkout .gh-portal-products-pricetoggle {
    margin: 0;
}

.gh-portal-gift-checkout-tiers {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.gh-portal-gift-checkout-tier {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    background: var(--white);
    border: 1px solid var(--grey11);
    border-radius: 10px;
    padding: 16px 20px;
    cursor: pointer;
    text-align: start;
    transition: border-color 0.2s ease, background-color 0.2s ease;
    font: inherit;
    color: inherit;
}

.gh-portal-gift-checkout-tier:hover {
    border-color: var(--grey9);
}

.gh-portal-gift-checkout-tier.selected {
    border-color: var(--brandcolor);
    background: color-mix(in srgb, var(--brandcolor) 6%, var(--white));
    box-shadow: 0 0 0 1px var(--brandcolor) inset;
}

.gh-portal-gift-checkout-tier-radio {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px solid var(--grey9);
    background: var(--white);
    position: relative;
}

.gh-portal-gift-checkout-tier.selected .gh-portal-gift-checkout-tier-radio {
    border-color: var(--brandcolor);
    background: var(--brandcolor);
}

.gh-portal-gift-checkout-tier.selected .gh-portal-gift-checkout-tier-radio::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--white);
    transform: translate(-50%, -50%);
}

.gh-portal-gift-checkout-tier-name {
    flex: 1;
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--grey0);
}

.gh-portal-gift-checkout-tier-price {
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--grey0);
}

.gh-portal-gift-checkout-benefits {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-left: 4px;
}

.gh-portal-gift-checkout-benefit {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: var(--grey1);
    font-size: 1.45rem;
    line-height: 1.4;
}

.gh-portal-gift-checkout-benefit svg {
    width: 14px;
    height: 14px;
    margin-top: 4px;
    color: var(--grey1);
    flex-shrink: 0;
}

.gh-portal-gift-checkout .gh-portal-btn-primary {
    border-radius: 999px;
}

.gh-portal-gift-checkout-cta {
    width: 100%;
    height: 48px;
    margin-top: 32px;
    font-size: 1.5rem;
    font-weight: 600;
}

.gh-portal-gift-checkout-right {
    position: sticky;
    top: 0;
    align-self: start;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(to bottom, var(--white), color-mix(in srgb, var(--brandcolor) 5%, var(--white)));
    padding: 64px 48px 128px;
    overflow-y: auto;
}

.gh-portal-gift-checkout-card-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 440px;
}

/* Wraps the card so we can tilt it forward when "Gift details" is expanded,
   making the benefits feel like they're sliding out from behind the card.
   Composes cleanly with the cursor-driven tilt applied to the card itself. */
.gh-portal-gift-checkout-card-frame {
    width: 100%;
    transform-style: preserve-3d;
    perspective: 1200px;
    transition: transform 0.3s ease;
}

.gh-portal-gift-checkout-card-stack[data-revealing="true"] .gh-portal-gift-checkout-card-frame {
    transform: rotate(3deg);
}

.gh-portal-gift-checkout-card-benefits {
    width: 100%;
    margin-top: 28px;
    overflow: hidden;
    transition: height 0.3s ease;
}

.gh-portal-gift-checkout-details-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 24px;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: var(--grey5);
    font-size: 1.4rem;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.15s ease;
}

.gh-portal-gift-checkout-details-toggle:hover {
    color: var(--grey3);
}

.gh-portal-gift-checkout-details-toggle svg {
    width: 12px;
    height: 12px;
    transition: transform 0.2s ease;
}

.gh-portal-gift-checkout-details-toggle.is-open svg {
    transform: rotate(-180deg);
}

.gh-portal-gift-checkout-details {
    width: 100%;
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s ease, margin-top 0.3s ease;
    margin-top: 0;
}

.gh-portal-gift-checkout-details[data-open="true"] {
    grid-template-rows: 1fr;
    margin-top: 32px;
}

.gh-portal-gift-checkout-details-inner {
    overflow: hidden;
}

.gh-portal-gift-checkout-card {
    position: relative;
    width: 100%;
    max-width: 440px;
    aspect-ratio: 1.7 / 1;
    background: linear-gradient(to top right, var(--white), color-mix(in srgb, var(--brandcolor) 8%, var(--white)));
    border-radius: 32px;
    padding: 28px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 24px 48px rgba(var(--blackrgb), 0.08), 0 4px 12px rgba(var(--blackrgb), 0.04);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    transform-style: preserve-3d;
    will-change: transform;
}

.gh-portal-gift-checkout-card-site {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 8px;
}

.gh-portal-gift-checkout-card-site-icon {
    width: 24px;
    height: 24px;
    border-radius: 5px;
    object-fit: cover;
}

.gh-portal-gift-checkout-card-site-name {
    font-size: 1.4rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--grey0);
}

.gh-portal-gift-checkout-card-meta {
    position: relative;
    z-index: 2;
}

.gh-portal-gift-checkout-card-duration {
    font-size: 2.6rem;
    font-weight: 600;
    color: var(--grey0);
    letter-spacing: -0.01em;
    line-height: 1.1;
}

.gh-portal-gift-checkout-card-tier {
    margin-top: 6px;
    font-size: 1.4rem;
    color: var(--grey3);
    line-height: 1.3;
}

/* Wrapped-present cross ribbon: vertical + horizontal straps, bow at intersection */
.gh-portal-gift-checkout-card-ribbon-v,
.gh-portal-gift-checkout-card-ribbon-h {
    position: absolute;
    background: var(--brandcolor);
    opacity: 0.3;
    z-index: 1;
}

.gh-portal-gift-checkout-card-ribbon-v {
    top: 0;
    bottom: 0;
    right: 22%;
    width: 12px;
}

.gh-portal-gift-checkout-card-ribbon-h {
    left: 0;
    right: 0;
    top: 32%;
    height: 12px;
    transform: translateY(-50%);
}

.gh-portal-gift-checkout-card-bow {
    position: absolute;
    top: calc(32% - 42px);
    right: calc(22% - 40px);
    width: 90px;
    height: 86px;
    z-index: 2;
    color: var(--brandcolor);
    pointer-events: none;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.06)) drop-shadow(0 16px 32px rgba(0, 0, 0, 0.06));
}


@media (max-width: 880px) {
    .gh-portal-gift-checkout {
        grid-template-columns: 1fr;
        min-height: 0;
    }

    /* Drop sticky/100vh sizing — on mobile the right column should sit naturally
       above the left content, taking only the height it needs. */
    .gh-portal-gift-checkout-right {
        order: -1;
        position: static;
        height: auto;
        padding: 32px 24px;
        overflow: visible;
    }

    .gh-portal-gift-checkout-left {
        padding: 32px 24px 80px;
    }

    .gh-portal-gift-checkout-card,
    .gh-portal-gift-checkout-card-stack {
        max-width: 320px;
    }
}

@media (max-width: 480px) {
    .gh-portal-gift-checkout-header .gh-portal-main-title {
        font-size: 2.6rem;
    }

    .gh-portal-gift-checkout-card-duration {
        font-size: 2rem;
    }
}
`;

function GiftPriceSwitch({selectedInterval, setSelectedInterval}) {
    const {site} = useContext(AppContext);
    const {portal_plans: portalPlans} = site;

    if (!portalPlans.includes('monthly') || !portalPlans.includes('yearly')) {
        return null;
    }

    return (
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
            </button>
        </div>
    );
}

function getTierPriceLabel(product, selectedInterval) {
    const activePrice = selectedInterval === 'month' ? product.monthlyPrice : product.yearlyPrice;

    if (!activePrice) {
        return '';
    }

    const currencySymbol = getCurrencySymbol(activePrice.currency);
    return `${currencySymbol}${formatNumber(getStripeAmount(activePrice.amount))}`;
}

function getDurationLabel(selectedInterval) {
    return selectedInterval === 'month' ? '1 month' : '1 year';
}

const GiftPage = () => {
    const {site, brandColor, action, doAction} = useContext(AppContext);
    const [selectedInterval, setSelectedInterval] = useState(null);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const benefitsInnerRef = useRef(null);
    const [benefitsHeight, setBenefitsHeight] = useState(undefined);
    const {cardRef, containerProps: cardTiltProps} = useCardTilt();

    useEffect(() => {
        const node = benefitsInnerRef.current;
        if (!node || typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver((entries) => {
            setBenefitsHeight(entries[0].contentRect.height);
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    if (!site) {
        return <LoadingPage />;
    }

    const {portal_plans: portalPlans, portal_default_plan: portalDefaultPlan} = site;
    const activeInterval = getActiveInterval({portalPlans, portalDefaultPlan, selectedInterval});
    const products = getAvailableProducts({site}).filter(p => p.type === 'paid');

    const siteIcon = site.icon;
    const siteTitle = site.title || '';

    if (products.length === 0) {
        return (
            <>
                <CloseButton />
                <div className='gh-portal-content gift'>
                    <div className='gh-portal-gift-checkout'>
                        <div className='gh-portal-gift-checkout-left'>
                            <div className='gh-portal-gift-checkout-bg' aria-hidden='true' />
                            <div className='gh-portal-gift-checkout-inner'>
                                <header className='gh-portal-gift-checkout-header'>
                                    <h1 className='gh-portal-main-title'>Gift a membership</h1>
                                    <p className='gh-portal-gift-checkout-subtitle'>
                                        Gift subscriptions are not available right now.
                                    </p>
                                </header>
                            </div>
                        </div>
                        <div className='gh-portal-gift-checkout-right' aria-hidden='true' />
                    </div>
                </div>
            </>
        );
    }

    const activeProduct = products.find(p => p.id === selectedProductId) || products[0];
    const isPurchasing = action === 'checkoutGift:running';
    const isDisabled = isCookiesDisabled() || isPurchasing;

    const handlePurchase = (e) => {
        e.preventDefault();

        doAction('checkoutGift', {
            tierId: activeProduct.id,
            cadence: activeInterval
        });
    };

    return (
        <>
            <CloseButton />
            <div className='gh-portal-content gift'>
                <div className='gh-portal-gift-checkout'>
                    <div className='gh-portal-gift-checkout-left'>
                        <div className='gh-portal-gift-checkout-bg' aria-hidden='true' />
                        <div className='gh-portal-gift-checkout-inner'>
                            <header className='gh-portal-gift-checkout-header'>
                                <h1 className='gh-portal-main-title'>Gift a membership</h1>
                                <p className='gh-portal-gift-checkout-subtitle'>
                                    Share a full membership to {siteTitle} with a friend or colleague
                                </p>
                            </header>

                            <div className='gh-portal-gift-checkout-section'>
                                <div className='gh-portal-gift-checkout-label'>Duration</div>
                                <GiftPriceSwitch
                                    selectedInterval={activeInterval}
                                    setSelectedInterval={setSelectedInterval}
                                />
                            </div>

                            <div className='gh-portal-gift-checkout-section'>
                                <div className='gh-portal-gift-checkout-label'>Tier</div>
                                <div className='gh-portal-gift-checkout-tiers' role='radiogroup' aria-label='Tier'>
                                    {products.map((product) => {
                                        const isSelected = product.id === activeProduct.id;
                                        return (
                                            <button
                                                key={product.id}
                                                type='button'
                                                role='radio'
                                                aria-checked={isSelected}
                                                className={'gh-portal-gift-checkout-tier' + (isSelected ? ' selected' : '')}
                                                onClick={() => setSelectedProductId(product.id)}
                                                data-test-tier={product.name}
                                            >
                                                <span className='gh-portal-gift-checkout-tier-radio' aria-hidden='true' />
                                                <span className='gh-portal-gift-checkout-tier-name'>{product.name}</span>
                                                <span className='gh-portal-gift-checkout-tier-price'>{getTierPriceLabel(product, activeInterval)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <ActionButton
                                dataTestId='purchase-gift'
                                label='Continue to checkout'
                                onClick={handlePurchase}
                                disabled={isDisabled}
                                isRunning={isPurchasing}
                                brandColor={brandColor}
                                classes='gh-portal-gift-checkout-cta'
                                style={{width: '100%'}}
                            />
                        </div>
                    </div>

                    <div className='gh-portal-gift-checkout-right' {...cardTiltProps}>
                        <div className='gh-portal-gift-checkout-card-stack'>
                            <div ref={cardRef} className='gh-portal-gift-checkout-card' aria-hidden='true'>
                                <div className='gh-portal-gift-checkout-card-site'>
                                    {siteIcon && (
                                        <img className='gh-portal-gift-checkout-card-site-icon' src={siteIcon} alt='' />
                                    )}
                                    <span className='gh-portal-gift-checkout-card-site-name'>{siteTitle}</span>
                                </div>
                                <div className='gh-portal-gift-checkout-card-meta'>
                                    <div className='gh-portal-gift-checkout-card-duration'>{getDurationLabel(activeInterval)}</div>
                                    <div className='gh-portal-gift-checkout-card-tier'>{activeProduct.name}</div>
                                </div>
                                <div className='gh-portal-gift-checkout-card-ribbon-h' />
                                <div className='gh-portal-gift-checkout-card-ribbon-v' />
                                <svg className='gh-portal-gift-checkout-card-bow' viewBox='78 -2 90 86' xmlns='http://www.w3.org/2000/svg' aria-hidden='true' fill='currentColor' fillRule='evenodd' clipRule='evenodd'>
                                    <path d='M144.97 1.01186C147.471 0.122129 150.26 -0.292891 153.133 0.229636C156.058 0.761757 158.682 2.19718 160.872 4.38686C165.524 9.03938 166.185 14.9291 164.582 20.2384C163.08 25.217 159.616 29.8398 155.649 33.6447C150.07 38.996 142.324 43.8128 134.494 46.1457L156.801 73.8234L147.457 81.3546L122.879 50.8595L98.3012 81.3546L88.9574 73.8234L111.19 46.2384C103.253 43.9422 95.374 39.0677 89.7201 33.6447C85.7534 29.8398 82.2893 25.2169 80.7865 20.2384C79.1841 14.9291 79.8451 9.03938 84.4975 4.38686C86.6872 2.19723 89.3105 0.761751 92.2358 0.229636C95.1087 -0.292854 97.8981 0.122143 100.399 1.01186C105.26 2.74162 109.666 6.47713 113.237 10.6242C116.925 14.9077 120.297 20.3226 122.684 25.9962C125.071 20.3224 128.444 14.9078 132.132 10.6242C135.703 6.4771 140.109 2.74161 144.97 1.01186ZM96.3764 12.3175C95.3995 11.97 94.7641 11.9671 94.3832 12.0363C94.0547 12.0961 93.5929 12.2622 92.9828 12.8722C92.0356 13.8195 91.6948 14.8501 92.2748 16.7716C92.9549 19.0242 94.8576 21.9447 98.0268 24.9845C102.298 29.0813 107.807 32.4111 112.93 34.1994C111.244 28.8435 108.061 23.0037 104.144 18.4542C101.24 15.0821 98.471 13.063 96.3764 12.3175ZM150.986 12.0363C150.605 11.9671 149.97 11.9699 148.993 12.3175C146.898 13.063 144.129 15.082 141.225 18.4542C137.308 23.0037 134.125 28.8434 132.439 34.1994C137.562 32.4111 143.071 29.0813 147.342 24.9845C150.511 21.9446 152.414 19.0242 153.094 16.7716C153.674 14.8501 153.333 13.8195 152.386 12.8722C151.776 12.2622 151.314 12.0961 150.986 12.0363Z' />
                                </svg>
                            </div>

                            {activeProduct.benefits && activeProduct.benefits.length > 0 && (
                                <div
                                    className='gh-portal-gift-checkout-card-benefits'
                                    style={benefitsHeight !== undefined ? {height: benefitsHeight} : undefined}
                                >
                                    <div ref={benefitsInnerRef} className='gh-portal-gift-checkout-benefits'>
                                        {activeProduct.benefits.map((benefit, idx) => {
                                            const key = benefit?.id || `benefit-${idx}`;
                                            return (
                                                <div className='gh-portal-gift-checkout-benefit' key={key}>
                                                    <CheckmarkIcon alt='' />
                                                    <span>{benefit.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default GiftPage;
