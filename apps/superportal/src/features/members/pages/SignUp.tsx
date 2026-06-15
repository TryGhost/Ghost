import {useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactElement, type ReactNode} from 'react';
import type {Services, SiteNewsletter} from '../../../types';
import type {MembersApiClient, MemberTier, SendMagicLinkResponse} from '../../../shared/api-client';
import {cn} from '../../../shared/cn';
import {CloseButton} from '../../../shared/components/buttons/CloseButton';
import {warn} from '../../../shared/log';
import {MagicLinkSent, type MagicLinkSentState} from '../../../shared/components/magic-link/MagicLinkSent';
import {NewsletterSelectionPage} from './NewsletterSelectionPage';
import {PlanSelection, FREE_PLAN_ID} from '../components/PlanSelection';
import {PoweredBy} from '../components/PoweredBy';
import {sanitizeHtml} from '../../../shared/sanitize-html';
import {
    availablePaidTiers,
    getFreeTier,
    hasFreeProductPrice,
    hasFreeTrialTier,
    isFullScreenSignup,
    isInviteOnly,
    isPaidMembersOnly,
    isSigninAllowed,
    isSignupAllowed,
    hasAvailablePrices,
} from '../access';
import {type Cadence} from '../plans';

interface Props {
    services: Services;
    api: MembersApiClient;
    /** Deep-link tier slug/id (from `data-portal="signup/{tier}/{cadence}"`). */
    initialTier?: string;
    /** Deep-link cadence (monthly|yearly|month|year). */
    initialCadence?: string;
    onClose(): void;
    onSignedIn(): void;
    onSwitchToSignin(): void;
    /** Reports whether the page wants Portal's full-screen chrome. */
    onLayoutChange?(fullScreen: boolean): void;
}

function normalizeCadence(c?: string): Cadence | null {
    if (c === 'month' || c === 'monthly') return 'month';
    if (c === 'year' || c === 'yearly') return 'year';
    return null;
}

function matchTier(tiers: MemberTier[], key?: string): MemberTier | null {
    if (!key || key === 'free') return null;
    const lower = key.toLowerCase();
    return tiers.find(t => t.id === key) ?? tiers.find(t => t.name.toLowerCase() === lower) ?? null;
}

type SignUpView = 'form' | 'newsletter-selection' | 'sent';

const PRIMARY_BTN = cn(
    'gh:flex gh:w-full gh:items-center gh:justify-center gh:gap-2',
    'gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer',
    'gh:bg-[var(--ghost-accent-color,#15171a)] gh:disabled:opacity-60 gh:disabled:cursor-not-allowed'
);

const LINK_BTN = 'gh:border-0 gh:bg-transparent gh:p-0 gh:text-[15px] gh:font-semibold gh:text-[var(--ghost-accent-color,#15171a)] gh:cursor-pointer gh:no-underline gh:hover:underline';

const INPUT_CLS = 'gh:block gh:h-11 gh:w-full gh:rounded-md gh:border gh:bg-transparent gh:px-3 gh:text-[15px] gh:text-[#1d1d1d] gh:outline-none gh:placeholder:text-[#aeaeae] gh:transition-colors';

const LABEL_CLS = 'gh:block gh:mb-0.5 gh:text-[13px] gh:font-semibold gh:text-[#333]';

const NOTIFICATION_CLS = 'gh:mx-8 gh:my-2 gh:mb-6 gh:text-center gh:text-[15px] gh:text-[#5b6573]';

