import {useContext, useEffect, useMemo, useState} from 'react';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import LoadingPage from './loading-page';
import AppContext from '../../app-context';
import setupGhostApi from '../../utils/api';
import {chooseBestErrorMessage} from '../../utils/errors';
import {GIFT_CLAIM_QUERY_PARAM, getMemberSubscription, isComplimentaryMember} from '../../utils/helpers';
import InputForm from '../common/input-form';
import {ValidateInputForm} from '../../utils/form';
import {t} from '../../utils/i18n';

const DURATION_LABELS = {
    1: '1 month',
    3: '3 months',
    6: '6 months',
    12: '1 year'
};

const GIFT_CHECKOUT_CONTEXT_KEY_PREFIX = 'ghost-portal-gift-checkout';

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'unpaid', 'past_due'];

const getThemeFontFamilies = () => {
    try {
        const parentDocument = window.parent?.document || window.document;
        const bodyFont = window.getComputedStyle(parentDocument.body).fontFamily;
        const headingElement = parentDocument.querySelector('.gh-head-title, .gh-article-title, h1, h2');
        const headingFont = headingElement ? window.getComputedStyle(headingElement).fontFamily : bodyFont;

        return {
            bodyFont,
            headingFont
        };
    } catch (err) {
        return {
            bodyFont: '',
            headingFont: ''
        };
    }
};

