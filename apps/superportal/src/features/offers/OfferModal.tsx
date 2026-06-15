/**
 * Offer landing / redemption. Shows the discounted price for the offer's tier
 * and routes to Stripe checkout with the offer applied. Mirrors Portal's
 * offer-page.js (discount tag, struck original price, duration/renews message,
 * benefits) and reuses our SignUp form pattern. Retention offers never render
 * here — they only surface inside the cancel flow.
 */

import {useMemo, useState, type ChangeEvent, type ReactElement} from 'react';
import type {Services, SiteNewsletter} from '../../types';
import type {MembersApiClient, MemberTier, Offer} from '../../shared/api-client';
import {cn} from '../../shared/cn';
import {CloseButton} from '../../shared/components/buttons/CloseButton';
import {warn} from '../../shared/log';
import {priceFor, priceParts, getDiscountedAmount, offerOffAmount, offerDurationMessage, type TierPrice} from '../../shared/pricing';
import {sanitizeHtml} from '../../shared/sanitize-html';

interface Props {
    services: Services;
    api: MembersApiClient;
    /** Pre-loaded and validated by the mount (Portal validates before opening). */
    offer: Offer;
    onClose(): void;
}

const PRIMARY_BTN = cn(
    'gh:flex gh:w-full gh:items-center gh:justify-center gh:gap-2',
    'gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer',
    'gh:bg-[var(--ghost-accent-color,#15171a)] gh:disabled:opacity-60 gh:disabled:cursor-not-allowed'
);
const INPUT_CLS = 'gh:block gh:w-full gh:rounded-md gh:border gh:bg-white gh:px-3 gh:py-2.5 gh:text-[15px] gh:text-[#15171a] gh:outline-none';
const LABEL_CLS = 'gh:block gh:mb-1.5 gh:text-[13px] gh:font-medium gh:text-[#3d3d3d]';

export function OfferModal({services, api, offer, onClose}: Props): ReactElement {
    const t = services.t;
    const state = services.getState();
    const site = state.site;
    const member = state.member;
    const locale = site.locale || 'en';
    const isLoggedIn = !!member;

    const showName = site.portal_name === true;
    const termsHtml = site.portal_signup_terms_html || '';
    const sanitizedTermsHtml = useMemo(() => sanitizeHtml(termsHtml), [termsHtml]);
    const termsRequired = site.portal_signup_checkbox_required === true;

    const freeSignupNewsletters = useMemo<SiteNewsletter[]>(
        () => (site.newsletters || []).filter(n => n.subscribe_on_signup && n.status !== 'archived' && !n.paid),
        [site.newsletters]
    );

    const [name, setName] = useState(member?.name ?? '');
    const [email, setEmail] = useState(member?.email ?? '');
    const [honeypot, setHoneypot] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [errors, setErrors] = useState<{email?: string; terms?: boolean}>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const tier = useMemo<MemberTier | undefined>(
        () => (offer?.tier ? (site.tiers || []).find(ts => ts.id === offer.tier?.id) : undefined),
        [offer, site.tiers]
    );
    const basePrice = useMemo<TierPrice | null>(
        () => (tier && offer ? priceFor(tier, offer.cadence) : null),
        [tier, offer]
    );

    function validate(): boolean {
        const next: {email?: string; terms?: boolean} = {};
        if (!email) {
            next.email = t('Enter your email address');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            next.email = t('Invalid email address');
        }
        if (termsRequired && !termsAccepted) next.terms = true;
        setErrors(next);
        return Object.keys(next).length === 0;
    }

    async function handleSubmit(): Promise<void> {
        if (!validate()) return;
        setSubmitting(true);
        setError('');
        try {
            await api.member.checkoutPlan({
                offerId: offer.id,
                customerEmail: email.trim(),
                metadata: {
                    name: showName && name.trim() ? name.trim() : undefined,
                    newsletters: JSON.stringify(freeSignupNewsletters.map(n => ({id: n.id, name: n.name}))),
                },
            });
            // checkoutPlan redirects to Stripe; control normally doesn't return here.
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to process checkout, please try again'));
            setSubmitting(false);
        }
    }

    return (
        <div className="gh:relative">
            <CloseButton onClick={onClose} t={t} />

            <>
                    <header className="gh:mb-5 gh:flex gh:flex-col gh:items-center gh:gap-3 gh:text-center">
                        {site.icon && <img className="gh:h-12 gh:w-12 gh:rounded-sm gh:object-cover" src={site.icon} alt={site.title} />}
                        <h1 className="gh:m-0 gh:text-[26px] gh:font-bold gh:leading-tight gh:text-[#15171a]">
                            {offer.display_title}
                        </h1>
                        {offer.display_description && (
                            <p className="gh:m-0 gh:text-[15px] gh:text-[#7c8087]">{offer.display_description}</p>
                        )}
                    </header>

                    {error && (
                        <div className="gh:mb-4 gh:rounded-md gh:bg-[#fde7e7] gh:px-3 gh:py-2 gh:text-[14px] gh:text-[#a3160e]">{error}</div>
                    )}

                    <OfferCard offer={offer} tier={tier} basePrice={basePrice} locale={locale} t={t} />

                    <form
                        className="gh:mt-5"
                        onSubmit={(e) => { e.preventDefault(); void handleSubmit().catch(err => warn('offer submit', err)); }}
                    >
                        {showName && (
                            <div className="gh:mb-4">
                                <label htmlFor="sp-offer-name" className={LABEL_CLS}>{t('Name')}</label>
                                <input
                                    id="sp-offer-name"
                                    type="text"
                                    autoComplete="name"
                                    placeholder={t('Jamie Larson')}
                                    value={name}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                                    className={cn(INPUT_CLS, 'gh:border-[#dadee2] gh:focus:border-[#a8adb4]')}
                                />
                            </div>
                        )}

                        <div className="gh:mb-4">
                            <label htmlFor="sp-offer-email" className={LABEL_CLS}>{t('Email')}</label>
                            <input
                                id="sp-offer-email"
                                type="email"
                                autoComplete="email"
                                disabled={isLoggedIn}
                                placeholder={t('jamie@example.com')}
                                value={email}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                className={cn(
                                    INPUT_CLS,
                                    isLoggedIn && 'gh:bg-[#f4f5f6] gh:text-[#7c8087]',
                                    errors.email ? 'gh:border-[#e23a31]' : 'gh:border-[#dadee2] gh:focus:border-[#a8adb4]'
                                )}
                            />
                            {errors.email && <p className="gh:m-0 gh:mt-1 gh:text-[12px] gh:text-[#e23a31]">{errors.email}</p>}
                        </div>

                        <div className="gh:hidden" aria-hidden="true">
                            <input type="text" name="phonenumber" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e: ChangeEvent<HTMLInputElement>) => setHoneypot(e.target.value)} />
                        </div>

                        {sanitizedTermsHtml && (
                            <div className="gh:mb-4">
                                {termsRequired ? (
                                    <label className={cn('gh:flex gh:items-start gh:gap-2 gh:text-[13px] gh:cursor-pointer', errors.terms ? 'gh:text-[#e23a31]' : 'gh:text-[#3d3d3d]')}>
                                        <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="gh:mt-0.5" />
                                        <span dangerouslySetInnerHTML={{__html: sanitizedTermsHtml}} />
                                    </label>
                                ) : (
                                    <div className="gh:text-[13px] gh:text-[#3d3d3d]" dangerouslySetInnerHTML={{__html: sanitizedTermsHtml}} />
                                )}
                            </div>
                        )}

                        <button type="submit" disabled={submitting} className={PRIMARY_BTN}>
                            {t('Continue')}
                        </button>
                    </form>
                </>
        </div>
    );
}

