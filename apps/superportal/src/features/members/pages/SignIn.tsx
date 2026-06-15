import {useState, type ReactElement, type FormEvent} from 'react';
import type {Services} from '../../../types';
import type {MembersApiClient} from '../../../shared/api-client';
import {cn} from '../../../shared/cn';
import {CloseButton} from '../../../shared/components/buttons/CloseButton';
import {warn} from '../../../shared/log';
import {MagicLinkSent, type MagicLinkSentState} from '../../../shared/components/magic-link/MagicLinkSent';
import {hasAvailablePrices, isSigninAllowed, isSignupAllowed} from '../access';

type SignInView = 'email' | 'sent';

interface Props {
    services: Services;
    api: MembersApiClient;
    onClose(): void;
    onSignedIn(): void;
    onSwitchToSignup(): void;
}

const PRIMARY_BTN = cn(
    'gh:flex gh:w-full gh:items-center gh:justify-center gh:gap-2',
    'gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer',
    'gh:bg-[var(--ghost-accent-color,#15171a)] gh:disabled:opacity-60 gh:disabled:cursor-not-allowed'
);

const LINK_BTN = 'gh:border-0 gh:bg-transparent gh:p-0 gh:text-[14px] gh:font-semibold gh:text-[var(--ghost-accent-color,#15171a)] gh:cursor-pointer gh:no-underline gh:hover:underline';


export function SignIn({services, api, onClose, onSignedIn, onSwitchToSignup}: Props): ReactElement {
    const t = services.t;
    const site = services.getState().site;

    const [view, setView] = useState<SignInView>('email');
    const [email, setEmail] = useState('');
    const [honeypot, setHoneypot] = useState('');
    const [emailError, setEmailError] = useState('');
    const [sent, setSent] = useState<MagicLinkSentState | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function validateEmail(): boolean {
        if (!email) {
            setEmailError(t('Enter your email address'));
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError(t('Invalid email address'));
            return false;
        }
        setEmailError('');
        return true;
    }

    async function handleSendLink(e: FormEvent): Promise<void> {
        e.preventDefault();
        if (!validateEmail()) return;
        setLoading(true);
        setError('');
        try {
            const integrityToken = await api.member.getIntegrityToken();
            const resp = await api.member.sendMagicLink({
                email: email.trim(),
                emailType: 'signin',
                integrityToken,
                honeypot: honeypot || undefined,
                includeOTC: true
            });
            setSent({
                email: email.trim(),
                otcRef: resp.otc_ref ?? null,
                inboxLinks: resp.inboxLinks
            });
            setView('sent');
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to send magic link email'));
        } finally {
            setLoading(false);
        }
    }

    if (view === 'sent' && sent) {
        return (
            <MagicLinkSent
                services={services}
                api={api}
                sent={sent}
                emailType="signin"
                onClose={onClose}
                onSignedIn={onSignedIn}
            />
        );
    }

    if (!isSigninAllowed(site)) {
        return (
            <div className="gh:relative">
                <CloseButton onClick={onClose} t={t} />
                <header className="gh:flex gh:flex-col gh:items-center gh:gap-4 gh:mb-8">
                    {site.icon && (
                        <img className="gh:h-14 gh:w-14 gh:rounded-sm gh:object-cover" src={site.icon} alt={site.title} />
                    )}
                    <h1 className="gh:m-0 gh:text-[32px] gh:font-bold gh:leading-tight gh:text-[#15171a]">{t('Sign in')}</h1>
                </header>
                <p className="gh:mx-8 gh:my-2 gh:text-center gh:text-[15px] gh:text-[#5b6573]">
                    {t('Memberships unavailable, contact the owner for access.')}
                </p>
            </div>
        );
    }

    return (
        <div className="gh:relative">
            <CloseButton onClick={onClose} t={t} />

            <header className="gh:flex gh:flex-col gh:items-center gh:gap-4 gh:mb-8">
                {site.icon && (
                    <img className="gh:h-14 gh:w-14 gh:rounded-sm gh:object-cover" src={site.icon} alt={site.title} />
                )}
                <h1 className="gh:m-0 gh:text-[32px] gh:font-bold gh:leading-tight gh:text-[#15171a]">{t('Sign in')}</h1>
            </header>

            {error && (
                <div className="gh:mb-4 gh:rounded-md gh:bg-[#fde7e7] gh:px-3 gh:py-2 gh:text-[14px] gh:text-[#a3160e]">
                    {error}
                </div>
            )}

            <form
                onSubmit={(e) => {
                    void handleSendLink(e).catch((err) => warn('signin error', err));
                }}
            >
                <div className="gh:mb-4">
                    <label htmlFor="sp-signin-email" className="gh:block gh:mb-1.5 gh:text-[13px] gh:font-medium gh:text-[#3d3d3d]">
                        {t('Email')}
                    </label>
                    <input
                        id="sp-signin-email"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        placeholder={t('jamie@example.com')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={cn(
                            'gh:block gh:w-full gh:rounded-md gh:border gh:bg-white gh:px-3 gh:py-2.5 gh:text-[15px] gh:text-[#15171a] gh:outline-none',
                            emailError ? 'gh:border-[#e23a31]' : 'gh:border-[#dadee2] gh:focus:border-[#a8adb4]'
                        )}
                    />
                    {emailError && (
                        <p className="gh:m-0 gh:mt-1 gh:text-[12px] gh:text-[#e23a31]">{emailError}</p>
                    )}
                </div>

                {/* Honeypot — hidden from humans, bots fill it. */}
                <div className="gh:hidden" aria-hidden="true">
                    <input
                        type="text"
                        name="phonenumber"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                    />
                </div>

                <button type="submit" disabled={loading} className={PRIMARY_BTN}>
                    {loading ? t('Sending login link...') : error ? t('Retry') : t('Continue')}
                </button>
            </form>

            {isSignupAllowed(site) && hasAvailablePrices(site) && (
                <div className="gh:mt-5 gh:flex gh:items-center gh:justify-center gh:gap-2 gh:text-[14px] gh:text-[#3d3d3d]">
                    <span>{t("Don't have an account?")}</span>
                    <button type="button" className={LINK_BTN} onClick={onSwitchToSignup}>
                        {t('Sign up')}
                    </button>
                </div>
            )}
        </div>
    );
}