export const GiftPageStyles = `
.gh-portal-popup-wrapper.gift.full-size {
    padding: 0;
    background:
        radial-gradient(circle at top left, rgba(227, 164, 136, 0.18), transparent 34%),
        radial-gradient(circle at bottom right, rgba(231, 225, 212, 0.75), transparent 42%),
        #f4f0e8;
}

.gh-portal-popup-container.gift.full-size {
    padding: 0;
    box-shadow: none;
    background: transparent;
}

.gh-portal-content.gift {
    max-height: unset !important;
}

.gh-portal-content.gift.gift-purchase {
    width: 100%;
    max-width: 100%;
    padding-bottom: 0;
    font-family: var(--gift-body-font, inherit);
}

.gh-portal-content.gift.gift-purchase .gh-portal-btn,
.gh-portal-content.gift.gift-purchase .gh-portal-btn span,
.gh-portal-content.gift.gift-purchase .gh-portal-input,
.gh-portal-content.gift.gift-purchase button {
    font-family: var(--gift-body-font, inherit);
}

.gh-portal-gift-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr);
    min-height: 100vh;
}

.gh-portal-gift-main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 56px 72px;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(12px);
    font-family: var(--gift-body-font, inherit);
}

.gh-portal-gift-header {
    max-width: 560px;
    margin-bottom: 40px;
}

.gh-portal-gift-header .gh-portal-main-title {
    margin: 0 0 16px;
    text-align: left;
    font-family: var(--gift-heading-font, var(--gift-body-font, inherit));
    font-size: clamp(4.8rem, 5.5vw, 6rem);
    line-height: 0.96;
    letter-spacing: -0.03em;
}

.gh-portal-gift-kicker {
    margin: 0 0 18px;
    color: var(--brandcolor, var(--grey5));
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
}

.gh-portal-gift-subtitle {
    max-width: 520px;
    margin: 0;
    color: var(--grey4);
    font-size: 2.4rem;
    line-height: 1.45;
    text-wrap: pretty;
}

.gh-portal-gift-form {
    max-width: 640px;
}

.gh-portal-gift-fieldset {
    margin-bottom: 30px;
}

.gh-portal-gift-fieldset-label {
    display: block;
    margin-bottom: 14px;
    color: var(--grey1);
    font-size: 2.1rem;
    font-weight: 600;
    line-height: 1.25;
}

.gh-portal-gift-option-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}

.gh-portal-gift-option-grid.duration-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
}

.gh-portal-gift-option-grid.delivery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gh-portal-gift-option-card,
.gh-portal-gift-duration-card {
    display: flex;
    width: 100%;
    min-height: 94px;
    padding: 18px 20px;
    border: 1px solid rgba(17, 17, 17, 0.12);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.78);
    color: var(--grey1);
    text-align: left;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background-color 0.2s ease;
}

.gh-portal-gift-duration-card {
    min-height: 58px;
    align-items: center;
    justify-content: center;
    padding: 14px 18px;
    border-radius: 16px;
    font-size: 1.9rem;
    font-weight: 500;
    text-align: center;
}

.gh-portal-gift-option-card:hover,
.gh-portal-gift-option-card:focus,
.gh-portal-gift-duration-card:hover,
.gh-portal-gift-duration-card:focus {
    transform: translateY(-1px);
    border-color: rgba(17, 17, 17, 0.3);
}

.gh-portal-gift-option-card.selected,
.gh-portal-gift-duration-card.selected {
    border-color: var(--brandcolor, rgba(17, 17, 17, 0.98));
    box-shadow: 0 0 0 2px var(--brandcolor, rgba(17, 17, 17, 0.98));
    background: #fff;
}

.gh-portal-gift-option-card-inner {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.gh-portal-gift-tier-card {
    min-height: auto;
    align-items: center;
}

.gh-portal-gift-tier-card .gh-portal-gift-option-card-inner {
    gap: 0;
}

.gh-portal-gift-option-title {
    display: block;
    font-size: 2.3rem;
    font-weight: 600;
    line-height: 1.1;
}

.gh-portal-gift-option-detail {
    display: block;
    color: var(--grey5);
    font-size: 1.8rem;
    line-height: 1.35;
    text-wrap: pretty;
}

.gh-portal-gift-recipient .gh-portal-input-labelcontainer {
    margin-bottom: 8px;
}

.gh-portal-gift-recipient .gh-portal-input-label {
    display: block;
    margin-bottom: 8px;
    font-size: 2.1rem;
}

.gh-portal-gift-recipient .gh-portal-input {
    height: 62px;
    margin-bottom: 0;
    padding: 0 18px;
    border-radius: 16px;
    font-size: 1.9rem;
    background: rgba(255, 255, 255, 0.88);
}

.gh-portal-gift-delivery-note {
    margin: 14px 0 0;
    color: var(--grey5);
    font-size: 1.6rem;
    line-height: 1.55;
    text-wrap: pretty;
}

.gh-portal-gift-total-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-top: 14px;
}

.gh-portal-gift-total-label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: var(--grey5);
    font-size: 1.7rem;
}

.gh-portal-gift-total-label strong {
    color: var(--grey1);
    font-size: clamp(3.8rem, 5vw, 4.8rem);
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.04em;
}

.gh-portal-gift-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 26px;
}

.gh-portal-gift-footer .gh-portal-btn {
    min-width: 148px;
    height: 52px;
    border-radius: 14px;
    font-size: 1.9rem;
    font-weight: 600;
}

.gh-portal-gift-error {
    margin: 20px 0 0;
    color: var(--red);
    font-size: 1.6rem;
    line-height: 1.5;
}

.gh-portal-gift-preview-panel {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
    overflow: hidden;
    font-family: var(--gift-body-font, inherit);
    background:
        radial-gradient(circle at 20% 24%, color-mix(in srgb, var(--brandcolor, #dd8461) 14%, #f3e4cb) 0%, transparent 34%),
        radial-gradient(circle at 78% 72%, color-mix(in srgb, var(--brandcolor, #dd8461) 12%, transparent) 0%, transparent 22%),
        linear-gradient(180deg, rgba(245, 241, 233, 0.98) 0%, rgba(241, 237, 227, 0.95) 100%);
}

.gh-portal-gift-preview-panel::before,
.gh-portal-gift-preview-panel::after {
    content: "";
    position: absolute;
    border-radius: 999px;
    filter: blur(18px);
    opacity: 0.6;
}

.gh-portal-gift-preview-panel::before {
    width: 240px;
    height: 240px;
    top: 7%;
    left: 8%;
    background: rgba(245, 233, 212, 0.9);
}

.gh-portal-gift-preview-panel::after {
    width: 300px;
    height: 300px;
    right: 0;
    bottom: 6%;
    background: rgba(232, 221, 204, 0.72);
}

.gh-portal-gift-preview-stage {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: min(100%, 540px);
    aspect-ratio: 1.08;
}

.gh-portal-gift-preview-card {
    position: relative;
    width: min(100%, 440px);
    padding: 38px 36px 32px;
    border-radius: 28px;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
        color-mix(in srgb, var(--brandcolor, #dd8461) 84%, #111 16%);
    box-shadow: 0 22px 60px rgba(83, 54, 40, 0.18), inset 0 0 0 1px rgba(255, 255, 255, 0.22);
    color: #fffdf8;
    overflow: hidden;
}

.gh-portal-gift-preview-card::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
        linear-gradient(112deg, transparent 0, transparent 18%, rgba(255, 255, 255, 0.16) 19%, transparent 20%, transparent 100%),
        linear-gradient(32deg, transparent 0, transparent 44%, rgba(255, 255, 255, 0.14) 45%, transparent 46%, transparent 100%),
        linear-gradient(156deg, transparent 0, transparent 72%, rgba(255, 255, 255, 0.15) 73%, transparent 74%, transparent 100%);
    opacity: 0.65;
}

.gh-portal-gift-preview-card > * {
    position: relative;
    z-index: 1;
}

.gh-portal-gift-preview-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 42px;
}

.gh-portal-gift-preview-label {
    margin: 0 0 12px;
    color: rgba(255, 251, 244, 0.88);
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
}

.gh-portal-gift-preview-title {
    margin: 0 0 10px;
    font-family: var(--gift-heading-font, var(--gift-body-font, inherit));
    font-size: clamp(3rem, 3.4vw, 3.8rem);
    line-height: 1.05;
    letter-spacing: -0.03em;
}

.gh-portal-gift-preview-meta {
    margin: 0;
    color: rgba(255, 251, 244, 0.9);
    font-size: 1.75rem;
    line-height: 1.45;
    text-wrap: pretty;
}

.gh-portal-content.gift.gift-status {
    padding-bottom: 4px;
}

.gh-portal-content.gift.gift-status .gh-portal-section {
    margin-bottom: 0;
}

.gh-portal-gift-copy-area {
    margin-top: 18px;
}

.gh-portal-gift-copy-notice {
    margin: 12px 0 0;
    color: var(--grey5);
    font-size: 1.45rem;
    line-height: 1.5;
}

.gh-portal-gift-copy-row {
    display: flex;
    gap: 12px;
    align-items: center;
}

.gh-portal-gift-copy-input {
    flex: 1 1 auto;
    height: 50px;
    margin: 0;
    padding: 0 16px;
    border: 1px solid rgba(17, 17, 17, 0.12);
    border-radius: 14px;
    background: #fff;
    color: var(--grey1);
    font-size: 1.55rem;
}

.gh-portal-gift-copy-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 110px;
    height: 50px;
    padding: 0 18px;
    border: 1px solid rgba(17, 17, 17, 0.14);
    border-radius: 14px;
    background: #fff;
    color: var(--grey1);
    font-size: 1.55rem;
    font-weight: 600;
    transition: border-color 0.2s ease, transform 0.2s ease;
}

.gh-portal-gift-copy-button:hover,
.gh-portal-gift-copy-button:focus {
    transform: translateY(-1px);
    border-color: rgba(17, 17, 17, 0.28);
}

.gh-portal-gift-status-header {
    margin-bottom: 24px;
}

.gh-portal-gift-status-header .gh-portal-main-title {
    margin-bottom: 12px;
    margin-top: 0;
}

.gh-portal-gift-status-header .gh-portal-main-subtitle {
    color: var(--grey3);
    font-size: 2rem;
    line-height: 1.55;
    text-align: left;
    text-wrap: pretty;
}

.gh-portal-gift-status-form .gh-portal-input {
    margin-bottom: 12px;
}

@media (max-width: 1080px) {
    .gh-portal-gift-layout {
        grid-template-columns: 1fr;
        min-height: auto;
    }

    .gh-portal-gift-preview-panel {
        min-height: 360px;
        order: -1;
    }

    .gh-portal-gift-main {
        padding: 40px 28px 36px;
    }

    .gh-portal-gift-header {
        margin-bottom: 28px;
    }
}

@media (max-width: 780px) {
    .gh-portal-popup-container.gift.full-size {
        min-height: 100%;
    }

    .gh-portal-gift-option-grid,
    .gh-portal-gift-option-grid.duration-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 560px) {
    .gh-portal-popup-wrapper.gift.full-size {
        background: #f7f3ec;
    }

    .gh-portal-gift-main {
        padding: 28px 20px 28px;
    }

    .gh-portal-gift-header .gh-portal-main-title {
        font-size: 4.6rem;
    }

    .gh-portal-gift-subtitle {
        font-size: 2rem;
    }

    .gh-portal-gift-option-grid,
    .gh-portal-gift-option-grid.duration-grid {
        grid-template-columns: 1fr;
    }

    .gh-portal-gift-total-row {
        flex-direction: column;
        align-items: stretch;
    }

    .gh-portal-gift-footer {
        justify-content: stretch;
    }

    .gh-portal-gift-footer .gh-portal-btn {
        width: 100%;
    }

    .gh-portal-gift-copy-row {
        flex-direction: column;
        align-items: stretch;
    }

    .gh-portal-gift-copy-button {
        width: 100%;
    }

    .gh-portal-gift-preview-panel {
        min-height: 300px;
        padding: 24px 20px 4px;
    }

    .gh-portal-gift-preview-card {
        padding: 28px 24px 24px;
        border-radius: 24px;
    }

    .gh-portal-gift-preview-icon {
        margin-bottom: 28px;
    }
}
`;

