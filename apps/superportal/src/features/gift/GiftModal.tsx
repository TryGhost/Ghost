/**
 * Gift modal — purchase, redemption, and post-checkout success views, porting
 * Portal's gift-page / gift-redemption-page / gift-success-page flows.
 */

import {useEffect, useState, type ChangeEvent, type KeyboardEvent, type ReactElement, type ReactNode} from 'react';
import type {Services, SiteTier} from '../../types';
import {ApiError, type MembersApiClient, type GiftData} from '../../shared/api-client';
import {cn} from '../../shared/cn';
import {CloseButton} from '../../shared/components/buttons/CloseButton';
import {CloseIcon} from '../../shared/icons/CloseIcon';
import {MagicLinkSent, type MagicLinkSentState} from '../../shared/components/magic-link/MagicLinkSent';
import {getGiftDurationLabel, getGiftRedemptionSuccessMessage} from '../../shared/gift';
import {isPaidTier, type Cadence} from '../../shared/pricing';
import {warn} from '../../shared/log';

const TITLE_CLS = 'gh:m-0 gh:mb-3 gh:text-pretty gh:text-[35px] gh:font-bold gh:leading-[1.1] gh:tracking-[-0.022em] gh:text-[#1d1d1d] gh:max-[480px]:text-[26px]';

const SUBTITLE_CLS = 'gh:m-0 gh:text-pretty gh:text-[16px] gh:leading-[1.45] gh:text-[#474747]';

const SECTION_LABEL = 'gh:mb-3 gh:text-[12px] gh:font-medium gh:uppercase gh:tracking-[0.04em] gh:text-[#7f7f7f]';

const INPUT_CLS = 'gh:block gh:h-11 gh:w-full gh:rounded-md gh:border gh:border-[#e1e1e1] gh:bg-white gh:px-3 gh:text-[15px] gh:text-[#1d1d1d] gh:outline-none gh:placeholder:text-[#aeaeae] gh:focus:border-[#aeaeae] gh:transition-colors';

const LABEL_CLS = 'gh:block gh:mb-0.5 gh:text-[13px] gh:font-semibold gh:text-[#333]';

const CTA_BTN = cn(
    'gh:flex gh:h-12 gh:w-full gh:items-center gh:justify-center gh:gap-2 gh:rounded-full gh:border-0 gh:px-4',
    'gh:text-[15px] gh:font-semibold gh:text-white gh:cursor-pointer gh:transition-opacity',
    'gh:bg-[var(--ghost-accent-color,#15171a)] gh:hover:opacity-90 gh:disabled:opacity-60 gh:disabled:cursor-not-allowed'
);

/** Inline SVG noise tile + radial orb — approximations of Portal's webp card textures. */
const CARD_NOISE = 'gh:bg-[url(data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22192%22%20height=%22192%22%3E%3Cfilter%20id=%22n%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.8%22%20numOctaves=%224%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url%28%23n%29%22/%3E%3C/svg%3E)]';
const CARD_ORB = 'gh:bg-[radial-gradient(120%_100%_at_85%_-30%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0)_65%)]';

/** Paid tiers giftable in portal — mirrors Portal's getAvailableProducts paid filter. */
function giftableTiers(tiers: SiteTier[] | undefined): SiteTier[] {
    return (tiers ?? [])
        .filter(t => t.type !== 'free')
        .filter(t => t.visibility !== 'none')
        .filter(isPaidTier)
        .slice()
        .sort((a, b) => (a.monthly_price ?? 0) - (b.monthly_price ?? 0));
}

