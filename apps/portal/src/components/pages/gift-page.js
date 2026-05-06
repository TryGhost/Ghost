import {useContext, useLayoutEffect, useRef, useState} from 'react';
import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import ActionButton from '../common/action-button';
import LoadingPage from './loading-page';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import giftCardOrbUrl from '../../images/gift-card-orb.svg';
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

/* Close icon sits over the brand-coloured right panel, so override the
   default grey from Frame.styles.js to a translucent white. */
.gh-portal-popup-container.full-size.gift .gh-portal-closeicon,
.gh-portal-popup-container.full-size.giftSuccess .gh-portal-closeicon,
.gh-portal-popup-container.full-size.giftRedemption .gh-portal-closeicon {
    color: rgba(255, 255, 255, 0.7);
}

.gh-portal-popup-container.full-size.gift .gh-portal-closeicon:hover,
.gh-portal-popup-container.full-size.giftSuccess .gh-portal-closeicon:hover,
.gh-portal-popup-container.full-size.giftRedemption .gh-portal-closeicon:hover {
    color: rgba(255, 255, 255, 0.95);
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
}

/* On the selection page only, the inner content's vertical position is
   locked once on first paint by useLayoutEffect (so tier switches push the
   CTA down rather than re-centering). flex-start lets that JS-applied
   margin-top do the actual centering math. Other gift pages keep the
   default flex centering. */