export function SignUp({services, api, initialTier, initialCadence, onClose, onSignedIn, onSwitchToSignin, onLayoutChange}: Props): ReactElement {
    const t = services.t;
    const site = services.getState().site;
    const locale = site.locale || 'en';

    // `signup/free` deep links mirror Portal's `?portal=signup/free` page query.
    const pageQuery = initialTier === 'free' ? 'free' : undefined;

    const showName = site.portal_name === true;
    const termsHtml = site.portal_signup_terms_html || '';
    const sanitizedTermsHtml = useMemo(() => sanitizeHtml(termsHtml), [termsHtml]);
    const termsRequired = site.portal_signup_checkbox_required === true;

    const freeSignupNewsletters = useMemo<SiteNewsletter[]>(() => {
        return (site.newsletters || []).filter(n => n.subscribe_on_signup && n.status !== 'archived' && !n.paid);
    }, [site.newsletters]);

    const paidTiers = useMemo<MemberTier[]>(() => (pageQuery === 'free' ? [] : availablePaidTiers(site)), [site, pageQuery]);
    const focusedTier = useMemo(() => matchTier(paidTiers, initialTier), [paidTiers, initialTier]);
    const shownTiers = focusedTier ? [focusedTier] : paidTiers;
    const freeCardTier = !focusedTier && pageQuery !== 'free' && hasFreeProductPrice(site)
        ? (getFreeTier(site) ?? {id: FREE_PLAN_ID, name: 'Free', type: 'free' as const})
        : undefined;
    const hasOnlyFreeSignup = shownTiers.length === 0;

    const plans = site.portal_plans ?? ['free', 'monthly', 'yearly'];
    const showCadenceToggle = plans.includes('monthly') && plans.includes('yearly');
    const defaultCadence: Cadence = plans.includes('yearly') || !plans.includes('monthly') ? 'year' : 'month';

    const [view, setView] = useState<SignUpView>('form');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [honeypot, setHoneypot] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [errors, setErrors] = useState<{name?: string; email?: string; terms?: boolean}>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedTier, setSelectedTier] = useState<string | null>(null);
    const [sent, setSent] = useState<MagicLinkSentState | null>(null);
    const [cadence, setCadence] = useState<Cadence>(normalizeCadence(initialCadence) ?? defaultCadence);

    const fullScreen = view === 'form' && !focusedTier && isFullScreenSignup(site, pageQuery);

    useEffect(() => {
        onLayoutChange?.(fullScreen);
    }, [fullScreen, onLayoutChange]);

    function validate(): boolean {
        const next: {name?: string; email?: string; terms?: boolean} = {};
        if (showName && !name.trim()) {
            next.name = t('Enter your name');
        }
        if (!email) {
            next.email = t('Enter your email address');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            next.email = t('Invalid email address');
        }
        if (termsRequired && !termsAccepted) {
            next.terms = true;
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    }

    async function doSendMagicLink(newsletters: SiteNewsletter[]): Promise<void> {
        setLoading(true);
        setError('');
        try {
            const integrityToken = await api.member.getIntegrityToken();
            const payload = {
                email: email.trim(),
                name: showName && name.trim() ? name.trim() : undefined,
                emailType: 'signup' as const,
                integrityToken,
                honeypot: honeypot || undefined,
                autoRedirect: true,
                newsletters: newsletters.length ? newsletters.map(n => ({id: n.id, name: n.name})) : undefined
            };
            const resp: SendMagicLinkResponse = await api.member.sendMagicLink(payload);
            setSent({
                email: email.trim(),
                otcRef: resp.otc_ref ?? null,
                inboxLinks: resp.inboxLinks
            });
            setView('sent');
        } catch (err) {
            setError(err instanceof Error ? err.message : t('There was an error sending the email, please try again'));
            setView('form');
        } finally {
            setLoading(false);
        }
    }

    async function doPaidCheckout(tier: MemberTier): Promise<void> {
        setLoading(true);
        setError('');
        try {
            await api.member.checkoutPlan({
                tierId: tier.id,
                cadence,
                customerEmail: email.trim(),
                metadata: {
                    name: showName && name.trim() ? name.trim() : undefined,
                    newsletters: JSON.stringify(freeSignupNewsletters.map(n => ({id: n.id, name: n.name}))),
                },
            });
            // checkoutPlan redirects to Stripe; control normally doesn't return here.
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to process checkout, please try again'));
            setLoading(false);
        }
    }

    function doFreeSignup(): void {
        if (freeSignupNewsletters.length > 1) {
            setView('newsletter-selection');
            return;
        }
        void doSendMagicLink(freeSignupNewsletters).catch(err => warn('signup error', err));
    }

    // Free-only sites (no paid tiers): the single form submit signs up free.
    function handleSubmit(e: FormEvent): void {
        e.preventDefault();
        if (!validate()) return;
        setSelectedTier(FREE_PLAN_ID);
        doFreeSignup();
    }

    // A product card was chosen: validate the form, then route.
    function handleChoose(id: string): void {
        if (!validate()) return;
        setSelectedTier(id);
        if (id === FREE_PLAN_ID) {
            doFreeSignup();
            return;
        }
        const tier = shownTiers.find(ts => ts.id === id);
        if (tier) void doPaidCheckout(tier).catch(err => warn('paid signup error', err));
    }

    if (view === 'sent' && sent) {
        return (
            <MagicLinkSent
                services={services}
                api={api}
                sent={sent}
                emailType="signup"
                onClose={onClose}
                onSignedIn={onSignedIn}
            />
        );
    }

    if (view === 'newsletter-selection') {
        return (
            <NewsletterSelectionPage
                services={services}
                newsletters={freeSignupNewsletters}
                allNewsletters={site.newsletters || []}
                loading={loading}
                showChooseDifferentPlan={!hasOnlyFreeSignup}
                onBack={() => setView('form')}
                onSubmit={(selected) => {
                    void doSendMagicLink(selected).catch(err => warn('signup error', err));
                }}
            />
        );
    }

    const header = (
        <header className={cn('gh:flex gh:flex-col gh:items-center gh:gap-3 gh:mb-8', fullScreen && 'gh:mt-8')}>
            {site.icon && (
                <img className={cn('gh:rounded-sm gh:object-cover', fullScreen ? 'gh:h-[60px] gh:w-[60px] gh:max-[480px]:h-12 gh:max-[480px]:w-12' : 'gh:h-14 gh:w-14')} src={site.icon} alt={site.title} />
            )}
            <h1 className="gh:m-0 gh:text-center gh:text-[35px] gh:font-bold gh:leading-[1.1] gh:tracking-[-0.022em] gh:text-[#1d1d1d] gh:max-[480px]:text-[32px]">{site.title}</h1>
        </header>
    );

    const loginMessage = isSigninAllowed(site) && (
        <div className="gh:mt-6 gh:flex gh:items-center gh:justify-center gh:gap-2 gh:text-[15px] gh:text-[#333]">
            <span>{t('Already a member?')}</span>
            <button type="button" className={LINK_BTN} onClick={onSwitchToSignin}>
                {t('Sign in')}
            </button>
        </div>
    );

    // Portal's gating branches (signup-page.js:715-827).
    let body: ReactNode;
    if (isInviteOnly(site)) {
        body = (
            <section>
                <p className={NOTIFICATION_CLS}>{t('This site is invite-only, contact the owner for access.')}</p>
                {loginMessage}
            </section>
        );
    } else if (!isSignupAllowed(site) || !hasAvailablePrices(site, pageQuery)) {
        body = (
            <section>
                <p className={NOTIFICATION_CLS}>{t('Memberships unavailable, contact the owner for access.')}</p>
            </section>
        );
    } else if (isPaidMembersOnly(site) && pageQuery === 'free') {
        body = (
            <section>
                <p className={NOTIFICATION_CLS}>{t('This site only accepts paid members.')}</p>
                {loginMessage}
            </section>
        );
    } else {
        const termsBlock = sanitizedTermsHtml ? (
            <div className="gh:mx-auto gh:mb-6 gh:max-w-[420px]">
                {termsRequired ? (
                    <label className={cn(
                        'gh:flex gh:items-start gh:gap-2 gh:text-[13px] gh:cursor-pointer',
                        errors.terms ? 'gh:text-[#e23a31]' : 'gh:text-[#3d3d3d]'
                    )}>
                        <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={e => setTermsAccepted(e.target.checked)}
                            className="gh:mt-0.5"
                        />
                        <span dangerouslySetInnerHTML={{__html: sanitizedTermsHtml}} />
                    </label>
                ) : (
                    <div
                        className="gh:text-center gh:text-[13px] gh:text-[#3d3d3d]"
                        dangerouslySetInnerHTML={{__html: sanitizedTermsHtml}}
                    />
                )}
            </div>
        ) : null;

        const products = !hasOnlyFreeSignup && (
            <PlanSelection
                tiers={shownTiers}
                cadence={cadence}
                onCadenceChange={setCadence}
                onChoose={handleChoose}
                freeTier={freeCardTier}
                busy={loading}
                selectedId={selectedTier}
                error={error || undefined}
                layout={fullScreen ? 'grid' : 'stack'}
                showToggle={showCadenceToggle && shownTiers.length > 0}
                showFreePrice={!hasOnlyFreeSignup}
                locale={locale}
                t={t}
            />
        );

        body = (
            <form onSubmit={handleSubmit}>
                <div className="gh:mx-auto gh:max-w-[420px]">
                    {showName && (
                        <div className="gh:mb-4">
                            <label htmlFor="sp-signup-name" className={LABEL_CLS}>{t('Name')}</label>
                            <input
                                id="sp-signup-name"
                                type="text"
                                autoComplete="name"
                                autoFocus
                                placeholder={t('Jamie Larson')}
                                value={name}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                                className={cn(INPUT_CLS, errors.name ? 'gh:border-[#e23a31]' : 'gh:border-[#e1e1e1] gh:focus:border-[#aeaeae]')}
                            />
                            {errors.name && (
                                <p className="gh:m-0 gh:mt-1 gh:text-[12px] gh:text-[#e23a31]">{errors.name}</p>
                            )}
                        </div>
                    )}

                    <div className="gh:mb-6">
                        <label htmlFor="sp-signup-email" className={LABEL_CLS}>{t('Email')}</label>
                        <input
                            id="sp-signup-email"
                            type="email"
                            autoComplete="email"
                            autoFocus={!showName}
                            placeholder={t('jamie@example.com')}
                            value={email}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            className={cn(INPUT_CLS, errors.email ? 'gh:border-[#e23a31]' : 'gh:border-[#e1e1e1] gh:focus:border-[#aeaeae]')}
                        />
                        {errors.email && (
                            <p className="gh:m-0 gh:mt-1 gh:text-[12px] gh:text-[#e23a31]">{errors.email}</p>
                        )}
                    </div>

                    <div className="gh:hidden" aria-hidden="true">
                        <input
                            type="text"
                            name="phonenumber"
                            tabIndex={-1}
                            autoComplete="off"
                            value={honeypot}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setHoneypot(e.target.value)}
                        />
                    </div>
                </div>

                {hasOnlyFreeSignup ? (
                    <div className="gh:mx-auto gh:max-w-[420px]">
                        {freeCardTier?.description && (
                            <p className="gh:mb-4 gh:mt-0 gh:text-center gh:text-[14px] gh:font-semibold gh:text-[#15171a]">{freeCardTier.description}</p>
                        )}
                        {termsBlock}
                        <button type="submit" disabled={loading} className={PRIMARY_BTN}>
                            {loading ? t('Sending...') : error ? t('Retry') : t('Sign up')}
                        </button>
                        {error && (
                            <p className="gh:m-0 gh:mt-2 gh:text-center gh:text-[13px] gh:text-[#e23a31]">{error}</p>
                        )}
                        {loginMessage}
                    </div>
                ) : (
                    <>
                        {termsBlock}
                        {products}
                        {hasFreeTrialTier(site, pageQuery) && (
                            <p className="gh:mx-auto gh:mt-6 gh:mb-0 gh:max-w-[420px] gh:text-center gh:text-[13px] gh:text-[#5b6573]">
                                {t('After a free trial ends, you will be charged the regular price for the tier you\'ve chosen. You can always cancel before then.')}
                            </p>
                        )}
                        {loginMessage}
                    </>
                )}
            </form>
        );
    }

    if (fullScreen) {
        return (
            <div className="gh:relative gh:flex gh:min-h-full gh:flex-col">
                <button
                    type="button"
                    onClick={onClose}
                    className="gh:group gh:absolute gh:left-0 gh:top-0 gh:inline-flex gh:items-center gh:border-0 gh:bg-transparent gh:p-2 gh:text-[15px] gh:font-medium gh:text-[#1d1d1d] gh:cursor-pointer gh:max-[960px]:hidden"
                >
                    <span className="gh:me-1 gh:transition-transform gh:duration-300 gh:group-hover:-translate-x-[3px]">&larr;</span>
                    {t('Back')}
                </button>
                <CloseButton onClick={onClose} t={t} />

                {header}
                {body}

                {!services.getState().preview && (
                    <div className="gh:mt-auto gh:pt-10 gh:self-start">
                        <PoweredBy />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="gh:relative">
            <CloseButton onClick={onClose} t={t} />
            {header}
            {body}
        </div>
    );
}
