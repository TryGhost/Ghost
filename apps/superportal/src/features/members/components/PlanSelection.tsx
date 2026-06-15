/**
 * Tier picker — Portal's product cards with a monthly/yearly toggle. Each card
 * carries its own CTA; the parent decides what choosing a tier does.
 * Presentational: no API calls, no internal selection state. Shared by the
 * signup flow (grid layout, free card with $0 price) and the account
 * plan-change page (stacked layout, "Current plan" pill).
 */

import {type ReactElement, type ReactNode} from 'react';
import type {Services} from '../../../types';
import type {MemberTier, Subscription} from '../../../shared/api-client';
import {cn} from '../../../shared/cn';
import {
    priceFor,
    priceParts,
    isCurrent,
    hasBothCadences,
    maxYearlyDiscount,
    yearlyDiscount,
    benefitName,
    benefitKey,
    type Cadence,
} from '../plans';

/** Sentinel id used for the optional Free card in the signup flow. */
export const FREE_PLAN_ID = 'free';

interface Props {
    tiers: MemberTier[];
    cadence: Cadence;
    onCadenceChange(c: Cadence): void;
    onChoose(id: string): void;
    currentSubscription?: Subscription | null;
    /** When set, renders a Free option card using this tier's name/description. */
    freeTier?: MemberTier;
    /** Overrides Portal's per-card label logic (Choose / Continue / trial). */
    ctaLabel?: string;
    /** Disables every CTA (e.g. while a checkout request is in flight). */
    busy?: boolean;
    /** The card whose CTA is in flight — shows the spinner + inline error there. */
    selectedId?: string | null;
    /** Checkout/signup failure shown under the selected card's button. */
    error?: string;
    /** 'grid' = Portal's full-screen side-by-side cards; 'stack' = single column. */
    layout?: 'stack' | 'grid';
    /** Defaults to hasBothCadences(tiers); signup passes the portal_plans rule. */
    showToggle?: boolean;
    /** Show the $0 price block on the free card (multi-product signup). */
    showFreePrice?: boolean;
    locale: string;
    t: Services['t'];
}

const CARD_BTN = cn(
    'gh:mt-6 gh:flex gh:h-11 gh:w-full gh:items-center gh:justify-center gh:rounded-md gh:border-0',
    'gh:px-4 gh:text-[15px] gh:font-medium gh:text-white gh:cursor-pointer',
    'gh:bg-[var(--ghost-accent-color,#15171a)] gh:hover:opacity-90 gh:disabled:opacity-60 gh:disabled:cursor-not-allowed'
);

const TOGGLE_BTN = 'gh:w-1/2 gh:rounded-full gh:border-0 gh:px-3 gh:text-[15px] gh:font-medium gh:text-[#1d1d1d] gh:cursor-pointer gh:inline-flex gh:items-center gh:justify-center gh:gap-1';

const CARD_CLS = 'gh:flex gh:min-h-[200px] gh:flex-col gh:rounded-[7px] gh:border gh:border-[#e1e1e1] gh:bg-white gh:p-8';

const GRID_CARD_CLS = 'gh:flex-1 gh:min-w-[320px] gh:max-w-[420px] gh:max-[880px]:min-w-0 gh:max-[880px]:max-w-none';

const GRID_WRAP_CLS = cn(
    'gh:flex gh:flex-wrap gh:items-stretch gh:justify-center gh:gap-10',
    'gh:max-[880px]:mx-auto gh:max-[880px]:w-full gh:max-[880px]:max-w-[420px] gh:max-[880px]:flex-col gh:max-[880px]:flex-nowrap gh:max-[880px]:gap-5'
);