.gh-portal-content.gift .gh-portal-gift-checkout-left {
    align-items: flex-start;
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
    margin-bottom: 16px;
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

/* Each tier renders as an accordion item: the radio button row sits at top,
   and the benefits accordion expands below when selected. The border, radius
   and selected-state styling live on the wrapper so the benefits feel like
   they belong to the same card. */
.gh-portal-gift-checkout-tier-item {
    background: var(--white);
    border: 1px solid var(--grey11);
    border-radius: 10px;
    overflow: hidden;
    transition: border-color 0.2s ease, background-color 0.2s ease;
}

.gh-portal-gift-checkout-tier-item:hover {
    border-color: var(--grey9);
}

.gh-portal-gift-checkout-tier-item.selected {
    border-color: var(--brandcolor);
    background: color-mix(in srgb, var(--brandcolor) 6%, var(--white));
    box-shadow: 0 0 0 1px var(--brandcolor) inset;
}

.gh-portal-gift-checkout-tier {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    background: transparent;
    border: none;
    padding: 16px 20px;
    cursor: pointer;
    text-align: start;
    font: inherit;
    color: inherit;
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

.gh-portal-gift-checkout-tier-item.selected .gh-portal-gift-checkout-tier-radio {
    border-color: var(--brandcolor);
    background: var(--brandcolor);
}

.gh-portal-gift-checkout-tier-item.selected .gh-portal-gift-checkout-tier-radio::after {
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

/* Accordion wrapper inside each tier — collapses and expands its benefit
   list using the grid-template-rows trick, matching the 0.3s ease used by
   the right-side details toggle. */
.gh-portal-gift-checkout-tier-benefits {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s ease;
    /* Clip the grid item: even with min-height: 0, the inner's padding still
       renders ~20px tall, which Chrome leaks the first benefit through. */
    overflow: hidden;
}

.gh-portal-gift-checkout-tier-benefits[data-open="true"] {
    grid-template-rows: 1fr;
}

.gh-portal-gift-checkout-tier-benefits-inner {
    /* min-height: 0 overrides the default min-height: auto on grid items.
       Padding on this element contributes to the grid track's min-size
       (Chrome resolves 0fr to the inner padding-bottom otherwise), so we
       keep the inner padding-free and put the spacing on the benefits
       list instead. */
    min-height: 0;
    overflow: hidden;
}

.gh-portal-gift-checkout-tier-benefits-inner > .gh-portal-gift-checkout-benefits {
    padding: 0 20px 20px 22px;
}

.gh-portal-gift-checkout-benefits {
    display: flex;
    flex-direction: column;
    gap: 8px;
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

/* Inside the brand-coloured right panel, lighten benefit text + checkmark
   so they read against the saturated background. The checkmark SVG uses a
   hard-coded stroke so we override it explicitly rather than via color. */
.gh-portal-gift-checkout-right-panel .gh-portal-gift-checkout-benefit {
    color: rgba(255, 255, 255, 0.85);
}

.gh-portal-gift-checkout-right-panel .gh-portal-gift-checkout-benefit svg path {
    stroke: rgba(255, 255, 255, 0.85);
}

.gh-portal-gift-checkout .gh-portal-btn-primary {
    border-radius: 999px;
}

/* Sticky wrapper around the CTA: keeps the button visible at the bottom of
   the viewport when the left column is long enough to scroll, and adds a
   white→transparent fade at the top so scrolling content tucks under it
   instead of cutting against the button edge.
   Same pattern as .gh-portal-btn-container.sticky in frame.styles.js. */
.gh-portal-gift-checkout-cta-wrapper {
    position: sticky;
    bottom: 0;
    margin: 32px 0 -64px;
    padding: 32px 0 64px;
    background: linear-gradient(0deg, rgba(var(--whitergb), 1) 60%, rgba(var(--whitergb), 0) 100%);
    z-index: 1;
}

.gh-portal-gift-checkout-cta {
    width: 100%;
    height: 48px;
    font-size: 1.5rem;
    font-weight: 600;
}

.gh-portal-gift-checkout-right {
    position: sticky;
    top: 0;
    align-self: start;
    height: 100vh;
    display: flex;
    padding: 12px 12px 12px 0;
    overflow-y: auto;
}

/* Inner brand-coloured panel that holds the card. Inset 12px from top, right
   and bottom of the right column (no left inset — flush with the column
   boundary), with 32px rounded corners. */
.gh-portal-gift-checkout-right-panel {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--brandcolor);
    border-radius: 32px;
    padding: 64px 48px 128px;
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

.gh-portal-gift-checkout-details-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 24px;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    font-size: 1.4rem;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.15s ease;
}

.gh-portal-gift-checkout-details-toggle:hover {
    color: rgba(255, 255, 255, 0.95);
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
    min-height: 0;
    overflow: hidden;
}

/* Card is split into two zones via a hard-stop gradient: the brand-coloured
   top (~70%) holds the duration + tier in white text, the white bottom (~30%)
   holds the site icon + name. flex-direction: column-reverse so the existing
   site → meta DOM order maps to bottom → top visually. */
.gh-portal-gift-checkout-card {
    position: relative;
    width: 100%;
    max-width: 440px;
    aspect-ratio: 1.7 / 1;
    background: linear-gradient(to bottom, color-mix(in srgb, var(--brandcolor) 70%, var(--white)) 75%, var(--white) 75%);
    border-radius: 24px;
    padding: 28px 28px 20px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 24px 48px rgba(var(--blackrgb), 0.08), 0 4px 12px rgba(var(--blackrgb), 0.04);
    display: flex;
    flex-direction: column-reverse;
    justify-content: space-between;
    overflow: hidden;
    transform-style: preserve-3d;
    will-change: transform;
}

/* Soft orb glow layer on the brand surface. Sits behind the content
   (z-index 0) and is clipped to the brand area only (bottom: 25%) so it
   doesn't bleed into the white strip. */
.gh-portal-gift-checkout-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 25%;
    background-image: url("${giftCardOrbUrl}");
    background-size: 100% auto;
    background-position: 100px 100%;
    background-repeat: no-repeat;
    pointer-events: none;
    z-index: 0;
    opacity: 0.4;
}

/* Make sure the card content paints above the orb glow. */
.gh-portal-gift-checkout-card > * {
    position: relative;
    z-index: 1;
}

/* Lanyard slot — small semi-transparent pill at the top center of the card,
   so the brand-coloured top reads as an ID-badge surface. */
.gh-portal-gift-checkout-card::before {
    content: '';
    position: absolute;
    top: 16px;
    left: 50%;
    width: 56px;
    height: 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.25);
    transform: translateX(-50%);
    z-index: 2;
}


.gh-portal-gift-checkout-card-site {
    display: flex;
    align-items: center;
    gap: 8px;
}

.gh-portal-gift-checkout-card-site-icon {
    width: 24px;
    height: 24px;
    object-fit: cover;
}

.gh-portal-gift-checkout-card-site-name {
    font-size: 1.4rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--grey0);
}

.gh-portal-gift-checkout-card-duration {
    font-size: 2.6rem;
    font-weight: 600;
    color: var(--white);
    letter-spacing: -0.01em;
    line-height: 1.1;
}