const formatMoney = ({amount, currency}) => {
    return Intl.NumberFormat('en', {
        style: 'currency',
        currency
    }).format(amount / 100);
};

const getDurationLabel = (durationMonths) => {
    return DURATION_LABELS[durationMonths] || t('{months} months', {months: durationMonths});
};

const getGiftCheckoutContextStorageKey = token => `${GIFT_CHECKOUT_CONTEXT_KEY_PREFIX}:${token}`;

const storeGiftCheckoutContext = (token, context) => {
    if (!token) {
        return;
    }

    try {
        sessionStorage.setItem(getGiftCheckoutContextStorageKey(token), JSON.stringify(context));
    } catch (err) {
        // Ignore session storage failures and continue with the checkout flow.
    }
};

const readGiftCheckoutContext = (token) => {
    if (!token) {
        return null;
    }

    try {
        const storedContext = sessionStorage.getItem(getGiftCheckoutContextStorageKey(token));

        if (!storedContext) {
            return null;
        }

        return JSON.parse(storedContext);
    } catch (err) {
        return null;
    }
};

const copyTextToClipboard = async (text) => {
    if (!text) {
        return;
    }

    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
};

const getGiftableTiers = ({site}) => {
    return (site?.products || []).filter((product) => {
        return product?.type === 'paid' && product?.visibility !== 'none';
    });
};

