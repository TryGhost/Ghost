/**
 * Email-suppressed page. Ports Portal's email-suppressed-page.js: a member whose
 * email was disabled (spam complaint / hard bounce) can re-enable delivery by
 * clearing their suppression. On success we route to the email-prefs page (when
 * there's something to manage) or back to the account home.
 */

import {useState, type ReactElement} from 'react';
import type {Services} from '../../../types';
import type {MembersApiClient} from '../../../shared/api-client';
import {BackButton} from '../../../shared/components/buttons/BackButton';
import {CloseButton} from '../../../shared/components/buttons/CloseButton';
import {warn} from '../../../shared/log';

interface Props {
    services: Services;
    api: MembersApiClient;
    onBack(): void;
    onClose(): void;
    onResubscribed(): void;
}

const PRIMARY_BTN = 'gh:flex gh:w-full gh:items-center gh:justify-center gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer gh:bg-[var(--ghost-accent-color,#15171a)] gh:disabled:opacity-60';

export function EmailSuppressed({services, api, onBack, onClose, onResubscribed}: Props): ReactElement {
    const t = services.t;
    const state = services.getState();
    const site = state.site;
    const [running, setRunning] = useState(false);

    async function handleResubscribe(): Promise<void> {
        setRunning(true);
        try {
            await api.member.deleteSuppression();
            await api.member.sessionData().catch(() => null);
            const activeNewsletters = (site.newsletters ?? []).filter(n => n.status !== 'archived');
            const commentsEnabled = Boolean(
                (state.theme as {comments_enabled?: string})?.comments_enabled &&
                (state.theme as {comments_enabled?: string}).comments_enabled !== 'off'
            );
            if (activeNewsletters.length > 1 || commentsEnabled) {
                onResubscribed();
            } else {
                onBack();
            }
        } catch (err) {
            warn('re-enable emails failed', err);
            onBack();
        }
    }

    return (
        <div className="gh:relative gh:text-center">
            <BackButton onClick={onBack} t={t} />
            <CloseButton onClick={onClose} t={t} />

            <div className="gh:mb-4 gh:flex gh:justify-center gh:text-[#f50b23]"><EmailDeliveryFailedIcon /></div>

            <h1 className="gh:m-0 gh:mb-3 gh:text-[24px] gh:font-bold gh:text-[#15171a]">{t('Emails disabled')}</h1>
            <p className="gh:mb-6 gh:text-[15px] gh:text-[#7c8087]">
                {t('You\'re not receiving emails because you either marked a recent message as spam, or because messages could not be delivered to your provided email address.')}
            </p>

            <button
                type="button"
                onClick={() => { void handleResubscribe().catch(err => warn('resubscribe error', err)); }}
                disabled={running}
                className={PRIMARY_BTN}
            >
                {running ? <Spinner /> : t('Re-enable emails')}
            </button>
        </div>
    );
}

function EmailDeliveryFailedIcon(): ReactElement {
    return (
        <svg className="gh:h-12 gh:w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6.5" />
            <path d="m3 7 9 6 9-6" />
            <path d="M3 7v10a2 2 0 0 0 2 2h8" />
            <circle cx="18" cy="18" r="4" />
            <path d="m16.5 16.5 3 3M19.5 16.5l-3 3" />
        </svg>
    );
}

function Spinner(): ReactElement {
    return <div className="gh:h-5 gh:w-5 gh:animate-spin gh:rounded-full gh:border-2 gh:border-white/40 gh:border-t-white" />;
}
