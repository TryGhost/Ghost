import {useContext, useLayoutEffect, useRef, useState} from 'react';
import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import ActionButton from '../common/action-button';
import GiftCard from '../common/gift-card';
import InputField from '../common/input-field';
import LoadingPage from './loading-page';
import CheckmarkIcon from '../../images/icons/checkmark.svg?react';
import {getAvailableProducts, getCurrencySymbol, formatNumber, getStripeAmount, isCookiesDisabled, getActiveInterval} from '../../utils/helpers';
import {getGiftDurationLabel} from '../../utils/gift-redemption-notification';
import {getActiveGiftDuration, getAvailableGiftDurations, getGiftPrice, getGiftProducts} from '../../utils/gift-subscriptions';
import {ValidateInputForm} from '../../utils/form';
import {t} from '../../utils/i18n';
import useCardTilt from '../../utils/use-card-tilt';
import BetaGiftPage, {BetaGiftPageStyles} from './beta-gift-page';

export const GiftPageStyles = BetaGiftPageStyles;

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
                {t('1 month')}
            </button>
            <button
                data-test-button='switch-yearly'
                className={'gh-portal-btn' + (selectedInterval === 'year' ? ' active' : '')}
                onClick={() => setSelectedInterval('year')}
            >
                {t('1 year')}
            </button>
        </div>
    );
}

function GiftDurationSelector({availableDurations, selectedDuration, setSelectedDuration}) {
    if (availableDurations.length <= 1) {
        return null;
    }

    return (
        <div className='gh-portal-gift-duration-selector' role='group' aria-label={t('Plan')}>
            {availableDurations.map(duration => (
                <button
                    type='button'
                    aria-pressed={duration === selectedDuration}
                    className={'gh-portal-btn' + (duration === selectedDuration ? ' active' : '')}
                    data-test-gift-duration={duration}
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                >
                    {getGiftDurationLabel({cadence: 'month', duration})}
                </button>
            ))}
        </div>
    );
}

export function formatGiftValue(price) {
    const {amount, currency} = price ?? {};
    if (amount === null || amount === undefined || !currency) {
        return '';
    }
    return `${getCurrencySymbol(currency)}${formatNumber(getStripeAmount(amount))}`;
}

function getTierPriceLabel(product, selectedInterval) {
    const activePrice = selectedInterval === 'month' ? product.monthlyPrice : product.yearlyPrice;
    return formatGiftValue(activePrice);
}