const getDurationOptions = (tier) => {
    const options = [];

    if (tier?.monthly_price?.amount) {
        options.push(1, 3, 6);
    }

    if (tier?.yearly_price?.amount) {
        options.push(12);
    }

    return options;
};

const getPriceForDuration = ({tier, durationMonths}) => {
    if (!tier) {
        return null;
    }

    if (durationMonths === 12) {
        return tier.yearly_price;
    }

    if (!tier.monthly_price?.amount) {
        return null;
    }

    return {
        ...tier.monthly_price,
        amount: tier.monthly_price.amount * durationMonths
    };
};

// const getGiftPreviewCopy = ({recipientEmail}) => {
//     if (recipientEmail) {
//         return t('Delivered to {recipientEmail}', {recipientEmail});
//     }

//     return t('Delivered instantly after checkout');
// };

function GiftPreviewIcon() {
    return (
        <svg width='118' height='118' viewBox='0 0 118 118' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
            <rect x='24' y='38' width='70' height='58' rx='4' fill='white' />
            <path d='M24 58H94' stroke='#121212' strokeWidth='4' strokeLinecap='round' />
            <path d='M59 38V96' stroke='#121212' strokeWidth='4' strokeLinecap='round' />
            <path d='M59 39C47 39 41 29 44 22C47 15 59 18 59 30' stroke='#121212' strokeWidth='4' strokeLinecap='round' strokeLinejoin='round' />
            <path d='M59 39C71 39 77 29 74 22C71 15 59 18 59 30' stroke='#121212' strokeWidth='4' strokeLinecap='round' strokeLinejoin='round' />
            <path d='M42 31L76 31' stroke='#121212' strokeWidth='4' strokeLinecap='round' />
        </svg>
    );
}

function GiftPreviewPanel({themeFonts, title, meta, hideLabel = false, className = ''}) {
    return (
        <aside
            className={`gh-portal-gift-preview-panel ${className}`.trim()}
            aria-hidden='true'
            style={{
                '--gift-body-font': themeFonts.bodyFont || undefined,
                '--gift-heading-font': themeFonts.headingFont || themeFonts.bodyFont || undefined
            }}
        >
            <div className='gh-portal-gift-preview-stage'>
                <div className='gh-portal-gift-preview-card'>
                    <div className='gh-portal-gift-preview-icon'>
                        <GiftPreviewIcon />
                    </div>
                    {!hideLabel && (
                        <p className='gh-portal-gift-preview-label'>{t('Gift preview')}</p>
                    )}
                    <h2 className='gh-portal-gift-preview-title'>{title}</h2>
                    {meta && (
                        <p className='gh-portal-gift-preview-meta'>{meta}</p>
                    )}
                </div>
            </div>
        </aside>
    );
}