export function PlanSelection({
    tiers,
    cadence,
    onCadenceChange,
    onChoose,
    currentSubscription,
    freeTier,
    ctaLabel,
    busy,
    selectedId,
    error,
    layout = 'stack',
    showToggle,
    showFreePrice,
    locale,
    t,
}: Props): ReactElement {
    const toggle = showToggle ?? hasBothCadences(tiers);
    const topDiscount = maxYearlyDiscount(tiers);
    const noOfProducts = tiers.length + (freeTier ? 1 : 0);
    const grid = layout === 'grid';

    function cardLabel(tier: MemberTier): string {
        if (ctaLabel) return ctaLabel;
        if (tier.trial_days && tier.trial_days > 0) {
            return t('Start {amount}-day free trial', {amount: tier.trial_days});
        }
        return noOfProducts > 1 ? t('Choose') : t('Continue');
    }

    return (
        <div>
            {toggle && (
                <div className={cn('gh:mb-10 gh:flex gh:h-11 gh:gap-1 gh:rounded-full gh:bg-[#f3f3f3] gh:p-1', grid && 'gh:mx-auto gh:max-w-[420px]')}>
                    <button
                        type="button"
                        aria-pressed={cadence === 'month'}
                        onClick={() => onCadenceChange('month')}
                        className={cn(TOGGLE_BTN, cadence === 'month' ? 'gh:bg-white gh:shadow-sm gh:font-semibold' : 'gh:bg-transparent')}
                    >
                        {t('Monthly')}
                    </button>
                    <button
                        type="button"
                        aria-pressed={cadence === 'year'}
                        onClick={() => onCadenceChange('year')}
                        className={cn(TOGGLE_BTN, cadence === 'year' ? 'gh:bg-white gh:shadow-sm gh:font-semibold' : 'gh:bg-transparent')}
                    >
                        {t('Yearly')}
                        {topDiscount > 0 && (
                            <span className="gh:font-normal gh:opacity-50 gh:max-[670px]:hidden">
                                {t('(save {highestYearlyDiscount}%)', {highestYearlyDiscount: topDiscount})}
                            </span>
                        )}
                    </button>
                </div>
            )}

            <div className={grid ? GRID_WRAP_CLS : 'gh:flex gh:flex-col gh:gap-4'}>
                {freeTier && (
                    <FreeCard
                        tier={freeTier}
                        label={ctaLabel || t('Choose')}
                        busy={busy}
                        selected={selectedId === FREE_PLAN_ID}
                        error={selectedId === FREE_PLAN_ID ? error : undefined}
                        showPrice={showFreePrice ?? false}
                        currencySymbol={freeCurrencySymbol(tiers, locale)}
                        grid={grid}
                        onChoose={() => onChoose(FREE_PLAN_ID)}
                    />
                )}

                {tiers.map((tier) => (
                    <PlanCard
                        key={tier.id}
                        tier={tier}
                        cadence={cadence}
                        current={isCurrent(tier, cadence, currentSubscription)}
                        label={cardLabel(tier)}
                        busy={busy}
                        selected={selectedId === tier.id}
                        error={selectedId === tier.id ? error : undefined}
                        grid={grid}
                        onChoose={() => onChoose(tier.id)}
                        locale={locale}
                        t={t}
                    />
                ))}
            </div>
        </div>
    );
}

/** Portal derives the free card's currency sign from the first paid tier. */
function freeCurrencySymbol(tiers: MemberTier[], locale: string): string {
    const priced = tiers.find(tier => tier.monthly_price && tier.currency);
    if (!priced) return '$';
    const price = priceFor(priced, 'month');
    return price ? priceParts(price, locale).symbol : '$';
}

function CardError({error}: {error?: string}): ReactElement | null {
    if (!error) return null;
    return <p className="gh:m-0 gh:mt-2 gh:text-center gh:text-[13px] gh:text-[#e23a31]">{error}</p>;
}

interface PlanCardProps {
    tier: MemberTier;
    cadence: Cadence;
    current: boolean;
    label: string;
    busy?: boolean;
    selected?: boolean;
    error?: string;
    grid?: boolean;
    onChoose(): void;
    locale: string;
    t: Services['t'];
}

function PlanCard({tier, cadence, current, label, busy, selected, error, grid, onChoose, locale, t}: PlanCardProps): ReactElement {
    const price = priceFor(tier, cadence);
    const parts = price ? priceParts(price, locale) : null;
    const discount = cadence === 'year' ? yearlyDiscount(tier.monthly_price, tier.yearly_price) : 0;
    const benefits = tier.benefits ?? [];
    const trialDays = tier.trial_days ?? 0;

    return (
        <div className={cn(CARD_CLS, grid && GRID_CARD_CLS)}>
            <h3 className="gh:-mt-1 gh:mb-0 gh:text-[18px] gh:font-semibold gh:leading-[1.3] gh:text-[var(--ghost-accent-color,#15171a)]">
                {tier.name}
            </h3>

            {parts && (
                <div className="gh:mt-4 gh:flex gh:w-full gh:flex-wrap gh:items-end gh:justify-between gh:gap-x-1 gh:gap-y-2.5">
                    <span className="gh:flex gh:items-start gh:text-[#1d1d1d]">
                        <span className="gh:mt-1 gh:text-[20px] gh:font-bold gh:leading-none">{parts.symbol}</span>
                        <span className="gh:text-[35px] gh:font-bold gh:leading-none gh:tracking-[-1.3px]">{parts.amount}</span>
                        <span className="gh:mt-auto gh:ms-1 gh:text-[14px] gh:text-[#7f7f7f]">
                            {'/' + (cadence === 'year' ? t('year') : t('month'))}
                        </span>
                    </span>
                    {trialDays > 0 && (
                        <DiscountPill>{t('{trialDays} days free', {trialDays})}</DiscountPill>
                    )}
                    {trialDays === 0 && discount > 0 && (
                        <span className="gh:max-[670px]:hidden">
                            <DiscountPill>{t('{discount}% discount', {discount})}</DiscountPill>
                        </span>
                    )}
                </div>
            )}

            {tier.description && (
                <p className="gh:mt-4 gh:mb-0 gh:text-[15.5px] gh:font-semibold gh:leading-[1.4] gh:text-[#1d1d1d]">{tier.description}</p>
            )}

            {benefits.length > 0 && (
                <ul className="gh:mt-4 gh:mb-0 gh:flex gh:list-none gh:flex-col gh:gap-2.5 gh:p-0">
                    {benefits.map((b, idx) => (
                        <li key={benefitKey(b, idx)} className="gh:flex gh:items-start gh:gap-2.5 gh:text-[15px] gh:leading-snug gh:text-[#333]">
                            <CheckmarkIcon />
                            <span>{benefitName(b)}</span>
                        </li>
                    ))}
                </ul>
            )}

            <div className="gh:mt-auto">
                {current ? (
                    <div className="gh:mt-6 gh:flex gh:h-11 gh:w-full gh:items-center gh:justify-center gh:rounded-md gh:bg-[#f4f5f6] gh:text-[14px] gh:font-medium gh:text-[#7c8087]">
                        {t('Current plan')}
                    </div>
                ) : (
                    <button type="button" disabled={busy} onClick={onChoose} className={CARD_BTN}>
                        {busy && selected ? <Spinner /> : label}
                    </button>
                )}
                <CardError error={error} />
            </div>
        </div>
    );
}