.gh-portal-gift-checkout-card-tier {
    margin-top: 6px;
    font-size: 1.4rem;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.3;
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
        padding: 12px 12px 0;
        overflow: visible;
    }

    .gh-portal-gift-checkout-right-panel {
        padding: 32px 24px;
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
    const {cardRef, containerProps: cardTiltProps} = useCardTilt();
    const leftRef = useRef(null);
    const innerRef = useRef(null);
    const centeringDoneRef = useRef(false);

    // On first paint, vertically center the inner content within the left
    // column by computing the available space and pushing the inner down by
    // half. After this single measurement we never recompute — so when the
    // benefits change height on tier switch, only the bottom of the column
    // (the CTA) shifts, leaving the title and tier picker anchored.
    useLayoutEffect(() => {
        if (centeringDoneRef.current) {
            return;
        }
        const inner = innerRef.current;
        const left = leftRef.current;
        if (!inner || !left) {
            return;
        }
        const leftRect = left.getBoundingClientRect();
        if (leftRect.height === 0) {
            return;
        }
        const leftStyle = window.getComputedStyle(left);
        const pTop = parseFloat(leftStyle.paddingTop);
        const pBottom = parseFloat(leftStyle.paddingBottom);
        const available = leftRect.height - pTop - pBottom;
        const space = available - inner.getBoundingClientRect().height;
        if (space > 0) {
            inner.style.marginTop = `${space / 2}px`;
        }
        centeringDoneRef.current = true;
    });

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
                    <div className='gh-portal-gift-checkout-left' ref={leftRef}>
                        <div className='gh-portal-gift-checkout-bg' aria-hidden='true' />
                        <div className='gh-portal-gift-checkout-inner' ref={innerRef}>
                            <header className='gh-portal-gift-checkout-header'>
                                <h1 className='gh-portal-main-title'>Gift a membership</h1>
                                <p className='gh-portal-gift-checkout-subtitle'>
                                    Share a full membership to {siteTitle} with a friend or colleague
                                </p>
                            </header>

                            <div className='gh-portal-gift-checkout-section'>
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
                                        const benefits = product.benefits || [];
                                        return (
                                            <div
                                                key={product.id}
                                                className={'gh-portal-gift-checkout-tier-item' + (isSelected ? ' selected' : '')}
                                            >
                                                <button
                                                    type='button'
                                                    role='radio'
                                                    aria-checked={isSelected}
                                                    className='gh-portal-gift-checkout-tier'
                                                    onClick={() => setSelectedProductId(product.id)}
                                                    data-test-tier={product.name}
                                                >
                                                    <span className='gh-portal-gift-checkout-tier-radio' aria-hidden='true' />
                                                    <span className='gh-portal-gift-checkout-tier-name'>{product.name}</span>
                                                    <span className='gh-portal-gift-checkout-tier-price'>{getTierPriceLabel(product, activeInterval)}</span>
                                                </button>
                                                {benefits.length > 0 && (
                                                    <div
                                                        className='gh-portal-gift-checkout-tier-benefits'
                                                        data-open={isSelected}
                                                        aria-hidden={!isSelected}
                                                    >
                                                        <div className='gh-portal-gift-checkout-tier-benefits-inner'>
                                                            <div className='gh-portal-gift-checkout-benefits'>
                                                                {benefits.map((benefit, idx) => {
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
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className='gh-portal-gift-checkout-cta-wrapper'>
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
                    </div>

                    <div className='gh-portal-gift-checkout-right' {...cardTiltProps}>
                        <div className='gh-portal-gift-checkout-right-panel'>
                            <div className='gh-portal-gift-checkout-card-stack'>
                                <div ref={cardRef} className='gh-portal-gift-checkout-card'>
                                    <div className='gh-portal-gift-checkout-card-site'>
                                        {siteIcon && (
                                            <img className='gh-portal-gift-checkout-card-site-icon' src={siteIcon} alt='' />
                                        )}
                                        <span className='gh-portal-gift-checkout-card-site-name'>{siteTitle}</span>
                                    </div>
                                    <div className='gh-portal-gift-checkout-card-meta'>
                                        <div className='gh-portal-gift-checkout-card-duration'>{getDurationLabel(activeInterval)}</div>
                                        <div className='gh-portal-gift-checkout-card-tier'>{`${activeProduct.name} membership`}</div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default GiftPage;