const ExistingGiftPage = () => {
    const {site, member, brandColor, action, doAction} = useContext(AppContext);
    const [selectedInterval, setSelectedInterval] = useState(null);
    const [selectedDuration, setSelectedDuration] = useState(null);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState({});
    const {cardRef, containerProps: cardTiltProps} = useCardTilt();
    const leftRef = useRef(null);
    const innerRef = useRef(null);

    // Vertically center the inner content within the left column by computing
    // the available space and pushing the inner down by half. We recompute on
    // window resize (otherwise the stale offset leaves the right panel
    // overlapping the text), but not on every render — so when benefits change
    // height on tier switch, only the bottom of the column (the CTA) shifts,
    // leaving the title and tier picker anchored.
    // Skipped on mobile (single-column stack) where natural top-aligned flow
    // is what we want; centering would push content under the sticky CTA.
    useLayoutEffect(() => {
        const inner = innerRef.current;
        const left = leftRef.current;
        if (!inner || !left) {
            return;
        }

        const recenter = () => {
            if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 880px)').matches) {
                inner.style.marginTop = '';
                return;
            }
            // Reset first so the measurement reflects the natural inner height,
            // not the previously-applied offset.
            inner.style.marginTop = '';
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
        };

        recenter();

        let rafId = null;
        const onResize = () => {
            if (rafId !== null) {
                return;
            }
            rafId = window.requestAnimationFrame(() => {
                rafId = null;
                recenter();
            });
        };

        window.addEventListener('resize', onResize, {passive: true});
        return () => {
            window.removeEventListener('resize', onResize);
            if (rafId !== null) {
                window.cancelAnimationFrame(rafId);
            }
        };
    }, []);

    if (!site) {
        return <LoadingPage />;
    }

    const {portal_plans: portalPlans, portal_default_plan: portalDefaultPlan} = site;
    const hasGiftCustomization = !!site.labs?.giftSubCustomization;
    const activeInterval = getActiveInterval({portalPlans, portalDefaultPlan, selectedInterval});
    const availableDurations = hasGiftCustomization ? getAvailableGiftDurations({site}) : [];
    const activeDuration = hasGiftCustomization ? getActiveGiftDuration({
        availableDurations,
        portalDefaultPlan,
        selectedDuration
    }) : null;
    const products = hasGiftCustomization
        ? getGiftProducts({site, duration: activeDuration})
        : getAvailableProducts({site}).filter(p => p.type === 'paid');

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
                                    <h1 className='gh-portal-main-title'>{t('Gift a membership')}</h1>
                                    <p className='gh-portal-gift-checkout-subtitle'>
                                        {t('Gift subscriptions are not available right now.')}
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
    const isSingleTier = products.length === 1;
    const isPurchasing = action === 'checkoutGift:running';
    const hasErrors = Object.values(errors).some(errorMessage => !!errorMessage);
    const isDisabled = isCookiesDisabled() || isPurchasing || hasErrors;
    const isLoggedIn = !!member;

    const emailField = {
        type: 'email',
        value: email,
        placeholder: t('jamie@example.com'),
        label: t('Your email'),
        name: 'email',
        required: true,
        errorMessage: errors.email || ''
    };

    const handleEmailChange = (event) => {
        setErrors(currentErrors => ({
            ...currentErrors,
            email: ''
        }));
        setEmail(event.target.value);
    };

    const handleEmailKeyDown = (event) => {
        if (event.keyCode === 13 && !isPurchasing) {
            handlePurchase(event);
        }
    };

    const handlePurchase = (e) => {
        e.preventDefault();

        if (isPurchasing) {
            return;
        }

        const customerEmail = email.trim();

        if (!isLoggedIn) {
            const formErrors = ValidateInputForm({fields: [{...emailField, value: customerEmail}]});
            const formHasErrors = Object.values(formErrors).some(errorMessage => !!errorMessage);

            setErrors(formErrors);

            if (formHasErrors) {
                return;
            }
        }

        doAction('checkoutGift', {
            tierId: activeProduct.id,
            ...(hasGiftCustomization ? {duration: activeDuration} : {cadence: activeInterval}),
            ...(!isLoggedIn ? {email: customerEmail} : {})
        });
    };

    return (
        <>
            <CloseButton />
            <div className='gh-portal-content gift legacy'>
                <div className='gh-portal-gift-checkout'>
                    <div className='gh-portal-gift-checkout-left' ref={leftRef}>
                        <div className='gh-portal-gift-checkout-bg' aria-hidden='true' />
                        <div className='gh-portal-gift-checkout-inner' ref={innerRef}>
                            <header className='gh-portal-gift-checkout-header'>
                                <h1 className='gh-portal-main-title'>{t('Gift a membership')}</h1>
                                <p className='gh-portal-gift-checkout-subtitle'>
                                    {t('Share a full membership to {siteTitle} with a friend or colleague', {siteTitle})}
                                </p>
                            </header>

                            {!isLoggedIn && (
                                <div className='gh-portal-gift-checkout-section gh-portal-gift-checkout-email'>
                                    <InputField
                                        {...emailField}
                                        onChange={handleEmailChange}
                                        onKeyDown={handleEmailKeyDown}
                                    />
                                </div>
                            )}

                            <div className='gh-portal-gift-checkout-section'>
                                <div className='gh-portal-gift-checkout-label'>{isSingleTier ? t('Membership details') : t('Tier')}</div>
                                {hasGiftCustomization ? (
                                    <GiftDurationSelector
                                        availableDurations={availableDurations}
                                        selectedDuration={activeDuration}
                                        setSelectedDuration={setSelectedDuration}
                                    />
                                ) : (
                                    <GiftPriceSwitch
                                        selectedInterval={activeInterval}
                                        setSelectedInterval={setSelectedInterval}
                                    />
                                )}
                            </div>

                            <div className='gh-portal-gift-checkout-section'>
                                <div
                                    className={'gh-portal-gift-checkout-tiers' + (isSingleTier ? ' single' : '')}
                                    role={isSingleTier ? undefined : 'radiogroup'}
                                    aria-label={isSingleTier ? undefined : t('Tier')}
                                >
                                    {products.map((product) => {
                                        const isSelected = product.id === activeProduct.id;
                                        const benefits = product.benefits || [];
                                        return (
                                            <div
                                                key={product.id}
                                                className={'gh-portal-gift-checkout-tier-item' + (isSelected && !isSingleTier ? ' selected' : '')}
                                            >
                                                <button
                                                    type='button'
                                                    role={isSingleTier ? undefined : 'radio'}
                                                    aria-checked={isSingleTier ? undefined : isSelected}
                                                    className='gh-portal-gift-checkout-tier'
                                                    onClick={() => setSelectedProductId(product.id)}
                                                    data-test-tier={product.name}
                                                >
                                                    {!isSingleTier && (
                                                        <span className='gh-portal-gift-checkout-tier-radio' aria-hidden='true' />
                                                    )}
                                                    <div className='gh-portal-gift-checkout-tier-content'>
                                                        <div className='gh-portal-gift-checkout-tier-heading'>
                                                            <span className='gh-portal-gift-checkout-tier-name'>{product.name}</span>
                                                            <span className='gh-portal-gift-checkout-tier-price'>
                                                                {hasGiftCustomization
                                                                    ? formatGiftValue(getGiftPrice(product, activeDuration))
                                                                    : getTierPriceLabel(product, activeInterval)}
                                                            </span>
                                                        </div>
                                                        {product.description && (
                                                            <p className='gh-portal-gift-checkout-tier-description'>{product.description}</p>
                                                        )}
                                                    </div>
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
                                                                            <CheckmarkIcon aria-hidden='true' focusable='false' />
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
                                    label={t('Continue')}
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
                                <GiftCard
                                    cardRef={cardRef}
                                    duration={hasGiftCustomization
                                        ? getGiftDurationLabel({cadence: 'month', duration: activeDuration})
                                        : getGiftDurationLabel({cadence: activeInterval, duration: 1})}
                                    tierName={activeProduct.name}
                                    giftValue={hasGiftCustomization
                                        ? formatGiftValue(getGiftPrice(activeProduct, activeDuration))
                                        : getTierPriceLabel(activeProduct, activeInterval)}
                                    siteIcon={siteIcon}
                                    siteTitle={siteTitle}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const GiftPage = () => {
    const {site} = useContext(AppContext);

    if (site?.labs?.giftSubCustomization) {
        return <BetaGiftPage />;
    }

    return <ExistingGiftPage />;
};

export default GiftPage;