/** Portal's formatGiftValue: bare symbol + localized amount, no forced decimals ("$50"). */
function formatGiftValue(amountCents: number | null | undefined, currency: string | null | undefined): string {
    if (amountCents == null || !currency) return '';
    let symbol: string;
    try {
        symbol = new Intl.NumberFormat('en', {currency, style: 'currency'}).format(0).replace(/[\d\s.]/g, '');
    } catch {
        symbol = `${currency.toUpperCase()} `;
    }
    return `${symbol}${(amountCents / 100).toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Layout + gift card
// ---------------------------------------------------------------------------

interface LayoutProps {
    onClose(): void;
    t: Services['t'];
    left: ReactNode;
    /** Card-stack contents; null renders an empty right column (no panel). */
    right: ReactNode | null;
    /** Success/redemption have no sticky CTA, so mobile needs its own bottom pad. */
    padBottomMobile?: boolean;
}

function GiftLayout({onClose, t, left, right, padBottomMobile}: LayoutProps): ReactElement {
    return (
        <div className="gh:grid gh:min-h-screen gh:w-full gh:grid-cols-2 gh:max-[880px]:grid-cols-1 gh:max-[880px]:min-h-0">
            <button
                type="button"
                aria-label={t('Close')}
                onClick={onClose}
                className="gh:fixed gh:top-8 gh:end-8 gh:z-10 gh:flex gh:h-8 gh:w-8 gh:items-center gh:justify-center gh:border-0 gh:bg-transparent gh:p-0 gh:text-white/50 gh:cursor-pointer gh:transition-colors gh:hover:text-white/80"
            >
                <CloseIcon className="gh:h-6 gh:w-6" />
            </button>
            <div className={cn(
                'gh:relative gh:flex gh:items-center gh:justify-center gh:bg-white gh:p-[64px_48px] gh:max-[880px]:p-[32px_24px_0]',
                padBottomMobile && 'gh:max-[880px]:pb-6'
            )}>
                <div className="gh:relative gh:z-[1] gh:flex gh:w-full gh:max-w-[496px] gh:flex-col">{left}</div>
            </div>
            <div
                aria-hidden={right ? undefined : true}
                className="gh:sticky gh:top-0 gh:flex gh:h-screen gh:self-start gh:overflow-y-auto gh:p-3 gh:ps-0 gh:max-[880px]:order-[-1] gh:max-[880px]:static gh:max-[880px]:h-auto gh:max-[880px]:overflow-visible gh:max-[880px]:p-0"
            >
                {right && (
                    <div className="gh:flex gh:min-h-0 gh:flex-1 gh:flex-col gh:items-center gh:overflow-y-auto gh:rounded-[32px] gh:p-[64px_48px] gh:max-[880px]:rounded-t-none gh:max-[880px]:rounded-b-[32px] gh:max-[880px]:p-[56px_24px_32px] gh:bg-[image:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0)_100%)] gh:bg-[color:var(--ghost-accent-color,#15171a)]">
                        {right}
                    </div>
                )}
            </div>
        </div>
    );
}

function CardStack({children}: {children: ReactNode}): ReactElement {
    return (
        <div className="gh:my-auto gh:flex gh:w-full gh:max-w-[280px] gh:shrink-0 gh:flex-col gh:items-center gh:max-[880px]:max-w-[240px]">
            {children}
        </div>
    );
}

interface GiftCardProps {
    duration?: string | null;
    tierName?: string | null;
    name?: string | null;
    giftValue?: string | null;
    siteIcon?: string;
    siteTitle: string;
    revealing?: boolean;
    t: Services['t'];
}

function GiftCard({duration, tierName, name, giftValue, siteIcon, siteTitle, revealing, t}: GiftCardProps): ReactElement {
    const hasMeta = !!(duration && tierName);
    const hasDetails = !!(name || giftValue);

    return (
        <div className={cn('gh:sticky gh:top-0 gh:z-[1] gh:w-full gh:transition-transform gh:duration-300', revealing && 'gh:rotate-3')}>
            <div className={cn(
                'gh:relative gh:isolate gh:flex gh:aspect-[1/1.45] gh:w-full gh:max-w-[280px] gh:flex-col gh:overflow-hidden gh:rounded-[24px] gh:max-[880px]:max-w-[240px]',
                'gh:bg-[image:linear-gradient(243.43deg,rgba(255,255,255,0)_3.94%,rgba(255,255,255,0.31)_49.99%,rgba(255,255,255,0)_95.16%),linear-gradient(0deg,rgba(255,255,255,0.07),rgba(255,255,255,0.07))] gh:bg-[color:var(--ghost-accent-color,#15171a)]',
                'gh:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_24px_48px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)]'
            )}>
                <div className={cn('gh:pointer-events-none gh:absolute gh:inset-0 gh:z-0 gh:opacity-20', CARD_ORB)} aria-hidden="true" />
                <div
                    className="gh:pointer-events-none gh:absolute gh:inset-0 gh:z-[3] gh:mx-auto gh:mt-5 gh:h-3 gh:w-14 gh:rounded-[12px] gh:bg-[color-mix(in_srgb,var(--ghost-accent-color,#15171a)_65%,#000_35%)] gh:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.18)]"
                    aria-hidden="true"
                />
                {hasMeta && (
                    <div className="gh:relative gh:z-[3] gh:p-[56px_28px_0]">
                        <div className="gh:text-[28px] gh:font-semibold gh:leading-[1.1] gh:tracking-[-0.01em] gh:text-white gh:max-[480px]:text-[20px]">{duration}</div>
                        <div className="gh:mt-1.5 gh:text-[15px] gh:leading-[1.3] gh:text-white">{t('{tierName} membership', {tierName})}</div>
                    </div>
                )}
                {hasDetails && (
                    <div className="gh:relative gh:z-[3] gh:mt-auto gh:flex gh:flex-col gh:gap-2 gh:p-[0_28px_24px]">
                        {name && (
                            <div>
                                <div className="gh:mb-[-5px] gh:text-[12px] gh:text-white/80">{t('Name')}</div>
                                <div className="gh:text-[13px] gh:font-medium gh:text-white">{name}</div>
                            </div>
                        )}
                        {giftValue && (
                            <div>
                                <div className="gh:mb-[-5px] gh:text-[12px] gh:text-white/80">{t('Gift value')}</div>
                                <div className="gh:text-[13px] gh:font-medium gh:text-white">{giftValue}</div>
                            </div>
                        )}
                    </div>
                )}
                <div className={cn('gh:relative gh:flex gh:items-center gh:justify-center gh:gap-2 gh:p-[16px_28px]', !hasDetails && 'gh:mt-auto')}>
                    <div className="gh:absolute gh:inset-0 gh:z-[1] gh:bg-white" aria-hidden="true" />
                    {siteIcon && <img className="gh:relative gh:z-[3] gh:h-[22px] gh:w-[22px] gh:object-cover" src={siteIcon} alt="" />}
                    <span className="gh:relative gh:z-[3] gh:text-[14px] gh:font-semibold gh:tracking-[-0.01em] gh:text-[#1d1d1d]">{siteTitle}</span>
                </div>
                <div className={cn('gh:pointer-events-none gh:absolute gh:inset-0 gh:z-[2] gh:bg-repeat gh:bg-center gh:bg-[length:192px_192px] gh:opacity-10', CARD_NOISE)} aria-hidden="true" />
            </div>
        </div>
    );
}

interface GiftDetailsToggleProps {
    description?: string | null;
    benefits?: Array<{id?: string; name: string} | string>;
    showDetails: boolean;
    onToggle(): void;
    t: Services['t'];
}

function GiftDetailsToggle({description, benefits = [], showDetails, onToggle, t}: GiftDetailsToggleProps): ReactElement | null {
    if (!description && benefits.length === 0) return null;

    return (
        <>
            <div
                className={cn(
                    'gh:grid gh:w-full gh:overflow-hidden gh:transition-[grid-template-rows,margin-top] gh:duration-300',
                    showDetails ? 'gh:mt-8 gh:grid-rows-[1fr]' : 'gh:mt-0 gh:grid-rows-[0fr]'
                )}
                aria-hidden={!showDetails}
            >
                <div className="gh:min-h-0 gh:overflow-hidden">
                    {description && <p className="gh:m-0 gh:mb-3 gh:text-[14.5px] gh:leading-[1.4] gh:text-white/85 gh:last:mb-0">{description}</p>}
                    {benefits.length > 0 && <BenefitList benefits={benefits} light />}
                </div>
            </div>
            <button
                type="button"
                className="gh:mt-6 gh:inline-flex gh:items-center gh:gap-1 gh:border-0 gh:bg-transparent gh:px-3 gh:py-2 gh:text-[14px] gh:font-medium gh:text-white/70 gh:cursor-pointer gh:transition-colors gh:hover:text-white/95"
                onClick={onToggle}
                aria-expanded={showDetails}
            >
                {showDetails ? t('Hide details') : t('Gift details')}
                <ChevronIcon className={cn('gh:h-3 gh:w-3 gh:transition-transform gh:duration-200', showDetails && 'gh:-rotate-180')} />
            </button>
        </>
    );
}

function BenefitList({benefits, light}: {benefits: Array<{id?: string; name: string} | string>; light?: boolean}): ReactElement {
    return (
        <div className="gh:flex gh:flex-col gh:gap-2">
            {benefits.map((benefit, idx) => {
                const name = typeof benefit === 'string' ? benefit : benefit.name;
                const key = typeof benefit === 'string' ? `b-${idx}` : (benefit.id ?? `b-${idx}`);
                if (!name) return null;
                return (
                    <div key={key} className={cn('gh:flex gh:items-start gh:gap-2.5 gh:text-[14.5px] gh:leading-[1.4]', light ? 'gh:text-white/85' : 'gh:text-[#333]')}>
                        <CheckmarkIcon className={cn('gh:mt-[3px] gh:h-3.5 gh:w-3.5 gh:shrink-0', light ? 'gh:text-white/85' : 'gh:text-[#333]')} />
                        <span>{name}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

interface GiftPurchaseProps {
    services: Services;
    api: MembersApiClient;
    onClose(): void;
}

function GiftPurchase({services, api, onClose}: GiftPurchaseProps): ReactElement {
    const t = services.t;
    const state = services.getState();
    const site = state.site;
    const isLoggedIn = !!state.member;

    const tiers = giftableTiers(site.tiers);
    const plans = site.portal_plans ?? ['free', 'monthly', 'yearly'];
    const showCadenceSwitch = plans.includes('monthly') && plans.includes('yearly');
    const defaultCadence: Cadence = site.portal_default_plan === 'monthly' && plans.includes('monthly')
        ? 'month'
        : plans.includes('yearly') || !plans.includes('monthly') ? 'year' : 'month';

    const [selectedTierId, setSelectedTierId] = useState<string | null>(tiers[0]?.id ?? null);
    const [cadence, setCadence] = useState<Cadence>(defaultCadence);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [purchasing, setPurchasing] = useState(false);
    const [error, setError] = useState('');

    const activeTier = tiers.find(tier => tier.id === selectedTierId) ?? tiers[0];
    const isSingleTier = tiers.length === 1;

    function tierPriceLabel(tier: SiteTier): string {
        const amount = cadence === 'month' ? tier.monthly_price : tier.yearly_price;
        return formatGiftValue(amount, tier.currency ?? 'usd');
    }

    async function handlePurchase(): Promise<void> {
        if (!activeTier || purchasing) return;
        if (!isLoggedIn) {
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setEmailError(t('Invalid email address'));
                return;
            }
            setEmailError('');
        }
        setPurchasing(true);
        setError('');
        try {
            await api.member.checkoutGift({
                tierId: activeTier.id,
                cadence,
                ...(isLoggedIn ? {} : {email: email.trim()})
            });
            // checkoutGift redirects to Stripe; the shell reopens the success
            // view from the `stripe=gift-purchase-success` return params.
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to process checkout, please try again'));
            setPurchasing(false);
        }
    }

    if (tiers.length === 0) {
        return (
            <GiftLayout
                onClose={onClose}
                t={t}
                padBottomMobile
                left={(
                    <header className="gh:mb-4">
                        <h1 className={TITLE_CLS}>{t('Gift a membership')}</h1>
                        <p className={SUBTITLE_CLS}>{t('Gift subscriptions are not available right now.')}</p>
                    </header>
                )}
                right={null}
            />
        );
    }

    const left = (
        <>
            <header className="gh:mb-4">
                <h1 className={TITLE_CLS}>{t('Gift a membership')}</h1>
                <p className={SUBTITLE_CLS}>
                    {t('Share a full membership to {siteTitle} with a friend or colleague', {siteTitle: site.title})}
                </p>
            </header>

            {error && (
                <div className="gh:mt-4 gh:rounded-md gh:bg-[#fde7e7] gh:px-3 gh:py-2 gh:text-[14px] gh:text-[#a3160e]">{error}</div>
            )}

            {!isLoggedIn && (
                <div className="gh:mt-6">
                    <label htmlFor="sp-gift-purchase-email" className={cn(SECTION_LABEL, 'gh:block')}>{t('Your email')}</label>
                    <input
                        id="sp-gift-purchase-email"
                        type="email"
                        autoComplete="email"
                        placeholder={t('jamie@example.com')}
                        value={email}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); setEmailError(''); }}
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') void handlePurchase().catch(err => warn('gift purchase error', err));
                        }}
                        className={cn(INPUT_CLS, 'gh:h-12', emailError && 'gh:border-[#e23a31]')}
                    />
                    {emailError && <p className="gh:m-0 gh:mt-1 gh:text-[12px] gh:text-[#e23a31]">{emailError}</p>}
                </div>
            )}

            <div className="gh:mt-6">
                <div className={SECTION_LABEL}>{isSingleTier ? t('Membership details') : t('Tier')}</div>
                {showCadenceSwitch && (
                    <div className="gh:flex gh:h-11 gh:gap-1 gh:rounded-full gh:bg-[#f3f3f3] gh:p-1">
                        {(['month', 'year'] as const).map(c => (
                            <button
                                key={c}
                                type="button"
                                aria-pressed={cadence === c}
                                onClick={() => setCadence(c)}
                                className={cn(
                                    'gh:w-1/2 gh:rounded-full gh:border-0 gh:px-3 gh:text-[15px] gh:font-medium gh:text-[#1d1d1d] gh:cursor-pointer gh:inline-flex gh:items-center gh:justify-center',
                                    cadence === c ? 'gh:bg-white gh:shadow-sm gh:font-semibold' : 'gh:bg-transparent'
                                )}
                            >
                                {getGiftDurationLabel({cadence: c, duration: 1}, t)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="gh:mt-6">
                <div className="gh:flex gh:flex-col gh:gap-3" role={isSingleTier ? undefined : 'radiogroup'} aria-label={isSingleTier ? undefined : t('Tier')}>
                    {tiers.map((tier) => {
                        const isSelected = tier.id === activeTier?.id;
                        const benefits = tier.benefits ?? [];
                        return (
                            <div
                                key={tier.id}
                                className={cn(
                                    'gh:overflow-hidden gh:rounded-[10px] gh:border gh:bg-white gh:transition-[border-color,background-color] gh:duration-200',
                                    isSelected && !isSingleTier
                                        ? 'gh:border-[var(--ghost-accent-color,#15171a)] gh:bg-[color-mix(in_srgb,var(--ghost-accent-color,#15171a)_6%,#fff)] gh:shadow-[inset_0_0_0_1px_var(--ghost-accent-color,#15171a)]'
                                        : cn('gh:border-[#e1e1e1]', !isSingleTier && 'gh:hover:border-[#c5c5c5]')
                                )}
                            >
                                <button
                                    type="button"
                                    role={isSingleTier ? undefined : 'radio'}
                                    aria-checked={isSingleTier ? undefined : isSelected}
                                    onClick={() => setSelectedTierId(tier.id)}
                                    className={cn(
                                        'gh:flex gh:w-full gh:items-start gh:gap-2.5 gh:border-0 gh:bg-transparent gh:p-[16px_20px] gh:text-start gh:cursor-pointer',
                                        isSingleTier && 'gh:cursor-default'
                                    )}
                                >
                                    {!isSingleTier && (
                                        <span
                                            className={cn(
                                                'gh:relative gh:mt-[3px] gh:h-[18px] gh:w-[18px] gh:shrink-0 gh:rounded-full gh:border-[1.5px]',
                                                isSelected ? 'gh:border-[var(--ghost-accent-color,#15171a)] gh:bg-[var(--ghost-accent-color,#15171a)]' : 'gh:border-[#c5c5c5] gh:bg-white'
                                            )}
                                            aria-hidden="true"
                                        >
                                            {isSelected && <span className="gh:absolute gh:left-1/2 gh:top-1/2 gh:h-1.5 gh:w-1.5 gh:-translate-x-1/2 gh:-translate-y-1/2 gh:rounded-full gh:bg-white" />}
                                        </span>
                                    )}
                                    <span className="gh:flex gh:min-w-0 gh:flex-1 gh:flex-col gh:gap-1">
                                        <span className="gh:flex gh:items-baseline gh:gap-2.5">
                                            <span className="gh:flex-1 gh:text-[15px] gh:font-medium gh:text-[#1d1d1d]">{tier.name}</span>
                                            <span className="gh:text-[15px] gh:font-medium gh:text-[#1d1d1d]">{tierPriceLabel(tier)}</span>
                                        </span>
                                        {tier.description && <span className="gh:mt-[-2px] gh:text-[14px] gh:leading-[1.4] gh:text-[#515151]">{tier.description}</span>}
                                    </span>
                                </button>
                                {benefits.length > 0 && (
                                    <div
                                        className={cn(
                                            'gh:grid gh:overflow-hidden gh:transition-[grid-template-rows] gh:duration-300',
                                            isSelected ? 'gh:grid-rows-[1fr]' : 'gh:grid-rows-[0fr]'
                                        )}
                                        aria-hidden={!isSelected}
                                    >
                                        <div className="gh:min-h-0 gh:overflow-hidden">
                                            <div className="gh:p-[0_20px_20px_22px]">
                                                <BenefitList benefits={benefits} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="gh:sticky gh:bottom-0 gh:z-[1] gh:mb-[-64px] gh:pt-8 gh:pb-16 gh:bg-[linear-gradient(0deg,rgba(255,255,255,1)_60%,rgba(255,255,255,0)_100%)] gh:max-[880px]:mb-0 gh:max-[880px]:pb-6">
                <button
                    type="button"
                    className={CTA_BTN}
                    onClick={() => { void handlePurchase().catch(err => warn('gift purchase error', err)); }}
                    disabled={purchasing || !activeTier}
                >
                    {purchasing ? <Spinner /> : t('Continue')}
                </button>
            </div>
        </>
    );

    return (
        <GiftLayout
            onClose={onClose}
            t={t}
            left={left}
            right={(
                <CardStack>
                    <GiftCard
                        duration={getGiftDurationLabel({cadence, duration: 1}, t)}
                        tierName={activeTier?.name ?? ''}
                        giftValue={activeTier ? tierPriceLabel(activeTier) : undefined}
                        siteIcon={site.icon}
                        siteTitle={site.title}
                        t={t}
                    />
                </CardStack>
            )}
        />
    );
}

// ---------------------------------------------------------------------------
// Redemption
// ---------------------------------------------------------------------------

interface GiftRedemptionProps {
    services: Services;
    api: MembersApiClient;
    token: string;
    onClose(): void;
}

function GiftRedemption({services, api, token, onClose}: GiftRedemptionProps): ReactElement {
    const t = services.t;
    const state = services.getState();
    const site = state.site;
    const member = state.member;
    const locale = site.locale || 'en';
    const isLoggedIn = !!member;

    const [loadingGift, setLoadingGift] = useState(true);
    const [gift, setGift] = useState<GiftData | null>(null);
    const [name, setName] = useState(member?.name ?? '');
    const [email, setEmail] = useState(member?.email ?? '');
    const [emailError, setEmailError] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState<MagicLinkSentState | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        let active = true;
        setLoadingGift(true);
        api.gift.fetchRedemptionData({token})
            .then((res) => {
                if (!active) return;
                const data = res.gifts?.[0];
                if (data) {
                    setGift(data);
                } else {
                    throw new ApiError('Empty gift response');
                }
            })
            .catch((err: unknown) => {
                if (!active) return;
                // Portal surfaces redemption-load failures as a notification, not a page.
                warn('failed to fetch gift data', err);
                onClose();
                services.showNotification({
                    type: 'giftRedeem',
                    status: 'error',
                    giftErrorCode: err instanceof ApiError ? err.code : null,
                    autoHide: false,
                    duration: 3000
                });
            })
            .finally(() => { if (active) setLoadingGift(false); });
        return () => { active = false; };
    }, [api, token, onClose, services]);

    async function handleRedeem(): Promise<void> {
        if (!gift || redeeming) return;
        setRedeeming(true);
        setError('');
        try {
            if (!isLoggedIn) {
                if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    setEmailError(t('Invalid email address'));
                    setRedeeming(false);
                    return;
                }
                setEmailError('');
                // Magic-link subscribe; redemption completes server-side on click.
                // The redirect carries giftRedemption=true so boot shows the toast.
                const redirect = new URL(site.url);
                redirect.searchParams.set('giftRedemption', 'true');
                redirect.hash = '';
                const integrityToken = await api.member.getIntegrityToken();
                const resp = await api.member.sendMagicLink({
                    email: email.trim(),
                    name: name.trim() || undefined,
                    emailType: 'subscribe',
                    integrityToken,
                    giftToken: token,
                    includeOTC: true,
                    redirect: redirect.href
                });
                setSent({email: email.trim(), otcRef: resp.otc_ref ?? null, inboxLinks: resp.inboxLinks});
            } else {
                await api.gift.redeem({token});
                const updated = await api.member.sessionData();
                if (updated) {
                    services.setMember({
                        id: updated.id ?? updated.uuid,
                        uuid: updated.uuid,
                        email: updated.email,
                        name: updated.name,
                        status: updated.status,
                    });
                }
                onClose();
                services.showNotification({
                    type: 'giftRedeem',
                    status: 'success',
                    message: getGiftRedemptionSuccessMessage(updated, t, locale) ?? undefined,
                    autoHide: true,
                    duration: 5000
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Something went wrong, please try again later.'));
        } finally {
            setRedeeming(false);
        }
    }

    if (sent) {
        return (
            <div className="gh:mx-auto gh:flex gh:min-h-full gh:max-w-[500px] gh:flex-col gh:justify-center gh:p-8">
                <MagicLinkSent
                    services={services}
                    api={api}
                    sent={sent}
                    emailType="signin"
                    description={t("Click the confirmation link in your inbox to finish redeeming your membership. If it doesn't arrive within 3 minutes, check your spam folder.")}
                    onClose={onClose}
                    onSignedIn={onClose}
                />
            </div>
        );
    }

    if (loadingGift || !gift) {
        return (
            <div className="gh:relative gh:flex gh:min-h-full gh:items-center gh:justify-center">
                <CloseButton onClick={onClose} t={t} />
                <Spinner dark />
            </div>
        );
    }

    const left = (
        <>
            <header className="gh:mb-4">
                <h1 className={TITLE_CLS}>{t('A gift, just for you')}</h1>
                <p className={SUBTITLE_CLS}>
                    {site.title
                        ? t("You've been gifted a membership to {siteTitle}", {siteTitle: site.title})
                        : t("You've been gifted a membership")}
                </p>
            </header>

            {error && (
                <div className="gh:mt-4 gh:rounded-md gh:bg-[#fde7e7] gh:px-3 gh:py-2 gh:text-[14px] gh:text-[#a3160e]">{error}</div>
            )}

            {!isLoggedIn && (
                <div className="gh:mt-6">
                    <div className="gh:mb-4">
                        <label htmlFor="sp-gift-name" className={LABEL_CLS}>{t('Your name')}</label>
                        <input
                            id="sp-gift-name"
                            type="text"
                            autoComplete="name"
                            autoFocus
                            placeholder={t('Jamie Larson')}
                            value={name}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            className={INPUT_CLS}
                        />
                    </div>
                    <div>
                        <label htmlFor="sp-gift-email" className={LABEL_CLS}>{t('Your email')}</label>
                        <input
                            id="sp-gift-email"
                            type="email"
                            autoComplete="email"
                            placeholder={t('jamie@example.com')}
                            value={email}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); setEmailError(''); }}
                            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter') void handleRedeem().catch(err => warn('redeem error', err));
                            }}
                            className={cn(INPUT_CLS, emailError && 'gh:border-[#e23a31]')}
                        />
                        {emailError && <p className="gh:m-0 gh:mt-1 gh:text-[12px] gh:text-[#e23a31]">{emailError}</p>}
                    </div>
                </div>
            )}

            <button
                type="button"
                className={cn(CTA_BTN, 'gh:mt-4')}
                onClick={() => { void handleRedeem().catch(err => warn('redeem error', err)); }}
                disabled={redeeming}
            >
                {redeeming ? <Spinner /> : t('Redeem your membership')}
            </button>
        </>
    );

    return (
        <GiftLayout
            onClose={onClose}
            t={t}
            padBottomMobile
            left={left}
            right={(
                <CardStack>
                    <GiftCard
                        duration={getGiftDurationLabel(gift, t)}
                        tierName={gift.tier.name}
                        name={name.trim() || null}
                        giftValue={formatGiftValue(gift.amount, gift.currency)}
                        siteIcon={site.icon}
                        siteTitle={site.title}
                        revealing={showDetails}
                        t={t}
                    />
                    <GiftDetailsToggle
                        description={gift.tier.description}
                        benefits={gift.tier.benefits}
                        showDetails={showDetails}
                        onToggle={() => setShowDetails(s => !s)}
                        t={t}
                    />
                </CardStack>
            )}
        />
    );
}

// ---------------------------------------------------------------------------
// Success (after checkout return)
// ---------------------------------------------------------------------------

interface GiftSuccessProps {
    services: Services;
    token: string;
    tierId?: string;
    cadence?: string;
    onClose(): void;
}

function GiftSuccess({services, token, tierId, cadence, onClose}: GiftSuccessProps): ReactElement {
    const t = services.t;
    const site = services.getState().site;
    const [copied, setCopied] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const redeemUrl = `${site.url.replace(/\/$/, '')}/gift/${token}`;
    const tier = tierId ? giftableTiers(site.tiers).find(tr => tr.id === tierId) : undefined;
    const normalizedCadence: Cadence = cadence === 'month' ? 'month' : 'year';
    const giftValue = tier
        ? formatGiftValue(normalizedCadence === 'month' ? tier.monthly_price : tier.yearly_price, tier.currency ?? 'usd')
        : undefined;

    function handleCopy(): void {
        navigator.clipboard.writeText(redeemUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => warn('copy error', err));
    }

    const left = (
        <>
            <header className="gh:mb-4">
                <h1 className={TITLE_CLS}>{t('Your gift is ready')}</h1>
                <p className={SUBTITLE_CLS}>
                    {t("Send the link below to share it with whoever you'd like.")}
                </p>
            </header>

            <div className="gh:mt-6">
                <div className="gh:flex gh:h-14 gh:items-center gh:gap-2 gh:rounded-full gh:p-[4px_8px_4px_24px] gh:bg-[color-mix(in_srgb,var(--ghost-accent-color,#15171a)_8%,#fff)]">
                    <span className="gh:min-w-0 gh:flex-1 gh:select-all gh:overflow-hidden gh:text-ellipsis gh:whitespace-nowrap gh:text-[16px] gh:text-[var(--ghost-accent-color,#15171a)]">{redeemUrl}</span>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="gh:flex gh:h-10 gh:shrink-0 gh:items-center gh:gap-1.5 gh:rounded-full gh:border-0 gh:px-[18px] gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer gh:transition-opacity gh:hover:opacity-90 gh:bg-[var(--ghost-accent-color,#15171a)]"
                    >
                        {copied ? <CheckmarkIcon className="gh:h-3.5 gh:w-3.5 gh:text-white" /> : <CopyIcon />}
                        {copied ? t('Copied') : t('Copy')}
                    </button>
                </div>
            </div>

            <p className="gh:m-0 gh:mt-6 gh:text-[14px] gh:leading-[1.5] gh:text-[#7f7f7f]">
                {t("Not ready to share? We've also emailed a copy to your inbox.")}
            </p>
        </>
    );

    return (
        <GiftLayout
            onClose={onClose}
            t={t}
            padBottomMobile
            left={left}
            right={(
                <CardStack>
                    <GiftCard
                        duration={tier && cadence ? getGiftDurationLabel({cadence: normalizedCadence, duration: 1}, t) : null}
                        tierName={tier && cadence ? tier.name : null}
                        giftValue={tier && cadence ? giftValue : null}
                        siteIcon={site.icon}
                        siteTitle={site.title}
                        revealing={showDetails}
                        t={t}
                    />
                    {tier && (
                        <GiftDetailsToggle
                            description={tier.description}
                            benefits={tier.benefits}
                            showDetails={showDetails}
                            onToggle={() => setShowDetails(s => !s)}
                            t={t}
                        />
                    )}
                </CardStack>
            )}
        />
    );
}

// ---------------------------------------------------------------------------
// Orchestrating GiftModal
// ---------------------------------------------------------------------------

export interface GiftModalProps {
    services: Services;
    api: MembersApiClient;
    /** If set, open the redemption flow immediately. */
    giftToken?: string;
    /** Post-checkout success view (from the stripe=gift-purchase-success return). */
    success?: {token: string; tierId?: string; cadence?: string};
    onClose(): void;
}

export function GiftModal({services, api, giftToken, success, onClose}: GiftModalProps): ReactElement {
    if (success) {
        return <GiftSuccess services={services} token={success.token} tierId={success.tierId} cadence={success.cadence} onClose={onClose} />;
    }
    if (giftToken) {
        return <GiftRedemption services={services} api={api} token={giftToken} onClose={onClose} />;
    }
    return <GiftPurchase services={services} api={api} onClose={onClose} />;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ChevronIcon({className}: {className?: string}): ReactElement {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function CheckmarkIcon({className}: {className?: string}): ReactElement {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function CopyIcon(): ReactElement {
    return (
        <svg className="gh:h-3.5 gh:w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    );
}

function Spinner({dark}: {dark?: boolean}): ReactElement {
    return <span className={cn('gh:inline-block gh:h-4 gh:w-4 gh:animate-spin gh:rounded-full gh:border-2 gh:border-white/40 gh:border-t-white', dark && 'gh:border-[#dadee2] gh:border-t-[#15171a]')} />;
}