interface OfferCardProps {
    offer: Offer;
    tier?: MemberTier;
    basePrice: TierPrice | null;
    locale: string;
    t: Services['t'];
}

function OfferCard({offer, tier, basePrice, locale, t}: OfferCardProps): ReactElement {
    const cadenceLabel = offer.cadence === 'month' ? t('Monthly') : t('Yearly');
    const tierLabel = tier?.name ? `${tier.name} — ${cadenceLabel}` : cadenceLabel;
    const benefits = tier?.benefits ?? [];

    const off = offerOffAmount(offer, locale);
    const discountTag = offer.type === 'trial'
        ? t('{amount} days free', {amount: offer.amount})
        : t('{amount} off', {amount: off});

    const discounted = basePrice ? priceParts({...basePrice, amount: getDiscountedAmount(offer, basePrice.amount)}, locale) : null;
    const original = basePrice ? priceParts(basePrice, locale) : null;
    const periodLabel = '/' + (offer.cadence === 'year' ? t('year') : t('month'));

    return (
        <div className="gh:rounded-[7px] gh:border gh:border-[#e0e2e4] gh:bg-white gh:p-6">
            <div className="gh:flex gh:items-center gh:justify-between gh:gap-3">
                <h3 className="gh:m-0 gh:text-[16px] gh:font-semibold gh:text-[var(--ghost-accent-color,#15171a)]">{tierLabel}</h3>
                <span className="gh:relative gh:rounded-full gh:px-2 gh:py-1 gh:text-[12px] gh:font-semibold gh:text-[var(--ghost-accent-color,#15171a)]">
                    <span className="gh:absolute gh:inset-0 gh:rounded-full gh:bg-[var(--ghost-accent-color,#15171a)] gh:opacity-15" aria-hidden="true" />
                    <span className="gh:relative">{discountTag}</span>
                </span>
            </div>

            {discounted && (
                <div className="gh:mt-3 gh:flex gh:items-end gh:gap-2">
                    <span className="gh:flex gh:items-start gh:text-[#15171a]">
                        <span className="gh:mt-1 gh:text-[20px] gh:font-bold gh:leading-none">{discounted.symbol}</span>
                        <span className="gh:text-[40px] gh:font-bold gh:leading-none gh:tracking-tight">{discounted.amount}</span>
                        <span className="gh:mt-auto gh:ms-1 gh:text-[14px] gh:text-[#7c8087]">{periodLabel}</span>
                    </span>
                    {original && offer.type !== 'trial' && (
                        <span className="gh:mb-1 gh:text-[15px] gh:text-[#9aa0a6] gh:line-through">{original.symbol}{original.amount}{periodLabel}</span>
                    )}
                </div>
            )}

            <p className="gh:mt-3 gh:mb-0 gh:text-[13px] gh:text-[#7c8087]">{offerDurationMessage(offer, original ? `${original.symbol}${original.amount}${periodLabel}` : '', t)}</p>

            {benefits.length > 0 && (
                <ul className="gh:mt-4 gh:mb-0 gh:flex gh:list-none gh:flex-col gh:gap-2.5 gh:p-0">
                    {benefits.map((b, idx) => {
                        const label = typeof b === 'string' ? b : b.name;
                        const key = typeof b === 'string' ? `b-${idx}` : (b.id ?? `b-${idx}`);
                        return (
                            <li key={key} className="gh:flex gh:items-start gh:gap-2.5 gh:text-[14px] gh:leading-snug gh:text-[#3d3d3d]">
                                <CheckmarkIcon />
                                <span>{label}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function CheckmarkIcon(): ReactElement {
    return (
        <svg className="gh:mt-0.5 gh:h-3.5 gh:w-3.5 gh:shrink-0 gh:text-[var(--ghost-accent-color,#15171a)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}
