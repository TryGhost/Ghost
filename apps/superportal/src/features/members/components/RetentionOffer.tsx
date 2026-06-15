/**
 * Retention offer shown when a paid member starts to cancel. Presentational:
 * the parent (AccountPlan) handles applyOffer on accept and the fall-through to
 * the cancel confirm on decline. Base price is the member's current
 * subscription price; the discount comes from the offer.
 */

import {type ReactElement} from 'react';
import type {Services} from '../../../types';
import type {Offer, Subscription} from '../../../shared/api-client';
import {cn} from '../../../shared/cn';
import {priceParts, getDiscountedAmount, offerDurationMessage, type TierPrice} from '../../../shared/pricing';

interface Props {
    offer: Offer;
    subscription: Subscription;
    submitting: boolean;
    locale: string;
    onAccept(): void;
    onDecline(): void;
    t: Services['t'];
}

const PRIMARY_BTN = cn(
    'gh:flex gh:w-full gh:items-center gh:justify-center gh:gap-2',
    'gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer',
    'gh:bg-[var(--ghost-accent-color,#15171a)] gh:disabled:opacity-60 gh:disabled:cursor-not-allowed'
);
const LINK_BTN = 'gh:border-0 gh:bg-transparent gh:p-0 gh:text-[14px] gh:font-semibold gh:text-[#a3160e] gh:cursor-pointer gh:no-underline gh:hover:underline gh:disabled:opacity-60';

export function RetentionOffer({offer, subscription, submitting, locale, onAccept, onDecline, t}: Props): ReactElement {
    const base: TierPrice = {amount: subscription.price.amount, currency: subscription.price.currency, interval: subscription.price.interval};
    const periodLabel = '/' + (base.interval === 'year' ? t('year') : t('month'));
    const original = priceParts(base, locale);
    const discounted = priceParts({...base, amount: getDiscountedAmount(offer, base.amount)}, locale);
    const originalLabel = `${original.symbol}${original.amount}${periodLabel}`;

    return (
        <div>
            <header className="gh:mb-4 gh:text-center">
                <h1 className="gh:m-0 gh:text-[24px] gh:font-bold gh:leading-tight gh:text-[#15171a]">
                    {offer.display_title || t('Before you go')}
                </h1>
                {offer.display_description && (
                    <p className="gh:m-0 gh:mt-2 gh:text-[14px] gh:text-[#7c8087]">{offer.display_description}</p>
                )}
            </header>

            <div className="gh:mb-5 gh:rounded-[7px] gh:border gh:border-[#e0e2e4] gh:bg-white gh:p-5">
                <div className="gh:flex gh:items-end gh:gap-2">
                    <span className="gh:flex gh:items-start gh:text-[#15171a]">
                        <span className="gh:mt-1 gh:text-[18px] gh:font-bold gh:leading-none">{discounted.symbol}</span>
                        <span className="gh:text-[34px] gh:font-bold gh:leading-none gh:tracking-tight">{discounted.amount}</span>
                        <span className="gh:mt-auto gh:ms-1 gh:text-[13px] gh:text-[#7c8087]">{periodLabel}</span>
                    </span>
                    {offer.type !== 'trial' && (
                        <span className="gh:mb-1 gh:text-[14px] gh:text-[#9aa0a6] gh:line-through">{originalLabel}</span>
                    )}
                </div>
                <p className="gh:mt-3 gh:mb-0 gh:text-[13px] gh:text-[#7c8087]">{offerDurationMessage(offer, originalLabel, t)}</p>
            </div>

            <button type="button" disabled={submitting} onClick={onAccept} className={PRIMARY_BTN}>
                {t('Continue subscription')}
            </button>

            <div className="gh:mt-5 gh:flex gh:justify-center">
                <button type="button" className={LINK_BTN} disabled={submitting} onClick={onDecline}>
                    {t('No thanks, I want to cancel')}
                </button>
            </div>
        </div>
    );
}
