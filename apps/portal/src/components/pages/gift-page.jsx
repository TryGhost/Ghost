import {useContext, useEffect, useState} from 'react';
import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import BackButton from '../common/back-button';
import ActionButton from '../common/action-button';
import GiftCard from '../common/gift-card';
import InputField from '../common/input-field';
import LoadingPage from './loading-page';
import CheckmarkIcon from '../../images/icons/checkmark.svg?react';
import giftCardNoiseUrl from '../../images/gift-card-noise.webp';
import giftCardOrbUrl from '../../images/gift-card-orb.webp';
import {getAvailableProducts, getCurrencySymbol, formatNumber, getStripeAmount, isCookiesDisabled, getGiftCadenceParts, getOfferedGiftDurations, getGiftPrice, getDefaultGiftDuration} from '../../utils/helpers';
import {getGiftDurationLabel} from '../../utils/gift-redemption-notification';
import {sanitizeHtml} from '../../utils/sanitize-html';
import {ValidateInputForm} from '../../utils/form';
import {t} from '../../utils/i18n';
import useCardTilt from '../../utils/use-card-tilt';

export const GiftPageStyles = `
@property --shine-angle {
    syntax: '<angle>';
    inherits: false;
    initial-value: 243.43deg;
}

.gh-portal-popup-container.full-size.gift,
.gh-portal-popup-container.full-size.giftSuccess,
.gh-portal-popup-container.full-size.giftRedemption {
    padding: 0;
}

.gh-portal-popup-container.full-size.gift .gh-portal-closeicon-container,
.gh-portal-popup-container.full-size.giftSuccess .gh-portal-closeicon-container,
.gh-portal-popup-container.full-size.giftRedemption .gh-portal-closeicon-container {
    top: 32px;
    right: 32px;
}

.gh-portal-popup-container.full-size.gift .gh-portal-closeicon,
.gh-portal-popup-container.full-size.giftSuccess .gh-portal-closeicon,
.gh-portal-popup-container.full-size.giftRedemption .gh-portal-closeicon {
    color: rgba(255, 255, 255, 0.5);
}

.gh-portal-popup-container.full-size.gift .gh-portal-closeicon:hover,
.gh-portal-popup-container.full-size.giftSuccess .gh-portal-closeicon:hover,
.gh-portal-popup-container.full-size.giftRedemption .gh-portal-closeicon:hover {
    color: rgba(255, 255, 255, 0.8);
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
    padding: 40px 48px;
}

/* Selection/delivery steps: top-align the content so the copy sits high and
   makes full use of the vertical space, rather than floating dead-centre. */
.gh-portal-content.gift .gh-portal-gift-checkout-left {
    align-items: flex-start;
    padding-top: 32px;
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
    margin-bottom: 12px;
}

.gh-portal-gift-checkout-header .gh-portal-main-title {
    text-align: start;
    margin: 0 0 8px;
    font-size: 2.8rem;
    line-height: 1.15;
}

.gh-portal-gift-checkout-subtitle {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.45em;
    color: var(--grey3);
    text-wrap: pretty;
}

.gh-portal-gift-checkout-subtitle p {
    margin: 0 0 8px;
}

.gh-portal-gift-checkout-subtitle p:last-child {
    margin-bottom: 0;
}

.gh-portal-gift-checkout-subtitle a {
    color: inherit;
    text-decoration: underline;
}

.gh-portal-gift-checkout-promo-image {
    display: block;
    max-width: 100%;
    max-height: 88px;
    object-fit: contain;
    object-position: left;
    border-radius: 12px;
    margin: 0 0 14px;
}

.gh-portal-gift-checkout-section {
    margin-top: 18px;
}

.gh-portal-gift-checkout-label {
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--grey6);
    margin-bottom: 12px;
}

.gh-portal-gift-duration-switch {
    display: flex;
    background: #F3F3F3;
    width: 100%;
    border-radius: 999px;
    padding: 4px;
    height: 44px;
    margin: 0;
}

.gh-portal-gift-duration-switch .gh-portal-btn {
    flex: 1;
    min-width: 0;
    border: 0;
    height: 100% !important;
    border-radius: 999px;
    background: transparent;
    font-size: 1.4rem;
    white-space: nowrap;
    padding: 0 8px;
}

.gh-portal-gift-duration-switch .gh-portal-btn.active {
    background: var(--white);
    box-shadow: 0px 1px 3px rgba(var(--blackrgb), 0.08);
    color: var(--grey0);
}

.gh-portal-gift-checkout-email .gh-portal-input-labelcontainer {
    margin-bottom: 12px;
}

.gh-portal-gift-checkout-email .gh-portal-input-label {
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--grey6);
    margin-bottom: 0;
}

.gh-portal-gift-checkout-email .gh-portal-input {
    height: 48px;
    margin-bottom: 0;
}

.gh-portal-gift-checkout-tiers {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

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

.gh-portal-gift-checkout-tiers.single .gh-portal-gift-checkout-tier-item:hover {
    border-color: var(--grey11);
}

.gh-portal-gift-checkout-tier-item.selected {
    border-color: var(--brandcolor);
    background: color-mix(in srgb, var(--brandcolor) 6%, var(--white));
    box-shadow: 0 0 0 1px var(--brandcolor) inset;
}

.gh-portal-gift-checkout-tier {
    display: flex;
    align-items: flex-start;
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

.gh-portal-gift-checkout-tiers.single .gh-portal-gift-checkout-tier {
    cursor: default;
}

.gh-portal-gift-checkout-tier-radio {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin-top: 3px;
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

.gh-portal-gift-checkout-tier-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.gh-portal-gift-checkout-tier-heading {
    display: flex;
    align-items: baseline;
    gap: 10px;
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

.gh-portal-gift-checkout-tier-description {
    margin: 0;
    margin-top: -2px;
    font-size: 1.4rem;
    line-height: 1.4;
    color: var(--grey4);
}

.gh-portal-gift-checkout-tier-benefits {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s ease;
    /* overflow + padding-free inner: Chrome leaks the first benefit through
       a 0fr track if the grid item has padding (min-size includes padding). */
    overflow: hidden;
}

.gh-portal-gift-checkout-tier-benefits[data-open="true"] {
    grid-template-rows: 1fr;
}

.gh-portal-gift-checkout-tier-benefits-inner {
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
    margin-top: 3px;
    color: var(--grey1);
    flex-shrink: 0;
}

.gh-portal-gift-checkout-right-panel .gh-portal-gift-checkout-benefit {
    color: rgba(255, 255, 255, 0.85);
}

/* Checkmark SVG hard-codes its stroke so it can't be themed via color. */
.gh-portal-gift-checkout-right-panel .gh-portal-gift-checkout-benefit svg path {
    stroke: rgba(255, 255, 255, 0.85);
}

.gh-portal-gift-checkout-methods {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.gh-portal-gift-checkout-method {
    border: 1px solid var(--grey12);
    border-radius: 8px;
    transition: border-color 0.15s ease;
}

.gh-portal-gift-checkout-method:hover {
    border-color: var(--grey10);
}

.gh-portal-gift-checkout-method.selected {
    border-color: var(--brandcolor);
}

.gh-portal-gift-checkout-method-choice {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    padding: 14px 16px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: start;
}

.gh-portal-gift-checkout-method.selected .gh-portal-gift-checkout-tier-radio {
    border-color: var(--brandcolor);
    background: var(--brandcolor);
}

.gh-portal-gift-checkout-method.selected .gh-portal-gift-checkout-tier-radio::after {
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

.gh-portal-gift-checkout-method-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.gh-portal-gift-checkout-method-name {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--grey1);
}

.gh-portal-gift-checkout-method-description {
    font-size: 1.35rem;
    line-height: 1.4em;
    color: var(--grey6);
}

.gh-portal-gift-checkout-method-body {
    padding: 0 16px 16px;
}

.gh-portal-gift-checkout-method-body .gh-portal-input-label {
    font-size: 1.3rem;
}

.gh-portal-gift-checkout-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    align-self: flex-start;
    margin-bottom: 16px;
    padding: 0;
    border: none;
    background: none;
    font-size: 1.4rem;
    font-weight: 500;
    color: var(--grey6);
    cursor: pointer;
    transition: color 0.15s ease;
}

.gh-portal-gift-checkout-back:hover {
    color: var(--grey1);
}

.gh-portal-gift-checkout-note {
    margin: -8px 0 16px;
    font-size: 1.3rem;
    line-height: 1.45em;
    color: var(--grey6);
}

.gh-portal-gift-checkout-textarea {
    height: auto;
    min-height: 96px;
    padding: 10px 12px;
    resize: vertical;
    font-family: inherit;
    line-height: 1.5em;
}

.gh-portal-gift-checkout-delivery-date {
    margin-top: 12px;
}

.gh-portal-gift-checkout-delivery-date .gh-portal-input {
    margin-bottom: 0;
}

.gh-portal-gift-checkout-delivery-error {
    margin: 8px 0 0;
    color: var(--red);
    font-size: 1.3rem;
    letter-spacing: 0.35px;
    line-height: 1.6em;
}

/* Linear delivery form: the recipient's two email inputs and stacked fields
   need consistent spacing between them. */
.gh-portal-gift-checkout-section .gh-portal-input + .gh-portal-input {
    margin-top: 10px;
}

.gh-portal-gift-checkout-field-hint {
    margin: 8px 0 0;
    color: var(--grey6);
    font-size: 1.3rem;
    line-height: 1.5em;
}

.gh-portal-gift-checkout-field-hint.gh-portal-gift-checkout-match {
    color: var(--green);
}

.gh-portal-gift-checkout-message-count {
    margin: 6px 0 0;
    text-align: right;
    color: var(--grey8);
    font-size: 1.2rem;
    letter-spacing: 0.02em;
}

.gh-portal-gift-checkout-label-optional {
    text-transform: none;
    letter-spacing: 0;
    color: var(--grey8);
    font-weight: 400;
}

.gh-portal-gift-checkout-method-switch {
    margin-top: 20px;
    padding: 0;
    border: none;
    background: none;
    font-size: 1.4rem;
    font-weight: 500;
    color: var(--grey5);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
    text-align: start;
}

.gh-portal-gift-checkout-method-switch:hover {
    color: var(--grey3);
}

.gh-portal-gift-checkout .gh-portal-btn-primary {
    border-radius: 999px;
}

/* Desktop: the CTA flows at the end of the (vertically-centered) content.
   Sticky-pinning it here fought the centering and floated it over the
   duration/tier rows. Mobile re-enables sticky below, where the stacked
   layout genuinely scrolls. */
.gh-portal-gift-checkout-cta-wrapper {
    margin-top: 28px;
    z-index: 1;
}

.gh-portal-gift-checkout-cta {
    width: 100%;
    height: 48px;
    font-size: 1.5rem;
    font-weight: 600;
}

.gh-portal-gift-checkout-cta-note {
    margin: 12px 0 0;
    text-align: center;
    font-size: 1.3rem;
    line-height: 1.4em;
    color: var(--grey6);
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

.gh-portal-gift-checkout-right-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    background:
        linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0) 100%),
        var(--brandcolor);
    border-radius: 32px;
    padding: 64px 48px 64px;
    overflow-y: auto;
    min-height: 0;
}

.gh-portal-gift-checkout-card-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 280px;
    margin-block: auto;
    flex-shrink: 0;
}

.gh-portal-gift-checkout-card-frame {
    width: 100%;
    transform-style: preserve-3d;
    perspective: 1200px;
    transition: transform 0.3s ease;
    position: sticky;
    top: 0;
    z-index: 1;
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

.gh-portal-gift-checkout-details-description {
    margin: 0 0 12px;
    font-size: 1.45rem;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.85);
}

.gh-portal-gift-checkout-details-description:last-child {
    margin-bottom: 0;
}

.gh-portal-gift-checkout-card {
    position: relative;
    width: 100%;
    max-width: 280px;
    aspect-ratio: 1 / 1.45;
    background:
        linear-gradient(var(--shine-angle, 243.43deg), rgba(255, 255, 255, 0) 3.94%, rgba(255, 255, 255, 0.31) 49.99%, rgba(255, 255, 255, 0) 95.16%),
        linear-gradient(0deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.07)),
        var(--brandcolor);
    border-radius: 24px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 24px 48px rgba(var(--blackrgb), 0.08), 0 4px 12px rgba(var(--blackrgb), 0.04);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    isolation: isolate;
    transform-style: preserve-3d;
    will-change: transform;
}

.gh-portal-gift-checkout-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url("${giftCardOrbUrl}");
    background-size: 120% auto;
    background-position: -60% -180%;
    background-repeat: no-repeat;
    pointer-events: none;
    z-index: 0;
    opacity: 0.2;
}

.gh-portal-gift-checkout-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("${giftCardNoiseUrl}");
    background-size: 192px 192px;
    background-position: 50% 50%;
    background-repeat: repeat;
    pointer-events: none;
    z-index: 2;
    opacity: 0.1;
}

.gh-portal-gift-checkout-card > * {
    position: relative;
}

.gh-portal-gift-checkout-card-notch {
    position: absolute;
    top: 20px;
    left: 50%;
    width: 56px;
    height: 12px;
    border-radius: 12px;
    background: #000;
    background: color-mix(in srgb, var(--brandcolor) 65%, #000 35%);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.18);
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 3;
}

.gh-portal-gift-checkout-card-meta {
    padding: 56px 28px 0;
    z-index: 3;
}

.gh-portal-gift-checkout-card-duration {
    font-size: 2.8rem;
    font-weight: 600;
    color: var(--white);
    letter-spacing: -0.01em;
    line-height: 1.1;
}

.gh-portal-gift-checkout-card-tier {
    margin-top: 6px;
    font-size: 1.5rem;
    color: var(--white);
    line-height: 1.3;
}

.gh-portal-gift-checkout-card-details {
    margin-top: auto;
    padding: 0 28px 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 3;
}

.gh-portal-gift-checkout-card-detail-label {
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: -5px;
}

.gh-portal-gift-checkout-card-detail-value {
    font-size: 1.3rem;
    font-weight: 500;
    color: var(--white);
}

.gh-portal-gift-checkout-card-site {
    padding: 16px 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.gh-portal-gift-checkout-card-site::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--white);
    z-index: 1;
}

.gh-portal-gift-checkout-card-site-icon {
    width: 22px;
    height: 22px;
    object-fit: cover;
    position: relative;
    z-index: 3;
}

.gh-portal-gift-checkout-card-site-name {
    font-size: 1.4rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--grey0);
    position: relative;
    z-index: 3;
}


@media (max-width: 880px) {
    .gh-portal-popup-container.full-size.gift,
    .gh-portal-popup-container.full-size.giftSuccess,
    .gh-portal-popup-container.full-size.giftRedemption {
        padding: 0 !important;
    }

    .gh-portal-gift-checkout {
        grid-template-columns: 1fr;
        min-height: 0;
    }

    .gh-portal-gift-checkout-right {
        order: -1;
        position: static;
        height: auto;
        padding: 0;
        overflow: visible;
    }

    .gh-portal-gift-checkout-right-panel {
        padding: 56px 24px 32px;
        border-radius: 0 0 32px 32px;
    }

    .gh-portal-gift-checkout-left {
        padding: 32px 24px 0;
    }

    /* Screens without a sticky CTA wrapper need their own bottom padding. */
    .gh-portal-content.giftSuccess .gh-portal-gift-checkout-left,
    .gh-portal-content.giftRedemption .gh-portal-gift-checkout-left {
        padding-bottom: 24px;
    }

    .gh-portal-gift-checkout-card,
    .gh-portal-gift-checkout-card-stack {
        max-width: 240px;
    }

    .gh-portal-gift-checkout-cta-wrapper {
        position: sticky;
        bottom: 0;
        margin: 24px 0 0;
        padding: 24px 0;
        background: linear-gradient(0deg, rgba(var(--whitergb), 1) 70%, rgba(var(--whitergb), 0) 100%);
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

function GiftDurationSwitch({offeredDurations, activeDuration, setSelectedDuration}) {
    if (offeredDurations.length < 2) {
        return null;
    }

    return (
        <div className='gh-portal-gift-duration-switch' role='radiogroup' aria-label={t('Gift duration')}>
            {offeredDurations.map((months) => {
                const isActive = months === activeDuration;
                return (
                    <button
                        key={months}
                        type='button'
                        role='radio'
                        aria-checked={isActive}
                        data-test-button={`switch-duration-${months}`}
                        className={'gh-portal-btn' + (isActive ? ' active' : '')}
                        onClick={() => setSelectedDuration(months)}
                    >
                        {getGiftDurationLabel(getGiftCadenceParts(months))}
                    </button>
                );
            })}
        </div>
    );
}

const GIFT_MESSAGE_MAX_LENGTH = 500;
const GIFT_MAX_SCHEDULE_DAYS = 365;

function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatGiftValue(price) {
    const {amount, currency} = price ?? {};
    if (amount === null || amount === undefined || !currency) {
        return '';
    }
    return `${getCurrencySymbol(currency)}${formatNumber(getStripeAmount(amount))}`;
}

function getTierPriceLabel(product, months) {
    return formatGiftValue(getGiftPrice(product, months));
}

const GiftPage = () => {
    const {site, member, brandColor, action, doAction, lastPage} = useContext(AppContext);
    const [step, setStep] = useState('plan');
    const [selectedDuration, setSelectedDuration] = useState(null);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [email, setEmail] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [buyerName, setBuyerName] = useState(member?.name || '');
    const [giftMessage, setGiftMessage] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState('email');
    const [deliveryOption, setDeliveryOption] = useState('now');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [errors, setErrors] = useState({});
    const {cardRef, containerProps: cardTiltProps} = useCardTilt();

    // Prefill the "from" name once the logged-in member loads, without
    // clobbering anything the buyer has already typed
    useEffect(() => {
        setBuyerName(current => current || member?.name || '');
    }, [member?.name]);

    if (!site) {
        return <LoadingPage />;
    }

    const offeredDurations = getOfferedGiftDurations({site});
    const activeDuration = (selectedDuration && offeredDurations.includes(selectedDuration))
        ? selectedDuration
        : getDefaultGiftDuration({site});
    // Publishers can choose which paid tiers are offered as gifts. An empty
    // gift_tiers list means "all paid tiers" (backward compatible).
    const giftTiers = Array.isArray(site.gift_tiers) ? site.gift_tiers : [];
    const products = getAvailableProducts({site})
        .filter(p => p.type === 'paid')
        .filter(p => giftTiers.length === 0 || giftTiers.includes(p.id));

    const siteIcon = site.icon;
    const siteTitle = site.title || '';
    const giftPageHeading = site.gift_page_heading?.trim() || '';
    const giftPageDescriptionHtml = site.gift_page_description?.trim() || '';
    const giftPageImage = site.gift_page_image || '';

    if (products.length === 0 || !activeDuration) {
        return (
            <>
                <BackButton hidden={!lastPage} onClick={() => doAction('back')} />
                <CloseButton />
                <div className='gh-portal-content gift'>
                    <div className='gh-portal-gift-checkout'>
                        <div className='gh-portal-gift-checkout-left'>
                            <div className='gh-portal-gift-checkout-bg' aria-hidden='true' />
                            <div className='gh-portal-gift-checkout-inner'>
                                <header className='gh-portal-gift-checkout-header'>
                                    <h1 className='gh-portal-main-title'>{giftPageHeading || t('Gift a membership')}</h1>
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

    const recipientEmailField = {
        type: 'email',
        value: recipientEmail,
        placeholder: t('taylor@example.com'),
        label: t('Recipient\'s email'),
        name: 'recipientEmail',
        required: false,
        errorMessage: errors.recipientEmail || ''
    };

    const confirmEmailField = {
        type: 'email',
        value: confirmEmail,
        placeholder: t('taylor@example.com'),
        label: t('Confirm recipient\'s email'),
        name: 'confirmEmail',
        required: false,
        errorMessage: errors.confirmEmail || ''
    };

    const buyerNameField = {
        type: 'text',
        value: buyerName,
        placeholder: t('Jamie Larson'),
        label: t('Your name'),
        name: 'buyerName',
        required: false,
        errorMessage: errors.buyerName || ''
    };

    const recipientNameField = {
        type: 'text',
        value: recipientName,
        placeholder: t('Taylor'),
        label: t('Recipient\'s name'),
        name: 'recipientName',
        required: false,
        errorMessage: ''
    };

    const today = new Date();
    const minDeliveryDay = new Date(today);
    minDeliveryDay.setDate(minDeliveryDay.getDate() + 1);
    const maxDeliveryDay = new Date(today);
    maxDeliveryDay.setDate(maxDeliveryDay.getDate() + GIFT_MAX_SCHEDULE_DAYS);
    const minDeliveryDate = toDateInputValue(minDeliveryDay);
    const maxDeliveryDate = toDateInputValue(maxDeliveryDay);

    const handleEmailChange = (event) => {
        setErrors(currentErrors => ({
            ...currentErrors,
            email: ''
        }));
        setEmail(event.target.value);
    };

    const handleRecipientEmailChange = (event) => {
        setErrors(currentErrors => ({
            ...currentErrors,
            recipientEmail: '',
            confirmEmail: '',
            deliveryDate: ''
        }));
        setRecipientEmail(event.target.value);
    };

    const handleConfirmEmailChange = (event) => {
        setErrors(currentErrors => ({
            ...currentErrors,
            confirmEmail: ''
        }));
        setConfirmEmail(event.target.value);
    };

    const handleDeliveryMethodChange = (method) => {
        setErrors(currentErrors => ({
            ...currentErrors,
            recipientEmail: '',
            confirmEmail: '',
            deliveryDate: ''
        }));
        setDeliveryMethod(method);
    };

    const handleDeliveryDateChange = (event) => {
        setErrors(currentErrors => ({
            ...currentErrors,
            deliveryDate: ''
        }));
        setDeliveryDate(event.target.value);
    };

    const handleDeliveryOptionChange = (option) => {
        setErrors(currentErrors => ({
            ...currentErrors,
            deliveryDate: ''
        }));
        setDeliveryOption(option);
        if (option === 'now') {
            setDeliveryDate('');
        }
    };

    const handleContinueToDelivery = (e) => {
        e.preventDefault();
        // The buyer's email is now collected on the delivery step, so the plan
        // step just needs a tier/duration (always selected) before continuing.
        setStep('delivery');
    };

    const handleBackToPlan = (e) => {
        e.preventDefault();
        setErrors({});
        setStep('plan');
    };

    const handlePurchase = (e) => {
        e.preventDefault();

        if (isPurchasing) {
            return;
        }

        const customerEmail = email.trim();
        const trimmedRecipientEmail = recipientEmail.trim();
        const trimmedRecipientName = recipientName.trim();
        const trimmedBuyerName = buyerName.trim();
        const trimmedGiftMessage = giftMessage.trim();
        const isEmailDelivery = deliveryMethod === 'email';
        // With the linear form, a chosen date means "schedule"; an empty date
        // means "send as soon as payment completes".
        const isScheduled = isEmailDelivery && deliveryOption === 'schedule';

        const fieldsToValidate = [];
        if (!isLoggedIn) {
            fieldsToValidate.push({...emailField, value: customerEmail});
        }
        if (isEmailDelivery && trimmedRecipientEmail) {
            fieldsToValidate.push({...recipientEmailField, value: trimmedRecipientEmail});
        }

        const formErrors = ValidateInputForm({fields: fieldsToValidate});

        if (isEmailDelivery && !trimmedRecipientEmail) {
            formErrors.recipientEmail = t('Enter the recipient\'s email address');
        } else if (isEmailDelivery && confirmEmail.trim() !== trimmedRecipientEmail) {
            formErrors.confirmEmail = t('Email addresses do not match');
        }

        if (isScheduled && !formErrors.recipientEmail) {
            if (!deliveryDate) {
                formErrors.deliveryDate = t('Choose a delivery date');
            } else if (deliveryDate < minDeliveryDate || deliveryDate > maxDeliveryDate) {
                formErrors.deliveryDate = t('Choose a date within the next year');
            }
        }

        const formHasErrors = Object.values(formErrors).some(errorMessage => !!errorMessage);

        setErrors(formErrors);

        if (formHasErrors) {
            return;
        }

        doAction('checkoutGift', {
            tierId: activeProduct.id,
            duration: activeDuration,
            // Older Ghost backends only understand a cadence; send the anchor
            // cadence alongside so the request still resolves there
            cadence: getGiftCadenceParts(activeDuration).cadence,
            ...(!isLoggedIn ? {email: customerEmail} : {}),
            ...(isEmailDelivery ? {recipientEmail: trimmedRecipientEmail} : {}),
            ...(isEmailDelivery && trimmedRecipientName ? {recipientName: trimmedRecipientName} : {}),
            ...(trimmedBuyerName ? {buyerName: trimmedBuyerName} : {}),
            ...(trimmedGiftMessage ? {giftMessage: trimmedGiftMessage} : {}),
            ...(isScheduled && deliveryDate ? {deliveryDate} : {})
        });
    };

    return (
        <>
            <BackButton hidden={!lastPage} onClick={() => doAction('back')} />
            <CloseButton />
            <div className='gh-portal-content gift'>
                <div className='gh-portal-gift-checkout'>
                    <div className='gh-portal-gift-checkout-left'>
                        <div className='gh-portal-gift-checkout-bg' aria-hidden='true' />
                        <div className='gh-portal-gift-checkout-inner'>
                            {step === 'delivery' && (
                                <button
                                    type='button'
                                    className='gh-portal-gift-checkout-back'
                                    data-test-button='gift-back'
                                    onClick={handleBackToPlan}
                                >
                                    &larr; {t('Back')}
                                </button>
                            )}

                            <header className='gh-portal-gift-checkout-header'>
                                {step === 'plan' ? (
                                    <>
                                        {giftPageImage && (
                                            <img alt='' className='gh-portal-gift-checkout-promo-image' src={giftPageImage} />
                                        )}
                                        <h1 className='gh-portal-main-title'>{giftPageHeading || t('Gift a membership')}</h1>
                                        {giftPageDescriptionHtml ? (
                                            <div
                                                className='gh-portal-gift-checkout-subtitle'
                                                dangerouslySetInnerHTML={{__html: sanitizeHtml(giftPageDescriptionHtml)}}
                                            />
                                        ) : (
                                            <p className='gh-portal-gift-checkout-subtitle'>
                                                {t('Share a full membership to {siteTitle} with a friend or colleague', {siteTitle})}
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <h1 className='gh-portal-main-title'>{giftPageHeading || t('Gift a membership')}</h1>
                                        <p className='gh-portal-gift-checkout-subtitle'>
                                            {t('Choose how your gift is delivered')}
                                        </p>
                                    </>
                                )}
                            </header>


                            {step === 'plan' && offeredDurations.length > 1 && (
                                <div className='gh-portal-gift-checkout-section'>
                                    <div className='gh-portal-gift-checkout-label'>{t('Duration')}</div>
                                    <GiftDurationSwitch
                                        offeredDurations={offeredDurations}
                                        activeDuration={activeDuration}
                                        setSelectedDuration={setSelectedDuration}
                                    />
                                </div>
                            )}

                            {step === 'plan' && <div className='gh-portal-gift-checkout-section'>
                                {!isSingleTier && (
                                    <div className='gh-portal-gift-checkout-label'>{t('Choose a tier')}</div>
                                )}
                                <div
                                    className={'gh-portal-gift-checkout-tiers' + (isSingleTier ? ' single' : '')}
                                    role={isSingleTier ? undefined : 'radiogroup'}
                                    aria-label={isSingleTier ? undefined : t('Choose a tier')}
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
                                                            <span className='gh-portal-gift-checkout-tier-price'>{getTierPriceLabel(product, activeDuration)}</span>
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
                            </div>}

                            {step === 'delivery' && <>
                                <div className='gh-portal-gift-checkout-section'>
                                    <div className='gh-portal-gift-checkout-label'>{t('Who\'s this gift from?')}</div>
                                    <InputField
                                        {...buyerNameField}
                                        onChange={(event) => {
                                            setErrors(currentErrors => ({...currentErrors, buyerName: ''}));
                                            setBuyerName(event.target.value);
                                        }}
                                    />
                                    {!isLoggedIn && (
                                        <InputField
                                            {...emailField}
                                            onChange={handleEmailChange}
                                        />
                                    )}
                                </div>

                                {deliveryMethod === 'email' && <>
                                    <div className='gh-portal-gift-checkout-section'>
                                        <div className='gh-portal-gift-checkout-label'>{t('Who\'s this gift for?')}</div>
                                        <InputField
                                            {...recipientNameField}
                                            onChange={event => setRecipientName(event.target.value)}
                                        />
                                        <InputField
                                            {...recipientEmailField}
                                            onChange={handleRecipientEmailChange}
                                        />
                                        <InputField
                                            {...confirmEmailField}
                                            onChange={handleConfirmEmailChange}
                                        />
                                        {recipientEmail.trim() && confirmEmail.trim() && (
                                            confirmEmail.trim() === recipientEmail.trim() ? (
                                                <p className='gh-portal-gift-checkout-field-hint gh-portal-gift-checkout-match'>{t('Email addresses match')}</p>
                                            ) : (
                                                <p className='gh-portal-gift-checkout-field-hint'>{t('Keep typing — the emails don\'t match yet')}</p>
                                            )
                                        )}
                                    </div>

                                    <div className='gh-portal-gift-checkout-section'>
                                        <div className='gh-portal-gift-checkout-label'>{t('When to send it')}</div>
                                        <div className='gh-portal-gift-duration-switch' role='radiogroup' aria-label={t('When to send it')}>
                                            <button
                                                type='button'
                                                role='radio'
                                                aria-checked={deliveryOption === 'now'}
                                                data-test-button='delivery-now'
                                                className={'gh-portal-btn' + (deliveryOption === 'now' ? ' active' : '')}
                                                onClick={() => handleDeliveryOptionChange('now')}
                                            >
                                                {t('Send right away')}
                                            </button>
                                            <button
                                                type='button'
                                                role='radio'
                                                aria-checked={deliveryOption === 'schedule'}
                                                data-test-button='delivery-scheduled'
                                                className={'gh-portal-btn' + (deliveryOption === 'schedule' ? ' active' : '')}
                                                onClick={() => handleDeliveryOptionChange('schedule')}
                                            >
                                                {t('Schedule')}
                                            </button>
                                        </div>
                                        {deliveryOption === 'schedule' && (
                                            <div className='gh-portal-gift-checkout-delivery-date'>
                                                <input
                                                    data-test-input='gift-delivery-date'
                                                    className={'gh-portal-input' + (errors.deliveryDate ? ' error' : '')}
                                                    type='date'
                                                    aria-label={t('Delivery date')}
                                                    min={minDeliveryDate}
                                                    max={maxDeliveryDate}
                                                    value={deliveryDate}
                                                    onChange={handleDeliveryDateChange}
                                                />
                                                {errors.deliveryDate && (
                                                    <p className='gh-portal-gift-checkout-delivery-error'>{errors.deliveryDate}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>}

                                <div className='gh-portal-gift-checkout-section'>
                                    <div className='gh-portal-gift-checkout-label'>{t('Add a message')} <span className='gh-portal-gift-checkout-label-optional'>{t('(optional)')}</span></div>
                                    <textarea
                                        data-test-input='gift-message'
                                        className='gh-portal-input gh-portal-gift-checkout-textarea'
                                        aria-label={t('Personal message')}
                                        placeholder={deliveryMethod === 'email' ? t('Add a short note to go with your gift') : t('Add a short note to include with the gift link')}
                                        maxLength={GIFT_MESSAGE_MAX_LENGTH}
                                        value={giftMessage}
                                        onChange={event => setGiftMessage(event.target.value)}
                                    />
                                    <p className='gh-portal-gift-checkout-message-count'>{giftMessage.length}/{GIFT_MESSAGE_MAX_LENGTH}</p>
                                </div>

                                <button
                                    type='button'
                                    className='gh-portal-gift-checkout-method-switch'
                                    data-test-button={deliveryMethod === 'email' ? 'delivery-method-link' : 'delivery-method-email'}
                                    onClick={() => handleDeliveryMethodChange(deliveryMethod === 'email' ? 'link' : 'email')}
                                >
                                    {deliveryMethod === 'email'
                                        ? t('Prefer to share the gift yourself? Get a link instead')
                                        : t('Or send it straight to their inbox')}
                                </button>
                            </>}

                            <div className='gh-portal-gift-checkout-cta-wrapper'>
                                {step === 'plan' ? (
                                    <ActionButton
                                        dataTestId='gift-continue'
                                        label={t('Continue')}
                                        onClick={handleContinueToDelivery}
                                        disabled={isDisabled}
                                        brandColor={brandColor}
                                        classes='gh-portal-gift-checkout-cta'
                                        style={{width: '100%'}}
                                    />
                                ) : (
                                    <ActionButton
                                        dataTestId='purchase-gift'
                                        label={t('Continue to payment')}
                                        onClick={handlePurchase}
                                        disabled={isDisabled}
                                        isRunning={isPurchasing}
                                        brandColor={brandColor}
                                        classes='gh-portal-gift-checkout-cta'
                                        style={{width: '100%'}}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className='gh-portal-gift-checkout-right' {...cardTiltProps}>
                        <div className='gh-portal-gift-checkout-right-panel'>
                            <div className='gh-portal-gift-checkout-card-stack'>
                                <GiftCard
                                    cardRef={cardRef}
                                    duration={getGiftDurationLabel(getGiftCadenceParts(activeDuration))}
                                    tierName={activeProduct.name}
                                    giftValue={getTierPriceLabel(activeProduct, activeDuration)}
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

export default GiftPage;
