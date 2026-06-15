import {useEffect, useState, type ReactElement} from 'react';
import type {Services} from '../../types';
import type {MembersApiClient} from '../../shared/api-client';
import {SignIn} from './pages/SignIn';
import {SignUp} from './pages/SignUp';
import {AccountHome} from './pages/AccountHome';
import {AccountEmail} from './pages/AccountEmail';
import {AccountProfile} from './pages/AccountProfile';
import {AccountPlan} from './pages/AccountPlan';
import {EmailSuppressed} from './pages/EmailSuppressed';
import {EmailReceivingFAQ} from './pages/EmailReceivingFAQ';
import {EmailSuppressionFAQ} from './pages/EmailSuppressionFAQ';

export type MembersPage =
    | 'signin'
    | 'signup'
    | 'account'
    | 'account-email'
    | 'account-profile'
    | 'account-plan'
    | 'email-suppressed'
    | 'email-receiving-faq'
    | 'email-suppression-faq';

interface Props {
    services: Services;
    api: MembersApiClient;
    initialPage: MembersPage;
    /** Deep-link tier slug/id from `data-portal="signup/{tier}/{cadence}"`. */
    initialTier?: string;
    /** Deep-link cadence ('monthly'|'yearly'|'month'|'year') from the same trigger. */
    initialCadence?: string;
    /** True when an FAQ page was opened directly via hash (hides its back/header). */
    initialDirect?: boolean;
    onClose(): void;
    /** Reports whether the active page wants Portal's full-screen chrome. */
    onLayoutChange?(fullScreen: boolean): void;
}

/**
 * Orchestrating component that handles page routing within the members modal.
 * All page transitions stay inside this component so the iframe isn't torn down.
 */
export function MembersModal({
    services,
    api,
    initialPage,
    initialTier,
    initialCadence,
    initialDirect = false,
    onClose,
    onLayoutChange,
}: Props): ReactElement {
    const t = services.t;
    const member = services.getState().member;
    // If member is already signed in and requested signin/signup, redirect to account.
    const startPage: MembersPage =
        member && (initialPage === 'signin' || initialPage === 'signup')
            ? 'account'
            : initialPage;

    const [page, setPage] = useState<MembersPage>(startPage);
    // `direct` only holds for an FAQ page reached straight from a hash link; any
    // in-app navigation clears it so the back button reappears.
    const [direct, setDirect] = useState<boolean>(initialDirect);
    // Carries the "successfully resubscribed" flash from email-suppressed → account-email.
    const [emailNotice, setEmailNotice] = useState<string>('');

    function goTo(target: MembersPage): void {
        setDirect(false);
        setPage(target);
    }

    // Only signup drives full-screen chrome (via its own onLayoutChange).
    useEffect(() => {
        if (page !== 'signup') {
            onLayoutChange?.(false);
        }
    }, [page, onLayoutChange]);

    switch (page) {
    case 'signin':
        return (
            <SignIn
                services={services}
                api={api}
                onClose={onClose}
                onSignedIn={() => goTo('account')}
                onSwitchToSignup={() => goTo('signup')}
            />
        );
    case 'signup':
        return (
            <SignUp
                services={services}
                api={api}
                initialTier={initialTier}
                initialCadence={initialCadence}
                onClose={onClose}
                onSignedIn={() => goTo('account')}
                onSwitchToSignin={() => goTo('signin')}
                onLayoutChange={onLayoutChange}
            />
        );
    case 'account':
        return (
            <AccountHome
                services={services}
                api={api}
                onClose={onClose}
                onManageNewsletters={() => goTo('account-email')}
                onShowSuppressed={() => goTo('email-suppressed')}
                onEditProfile={() => goTo('account-profile')}
                onChangePlan={() => goTo('account-plan')}
            />
        );
    case 'account-plan':
        return (
            <AccountPlan
                services={services}
                api={api}
                onClose={onClose}
                onBack={() => goTo('account')}
            />
        );
    case 'account-email':
        return (
            <AccountEmail
                services={services}
                api={api}
                initialSuccess={emailNotice}
                onBack={() => goTo('account')}
                onShowReceivingFAQ={() => goTo('email-receiving-faq')}
            />
        );
    case 'account-profile':
        return (
            <AccountProfile
                services={services}
                api={api}
                onClose={onClose}
                onBack={() => goTo('account')}
            />
        );
    case 'email-suppressed':
        return (
            <EmailSuppressed
                services={services}
                api={api}
                onClose={onClose}
                onBack={() => goTo('account')}
                onResubscribed={() => { setEmailNotice(t('You have been successfully resubscribed')); goTo('account-email'); }}
            />
        );
    case 'email-receiving-faq':
        return (
            <EmailReceivingFAQ
                services={services}
                direct={direct}
                onClose={onClose}
                onBack={() => goTo('account-email')}
                onEditProfile={() => goTo('account-profile')}
            />
        );
    case 'email-suppression-faq':
        return (
            <EmailSuppressionFAQ
                services={services}
                direct={direct}
                onClose={onClose}
                onBack={() => goTo('email-suppressed')}
            />
        );
    }
}