interface FreeCardProps {
    tier: MemberTier;
    label: string;
    busy?: boolean;
    selected?: boolean;
    error?: string;
    showPrice: boolean;
    currencySymbol: string;
    grid?: boolean;
    onChoose(): void;
}

function FreeCard({tier, label, busy, selected, error, showPrice, currencySymbol, grid, onChoose}: FreeCardProps): ReactElement {
    const benefits = tier.benefits ?? [];
    // Portal falls back to a literal 'Free preview' when the free tier has
    // neither description nor benefits (untranslated upstream too).
    const description = tier.description || (benefits.length ? '' : 'Free preview');

    return (
        <div className={cn(CARD_CLS, grid && GRID_CARD_CLS)}>
            <h3 className="gh:-mt-1 gh:mb-0 gh:text-[18px] gh:font-semibold gh:leading-[1.3] gh:text-[var(--ghost-accent-color,#15171a)]">
                {tier.name}
            </h3>

            {showPrice && (
                <div className="gh:mt-4 gh:flex gh:items-start gh:text-[#1d1d1d]">
                    <span className="gh:mt-1 gh:text-[20px] gh:font-bold gh:leading-none">{currencySymbol}</span>
                    <span className="gh:text-[35px] gh:font-bold gh:leading-none gh:tracking-[-1.3px]">0</span>
                </div>
            )}

            {description && (
                <p className="gh:mt-4 gh:mb-0 gh:text-[15.5px] gh:font-semibold gh:leading-[1.4] gh:text-[#1d1d1d]">
                    {description}
                </p>
            )}

            {benefits.length > 0 && (
                <ul className="gh:mt-4 gh:mb-0 gh:flex gh:list-none gh:flex-col gh:gap-2.5 gh:p-0">
                    {benefits.map((b, idx) => (
                        <li key={benefitKey(b, idx)} className="gh:flex gh:items-start gh:gap-2.5 gh:text-[15px] gh:leading-snug gh:text-[#333]">
                            <CheckmarkIcon />
                            <span>{benefitName(b)}</span>
                        </li>
                    ))}
                </ul>
            )}

            <div className="gh:mt-auto">
                <button type="button" disabled={busy} onClick={onChoose} className={CARD_BTN}>
                    {busy && selected ? <Spinner /> : label}
                </button>
                <CardError error={error} />
            </div>
        </div>
    );
}

function Spinner(): ReactElement {
    return (
        <svg className="gh:h-5 gh:w-5 gh:animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="gh:opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="gh:opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
    );
}

function DiscountPill({children}: {children: ReactNode}): ReactElement {
    return (
        <span className="gh:relative gh:rounded-full gh:px-2 gh:py-1 gh:text-[13px] gh:font-semibold gh:text-[var(--ghost-accent-color,#15171a)]">
            <span className="gh:absolute gh:inset-0 gh:rounded-full gh:bg-[var(--ghost-accent-color,#15171a)] gh:opacity-15" aria-hidden="true" />
            <span className="gh:relative">{children}</span>
        </span>
    );
}

function CheckmarkIcon(): ReactElement {
    return (
        <svg
            className="gh:mt-[3px] gh:h-3.5 gh:w-3.5 gh:shrink-0 gh:text-[#222]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}