function GiftPurchaseView() {
    const {site, brandColor} = useContext(AppContext);
    const api = useMemo(() => setupGhostApi({siteUrl: site.url}), [site.url]);
    const tiers = useMemo(() => getGiftableTiers({site}), [site]);
    const themeFonts = useMemo(() => getThemeFontFamilies(), []);
    const [deliveryMethod, setDeliveryMethod] = useState('link');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [selectedTierId, setSelectedTierId] = useState('');
    const [selectedDuration, setSelectedDuration] = useState(1);
    const [error, setError] = useState('');
    const [isSubmitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!selectedTierId && tiers.length > 0) {
            setSelectedTierId(tiers[0].id);
        }
    }, [tiers, selectedTierId]);

    useEffect(() => {
        const tier = tiers.find(product => product.id === selectedTierId);
        const durationOptions = getDurationOptions(tier);

        if (durationOptions.length > 0 && !durationOptions.includes(selectedDuration)) {
            setSelectedDuration(durationOptions[0]);
        }
    }, [tiers, selectedTierId, selectedDuration]);

    const selectedTier = tiers.find(product => product.id === selectedTierId) || tiers[0];
    const durationOptions = getDurationOptions(selectedTier);
    const selectedPrice = getPriceForDuration({tier: selectedTier, durationMonths: selectedDuration});
    const siteTitle = site.title || t('your publication');
    const selectedDurationLabel = getDurationLabel(selectedDuration);
    const isEmailDelivery = deliveryMethod === 'email';
    const recipientDescriptor = recipientEmail || t('your recipient');

    const onSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSubmitting(true);

        const currentUrl = `${window.location.origin}${window.location.pathname}`;

        try {
            const response = await api.member.checkoutGift({
                tierId: selectedTierId,
                durationMonths: selectedDuration,
                deliveryMethod,
                recipientEmail: isEmailDelivery ? recipientEmail : undefined,
                successUrl: `${currentUrl}#/portal/gift/success`,
                cancelUrl: `${currentUrl}#/portal/gift`
            });

            if (!response?.url) {
                throw new Error('Failed to start gift checkout');
            }

            storeGiftCheckoutContext(response.token, {
                deliveryMethod,
                durationMonths: selectedDuration,
                recipientEmail: isEmailDelivery ? recipientEmail : '',
                tierName: selectedTier?.name || ''
            });

            window.location.assign(response.url);
        } catch (err) {
            setError(chooseBestErrorMessage(err, t('Failed to start gift checkout')));
            setSubmitting(false);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !isSubmitting) {
            onSubmit(event);
        }
    };

    if (!tiers.length) {
        return (
            <section>
                <div className='gh-portal-section'>
                    <p className='gh-portal-members-disabled-notification'>
                        {t('This site is not accepting payments at the moment.')}
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className='gh-portal-gift-layout'>
            <div
                className='gh-portal-gift-main'
                style={{
                    '--gift-body-font': themeFonts.bodyFont || undefined,
                    '--gift-heading-font': themeFonts.headingFont || themeFonts.bodyFont || undefined
                }}
            >
                <header className='gh-portal-gift-header'>
                    {/* <p className='gh-portal-gift-kicker'>{t('Gift subscription')}</p> */}
                    <h3 className='gh-portal-main-title'>{t('Give the gift of {siteTitle}', {siteTitle})}</h3>
                    <p className='gh-portal-gift-subtitle'>{t('Includes full access to {tierName} plan for {duration}.', {tierName: selectedTier?.name, duration: selectedDurationLabel})}</p>
                </header>
                <div className='gh-portal-gift-form'>
                    {tiers.length > 1 && (
                        <section className='gh-portal-gift-fieldset'>
                            <span className='gh-portal-gift-fieldset-label'>{t('Which plan?')}</span>
                            <div className='gh-portal-gift-option-grid'>
                                {tiers.map((tier) => {
                                    const isSelected = tier.id === selectedTierId;

                                    return (
                                        <button
                                            key={tier.id}
                                            type='button'
                                            className={`gh-portal-gift-option-card gh-portal-gift-tier-card${isSelected ? ' selected' : ''}`}
                                            onClick={() => setSelectedTierId(tier.id)}
                                            aria-pressed={isSelected}
                                        >
                                            <span className='gh-portal-gift-option-card-inner'>
                                                <span className='gh-portal-gift-option-title'>{tier.name}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                    <section className='gh-portal-gift-fieldset'>
                        <span className='gh-portal-gift-fieldset-label'>{t('How many months?')}</span>
                        <div className='gh-portal-gift-option-grid duration-grid'>
                            {durationOptions.map((duration) => {
                                const isSelected = duration === selectedDuration;

                                return (
                                    <button
                                        key={duration}
                                        type='button'
                                        className={`gh-portal-gift-duration-card${isSelected ? ' selected' : ''}`}
                                        onClick={() => setSelectedDuration(duration)}
                                        aria-pressed={isSelected}
                                    >
                                        {DURATION_LABELS[duration]}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                    <section className='gh-portal-gift-fieldset'>
                        <span className='gh-portal-gift-fieldset-label'>{t('How should they receive it?')}</span>
                        <div className='gh-portal-gift-option-grid delivery-grid'>
                            {[
                                {
                                    value: 'link',
                                    title: t('Share link'),
                                    detail: t('Give it yourself')
                                },
                                {
                                    value: 'email',
                                    title: t('Send by email'),
                                    detail: t('We\'ll deliver it for you')
                                }
                            ].map((option) => {
                                const isSelected = deliveryMethod === option.value;

                                return (
                                    <button
                                        key={option.value}
                                        type='button'
                                        className={`gh-portal-gift-option-card${isSelected ? ' selected' : ''}`}
                                        onClick={() => setDeliveryMethod(option.value)}
                                        aria-pressed={isSelected}
                                    >
                                        <span className='gh-portal-gift-option-card-inner'>
                                            <span className='gh-portal-gift-option-title'>{option.title}</span>
                                            <span className='gh-portal-gift-option-detail'>{option.detail}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                    {isEmailDelivery && (
                        <section className='gh-portal-gift-fieldset gh-portal-gift-recipient'>
                            <div className='gh-portal-input-labelcontainer'>
                                <label className='gh-portal-input-label' htmlFor='gift-recipient-email'>{t('Who should receive it?')}</label>
                            </div>
                            <input
                                id='gift-recipient-email'
                                className='gh-portal-input'
                                type='email'
                                placeholder={t('jamie@example.com')}
                                value={recipientEmail}
                                onChange={event => setRecipientEmail(event.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                            />
                            <p className='gh-portal-gift-delivery-note'>
                                {recipientEmail
                                    ? t('{recipient} will receive the gift by email. Choose "Share link" if you prefer to give the gift yourself.', {recipient: recipientEmail})
                                    : t('Your recipient will receive the gift by email. Choose "Share link" if you prefer to give the gift yourself.')}
                            </p>
                        </section>
                    )}
                    <div className='gh-portal-gift-total-row'>
                        <div className='gh-portal-gift-total-label'>
                            <span>{t('Total')}</span>
                            <strong>{selectedPrice ? formatMoney(selectedPrice) : '--'}</strong>
                        </div>
                    </div>
                    {error && (
                        <p className='gh-portal-gift-error'>{error}</p>
                    )}
                    <footer className='gh-portal-gift-footer'>
                        <ActionButton
                            dataTestId='gift-purchase'
                            style={{width: 'auto'}}
                            onClick={onSubmit}
                            disabled={!selectedTierId || !selectedDuration || !selectedPrice || isSubmitting || (isEmailDelivery && !recipientEmail)}
                            brandColor={brandColor}
                            label={isSubmitting ? t('Redirecting...') : t('Continue to payment')}
                            isRunning={isSubmitting}
                        />
                    </footer>
                </div>
            </div>
            <GiftPreviewPanel
                themeFonts={themeFonts}
                title={selectedTier?.name ? t('{duration} of {tierName}', {duration: getDurationLabel(selectedDuration), tierName: selectedTier.name}) : t('A thoughtful gift')}
                meta={isEmailDelivery
                    ? t('Will be emailed to {recipientEmail}', {recipientEmail: recipientDescriptor})
                    : t('Share this gift when you are ready')}
            />
        </section>
    );
}

function GiftStatusView({mode}) {
    const {site, member, pageData, doAction, brandColor} = useContext(AppContext);
    const api = useMemo(() => setupGhostApi({siteUrl: site.url}), [site.url]);
    const token = pageData?.token;
    const checkoutContext = useMemo(() => readGiftCheckoutContext(token), [token]);
    const themeFonts = useMemo(() => getThemeFontFamilies(), []);
    const [gift, setGift] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [claimName, setClaimName] = useState('');
    const [claimEmail, setClaimEmail] = useState('');
    const [claimErrors, setClaimErrors] = useState({});
    const [sendingMagicLink, setSendingMagicLink] = useState(false);
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [submittedClaimEmail, setSubmittedClaimEmail] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    useEffect(() => {
        let isCancelled = false;
        let timeoutId;

        const loadGift = async (attempt = 0) => {
            try {
                const loadedGift = await api.member.gift({token});

                if (isCancelled) {
                    return;
                }

                setGift(loadedGift);
                setError('');

                if (mode === 'success' && loadedGift.status === 'pending' && attempt < 10) {
                    timeoutId = window.setTimeout(() => loadGift(attempt + 1), 1500);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                if (!isCancelled) {
                    setError(chooseBestErrorMessage(err, t('Failed to load gift')));
                    setLoading(false);
                }
            }
        };

        if (token) {
            loadGift();
        } else {
            setError(t('Gift not found'));
            setLoading(false);
        }

        return () => {
            isCancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [api, mode, token]);

    useEffect(() => {
        if (!claimEmail && gift?.recipient_email) {
            setClaimEmail(gift.recipient_email);
        }
    }, [gift?.recipient_email, claimEmail]);

    if (loading) {
        return <LoadingPage />;
    }

    if (error) {
        return (
            <section>
                <div className='gh-portal-section'>
                    <p className='gh-portal-members-disabled-notification'>{error}</p>
                </div>
            </section>
        );
    }

    const giftDeliveryMethod = checkoutContext?.deliveryMethod || gift?.delivery_method || 'link';
    const giftDurationLabel = getDurationLabel(checkoutContext?.durationMonths || gift?.duration_months);
    const giftTierName = checkoutContext?.tierName || gift?.tier?.name;
    const successRecipientEmail = checkoutContext?.recipientEmail || gift?.recipient_email_masked;
    const successPreviewTitle = giftTierName ? t('{duration} of {tierName}', {duration: giftDurationLabel, tierName: giftTierName}) : t('A thoughtful gift');
    const successPreviewMeta = giftDeliveryMethod === 'email'
        ? t('Will be emailed to {recipientEmail}', {recipientEmail: successRecipientEmail || t('your recipient')})
        : t('Share this gift when you are ready');

    const copyClaimLink = async () => {
        try {
            await copyTextToClipboard(gift?.claim_url);
            setLinkCopied(true);
        } catch (err) {
            setError(t('Failed to copy link'));
        }
    };

    if (mode === 'success') {
        return (
            <section className='gh-portal-gift-layout'>
                <div
                    className='gh-portal-gift-main'
                    style={{
                        '--gift-body-font': themeFonts.bodyFont || undefined,
                        '--gift-heading-font': themeFonts.headingFont || themeFonts.bodyFont || undefined
                    }}
                >
                    <header className='gh-portal-gift-header'>
                        <h1 className='gh-portal-main-title'>{t('Your gift is ready')}</h1>
                        <p className='gh-portal-gift-subtitle'>
                            {gift?.status === 'purchased'
                                ? (
                                    giftDeliveryMethod === 'email'
                                        ? t('Your {duration} of {tierName} gift is on its way to {recipientEmail}. You can also share the link below:', {duration: giftDurationLabel, tierName: giftTierName, recipientEmail: successRecipientEmail})
                                        : t('You have gifted {duration} of {tierName}. Share the link below:', {duration: giftDurationLabel, tierName: giftTierName})
                                )
                                : t('We are confirming the payment for this gift.')}
                        </p>
                    </header>
                    {gift?.claim_url && (
                        <div className='gh-portal-gift-form'>
                            <div className='gh-portal-gift-copy-area'>
                                <div className='gh-portal-gift-copy-row'>
                                    <input
                                        className='gh-portal-gift-copy-input'
                                        type='text'
                                        value={gift.claim_url}
                                        readOnly
                                        onFocus={event => event.target.select()}
                                    />
                                    <button
                                        type='button'
                                        className='gh-portal-gift-copy-button'
                                        onClick={copyClaimLink}
                                    >
                                        {linkCopied ? t('Copied') : t('Copy link')}
                                    </button>
                                </div>
                                <p className='gh-portal-gift-copy-notice'>
                                    {t('We\'ve also sent you an email confirmation with the gift link.')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                <GiftPreviewPanel
                    themeFonts={themeFonts}
                    title={successPreviewTitle}
                    meta={successPreviewMeta}
                />
            </section>
        );
    }

    const subscription = getMemberSubscription({member});
    const hasActivePaidSubscription = !!subscription?.id && ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status);
    const currentTierId = subscription?.tier?.id;
    const isComplimentary = isComplimentaryMember({member});
    const hasActiveGiftOnSameTier = !!subscription?.gift && currentTierId === gift?.tier?.id;
    const willReplaceCompedTier = !!member && isComplimentary && currentTierId && currentTierId !== gift?.tier?.id;
    const siteTitle = site.title || t('your publication');
    const redeemSubtitle = t('You\'ve been gifted {duration} of {siteTitle} on the {tierName} plan.', {
        duration: giftDurationLabel,
        siteTitle,
        tierName: giftTierName
    });
    const redeemPreviewTitle = t('{duration} of {tierName} plan', {
        duration: giftDurationLabel,
        tierName: giftTierName
    });

    const claimFields = [
        {
            type: 'text',
            value: claimName,
            placeholder: 'Jamie',
            label: t('Name'),
            name: 'name',
            required: true,
            errorMessage: claimErrors.name || '',
            autoFocus: true
        },
        {
            type: 'email',
            value: claimEmail,
            placeholder: t('jamie@example.com'),
            label: t('Email'),
            name: 'email',
            required: true,
            errorMessage: claimErrors.email || '',
            autoFocus: false
        }
    ];

    const handleClaimInputChange = (event, field) => {
        const value = event.target.value;

        if (field.name === 'name') {
            setClaimName(value);
            return;
        }

        if (field.name === 'email') {
            setClaimEmail(value);
        }
    };

    const startGiftClaim = async () => {
        setSendingMagicLink(true);
        setError('');

        const nextClaimErrors = ValidateInputForm({fields: claimFields});
        setClaimErrors(nextClaimErrors);

        if (Object.values(nextClaimErrors).some(Boolean)) {
            setSendingMagicLink(false);
            return;
        }

        try {
            const claimRedirect = new URL(window.location.href);
            claimRedirect.hash = '';
            claimRedirect.searchParams.set(GIFT_CLAIM_QUERY_PARAM, token);

            await api.member.sendGiftMagicLink({
                token,
                redirect: claimRedirect.href,
                email: claimEmail,
                name: claimName.trim()
            });
            setMagicLinkSent(true);
            setSubmittedClaimEmail(claimEmail.trim());
        } catch (err) {
            setError(chooseBestErrorMessage(err, t('Failed to send a magic link')));
        } finally {
            setSendingMagicLink(false);
        }
    };

    const redeemGift = async () => {
        setRedeeming(true);
        setError('');

        try {
            await api.member.redeemGift({
                token,
                confirmTierChange: willReplaceCompedTier
            });
            await doAction('refreshMemberData');
            doAction('switchPage', {page: 'accountHome'});
        } catch (err) {
            setError(chooseBestErrorMessage(err, t('Failed to redeem gift')));
            setRedeeming(false);
        }
    };

    return (
        <section className='gh-portal-gift-layout'>
            <div
                className='gh-portal-gift-main'
                style={{
                    '--gift-body-font': themeFonts.bodyFont || undefined,
                    '--gift-heading-font': themeFonts.headingFont || themeFonts.bodyFont || undefined
                }}
            >
                <header className='gh-portal-gift-header gh-portal-gift-status-header'>
                    <h1 className='gh-portal-main-title'>
                        {!member && magicLinkSent ? t('Check your email') : t('Redeem your gift')}
                    </h1>
                    <p className='gh-portal-gift-subtitle gh-portal-main-subtitle'>
                        {!member && magicLinkSent
                            ? t('We sent a sign-in link to {email}. Open the link in your inbox to finish redeeming your gift.', {email: submittedClaimEmail})
                            : redeemSubtitle}
                    </p>
                </header>
                <div className='gh-portal-gift-form'>
                    {hasActivePaidSubscription && (
                        <p className='gh-portal-members-disabled-notification'>
                            {t('This gift can\'t be redeemed while you have an active paid subscription.')}
                        </p>
                    )}
                    {!hasActivePaidSubscription && hasActiveGiftOnSameTier && (
                        <p className='gh-portal-members-disabled-notification'>
                            {t('You already have an active gift subscription on this tier.')}
                        </p>
                    )}
                    {!member && !magicLinkSent && (
                        <>
                            <div className='gh-portal-gift-status-form'>
                                <InputForm
                                    fields={claimFields}
                                    onChange={handleClaimInputChange}
                                />
                            </div>
                        </>
                    )}
                    {!hasActivePaidSubscription && !hasActiveGiftOnSameTier && willReplaceCompedTier && (
                        <p className='gh-portal-members-disabled-notification'>
                            {t('Redeeming the offer will change your current subscription to {tierName}', {tierName: gift?.tier?.name})}
                        </p>
                    )}
                    {error && (
                        <p className='gh-portal-members-disabled-notification'>{error}</p>
                    )}
                    <footer className='gh-portal-signin-footer'>
                        {!member && !magicLinkSent && (
                            <ActionButton
                                dataTestId='gift-start-claim'
                                style={{width: '100%'}}
                                onClick={startGiftClaim}
                                disabled={sendingMagicLink}
                                brandColor={brandColor}
                                label={sendingMagicLink ? t('Sending...') : t('Redeem gift')}
                                isRunning={sendingMagicLink}
                            />
                        )}
                        {member && !hasActivePaidSubscription && !hasActiveGiftOnSameTier && (
                            <ActionButton
                                dataTestId='gift-redeem'
                                style={{width: '100%'}}
                                onClick={redeemGift}
                                disabled={redeeming}
                                brandColor={brandColor}
                                label={redeeming ? t('Redeeming...') : t('Redeem gift')}
                                isRunning={redeeming}
                            />
                        )}
                    </footer>
                </div>
            </div>
            <GiftPreviewPanel
                themeFonts={themeFonts}
                title={redeemPreviewTitle}
                hideLabel={true}
            />
        </section>
    );
}

const GiftPage = () => {
    const {pageData} = useContext(AppContext);
    const mode = pageData?.mode || 'purchase';

    if (mode === 'purchase') {
        return (
            <>
                <CloseButton />
                <div className='gh-portal-content gift gift-purchase'>
                    <GiftPurchaseView />
                </div>
            </>
        );
    }

    if (mode === 'success') {
        return (
            <>
                <CloseButton />
                <div className='gh-portal-content gift gift-purchase'>
                    <GiftStatusView mode={mode} />
                </div>
            </>
        );
    }

    if (mode === 'redeem') {
        return (
            <>
                <CloseButton />
                <div className='gh-portal-content gift gift-purchase'>
                    <GiftStatusView mode={mode} />
                </div>
            </>
        );
    }

    return (
        <>
            <CloseButton />
            <div className='gh-portal-logged-out-form-container'>
                <div className='gh-portal-content gift gift-status'>
                    <GiftStatusView mode={mode} />
                </div>
            </div>
        </>
    );
};

export default GiftPage;
