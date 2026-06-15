/**
 * Tips & Donations. Mirrors Portal's redirect-only flow (support-page.js):
 * clicking the trigger immediately starts a Stripe donation checkout (amount +
 * note are entered on Stripe). On return, Portal shows a success or error view
 * — ported here from support-success.js / support-error.js. No in-app amount UI.
 */

import {useEffect, useState, type ReactElement} from 'react';
import type {Services} from '../../types';
import type {MembersApiClient} from '../../shared/api-client';
import {cn} from '../../shared/cn';
import {CloseButton} from '../../shared/components/buttons/CloseButton';
import {warn} from '../../shared/log';

export type SupportView = 'loading' | 'success' | 'error';

interface Props {
    services: Services;
    api: MembersApiClient;
    initialView: SupportView;
    onClose(): void;
}

const PRIMARY_BTN = cn(
    'gh:flex gh:w-full gh:items-center gh:justify-center gh:gap-2',
    'gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer',
    'gh:bg-[var(--ghost-accent-color,#15171a)] gh:disabled:opacity-60 gh:disabled:cursor-not-allowed'
);
const LINK_BTN = 'gh:border-0 gh:bg-transparent gh:p-0 gh:text-[14px] gh:font-semibold gh:text-[var(--ghost-accent-color,#15171a)] gh:cursor-pointer gh:no-underline gh:hover:underline';

export function SupportModal({services, api, initialView, onClose}: Props): ReactElement {
    const t = services.t;
    const state = services.getState();
    const site = state.site;
    const member = state.member;

    const [view, setView] = useState<SupportView>(initialView);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (initialView !== 'loading') return;

        if (site.donations_enabled === false) {
            setErrorMsg(t('This site is not accepting donations at the moment.'));
            setView('error');
            return;
        }

        const currentUrl = window.location.origin + window.location.pathname;
        const successUrl = member
            ? `${currentUrl}?action=support&success=true`
            : `${currentUrl}#/portal/support/success`;

        api.member.checkoutDonation({successUrl, cancelUrl: currentUrl, personalNote: t('Add a personal note')})
            .then((res) => {
                if (res.url) window.location.assign(res.url);
            })
            .catch((err) => {
                warn('donation checkout error', err);
                setErrorMsg(t('Something went wrong, please try again later.'));
                setView('error');
            });
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cross-trigger members via the hash DOM contract (features don't import each other).
    function goTo(route: 'signup' | 'signin'): void {
        onClose();
        window.location.hash = `#/portal/${route}`;
    }

    if (view === 'success') {
        return (
            <div className="gh:relative gh:text-center">
                <CloseButton onClick={onClose} t={t} />

                <div className="gh:mb-3 gh:flex gh:flex-col gh:items-center gh:gap-4">
                    {site.icon
                        ? <img className="gh:h-12 gh:w-12 gh:rounded-sm gh:object-cover" src={site.icon} alt={site.title} />
                        : <ConfettiIcon />}
                    <h1 className="gh:m-0 gh:text-[28px] gh:font-bold gh:leading-tight gh:text-[#15171a]">
                        {t('Thank you for your support')}
                    </h1>
                </div>

                <p className="gh:mb-6 gh:text-[15px] gh:text-[#7c8087]">
                    {t('To continue to stay up to date, subscribe to {publication} below.', {publication: site.title})}
                </p>

                <button type="button" onClick={() => goTo('signup')} className={PRIMARY_BTN}>
                    {t('Sign up')}
                </button>

                <div className="gh:mt-5 gh:flex gh:items-center gh:justify-center gh:gap-2 gh:text-[14px] gh:text-[#3d3d3d]">
                    <span>{t('Already a member?')}</span>
                    <button type="button" className={LINK_BTN} onClick={() => goTo('signin')}>
                        {t('Sign in')}
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'error') {
        return (
            <div className="gh:relative gh:text-center">
                <CloseButton onClick={onClose} t={t} />

                <div className="gh:mb-3 gh:flex gh:flex-col gh:items-center gh:gap-4">
                    <WarningIcon />
                    <h1 className="gh:m-0 gh:text-[28px] gh:font-bold gh:leading-tight gh:text-[#15171a]">
                        {t('Sorry, that didn’t work.')}
                    </h1>
                </div>

                <p className="gh:mb-6 gh:text-[15px] gh:text-[#7c8087]">
                    {errorMsg || t('There was an error processing your payment. Please try again.')}
                </p>

                <button type="button" onClick={onClose} className={PRIMARY_BTN}>
                    {t('Close')}
                </button>
            </div>
        );
    }

    return (
        <div className="gh:flex gh:justify-center gh:py-10">
            <div className="gh:h-6 gh:w-6 gh:animate-spin gh:rounded-full gh:border-2 gh:border-[#dadee2] gh:border-t-[#15171a]" />
        </div>
    );
}

function ConfettiIcon(): ReactElement {
    return (
        <svg className="gh:h-12 gh:w-12 gh:text-[var(--ghost-accent-color,#15171a)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="8 12.5 11 15.5 16 9" />
        </svg>
    );
}

function WarningIcon(): ReactElement {
    return (
        <svg className="gh:h-12 gh:w-12 gh:text-[#f50b23]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}
