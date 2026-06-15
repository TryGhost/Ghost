/**
 * Post feedback (more/less like this) from an email link. Ports Portal's
 * feedback-page.js: logged-in members auto-submit the score from the link;
 * logged-out readers (keyed by uuid+key) get a confirm dialog to pick/confirm
 * the score, then submit. Shows a thanks or error view.
 */

import {useEffect, useState, type ReactElement} from 'react';
import type {Services} from '../../types';
import type {MembersApiClient} from '../../shared/api-client';
import {cn} from '../../shared/cn';
import {CloseButton} from '../../shared/components/buttons/CloseButton';
import {warn} from '../../shared/log';

interface Props {
    services: Services;
    api: MembersApiClient;
    postId: string;
    score: number;
    uuid?: string;
    /** Named memberKey (not `key`) — `key` is a reserved React prop. */
    memberKey?: string;
    onClose(): void;
}

type View = 'confirm' | 'loading' | 'success' | 'error';

const PRIMARY_BTN = 'gh:flex gh:w-full gh:items-center gh:justify-center gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer gh:bg-[var(--ghost-accent-color,#15171a)] gh:disabled:opacity-60';

export function FeedbackModal({services, api, postId, score, uuid, memberKey, onClose}: Props): ReactElement {
    const t = services.t;
    const isLoggedIn = !!services.getState().member;

    const [view, setView] = useState<View>(isLoggedIn ? 'loading' : 'confirm');
    const [selectedScore, setSelectedScore] = useState(score === 0 ? 0 : 1);
    const [errorMsg, setErrorMsg] = useState('');

    async function submit(finalScore: number): Promise<void> {
        setView('loading');
        try {
            await api.feedback.add({postId, score: finalScore, uuid, key: memberKey});
            setSelectedScore(finalScore);
            setView('success');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : t('There was a problem submitting your feedback. Please try again a little later.'));
            setView('error');
        }
    }

    useEffect(() => {
        if (isLoggedIn) void submit(score === 0 ? 0 : 1).catch(e => warn('feedback submit error', e));
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (view === 'error') {
        return (
            <div className="gh:relative gh:text-center">
                <CloseButton onClick={onClose} t={t} />
                <div className="gh:mb-3 gh:flex gh:justify-center gh:text-[#f50b23]"><ThumbIcon up={false} className="gh:h-12 gh:w-12" /></div>
                <h1 className="gh:m-0 gh:mb-2 gh:text-[24px] gh:font-bold gh:text-[#15171a]">{t('Sorry, that didn’t work.')}</h1>
                <p className="gh:mb-6 gh:text-[15px] gh:text-[#7c8087]">{errorMsg}</p>
                <button type="button" onClick={onClose} className={PRIMARY_BTN}>{t('Close')}</button>
            </div>
        );
    }

    if (view === 'success') {
        return (
            <div className="gh:relative gh:text-center">
                <CloseButton onClick={onClose} t={t} />
                <div className="gh:mb-3 gh:flex gh:justify-center gh:text-[var(--ghost-accent-color,#15171a)]"><ThumbIcon up={selectedScore === 1} className="gh:h-12 gh:w-12" /></div>
                <h1 className="gh:m-0 gh:mb-2 gh:text-[24px] gh:font-bold gh:text-[#15171a]">{t('Thanks for the feedback!')}</h1>
                <p className="gh:mb-6 gh:text-[15px] gh:text-[#7c8087]">{t('Your input helps shape what gets published.')}</p>
                <button type="button" onClick={onClose} className={PRIMARY_BTN}>{t('Close')}</button>
            </div>
        );
    }

    if (view === 'loading') {
        return (
            <div className="gh:relative">
                <CloseButton onClick={onClose} t={t} />
                <div className="gh:flex gh:justify-center gh:py-10"><Spinner /></div>
            </div>
        );
    }

    // confirm
    return (
        <div className="gh:relative">
            <CloseButton onClick={onClose} t={t} />
            <h1 className="gh:m-0 gh:text-center gh:text-[24px] gh:font-bold gh:text-[#15171a]">{t('Give feedback on this post')}</h1>

            <div className="gh:mt-8 gh:grid gh:grid-cols-2 gh:gap-4">
                <ScoreButton selected={selectedScore === 1} up onClick={() => setSelectedScore(1)} label={t('More like this')} />
                <ScoreButton selected={selectedScore === 0} up={false} onClick={() => setSelectedScore(0)} label={t('Less like this')} />
            </div>

            <button type="button" onClick={() => { void submit(selectedScore).catch(e => warn('feedback submit error', e)); }} className={cn(PRIMARY_BTN, 'gh:mt-8')}>
                {t('Submit feedback')}
            </button>
        </div>
    );
}

interface ScoreButtonProps {
    selected: boolean;
    up: boolean;
    onClick(): void;
    label: string;
}

function ScoreButton({selected, up, onClick, label}: ScoreButtonProps): ReactElement {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'gh:relative gh:flex gh:items-center gh:justify-center gh:gap-2 gh:rounded-[22px] gh:border-0 gh:px-2 gh:py-3 gh:text-[14px] gh:font-bold gh:cursor-pointer',
                'gh:bg-[#f4f5f6] gh:text-[#505050]',
                selected && 'gh:text-[var(--ghost-accent-color,#15171a)] gh:shadow-[inset_0_0_0_2px_currentColor]'
            )}
        >
            <ThumbIcon up={up} className="gh:h-5 gh:w-5" />
            {label}
        </button>
    );
}

function ThumbIcon({up, className}: {up: boolean; className?: string}): ReactElement {
    return (
        <svg className={cn(className, up ? '' : 'gh:rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
        </svg>
    );
}

function Spinner(): ReactElement {
    return <div className="gh:h-6 gh:w-6 gh:animate-spin gh:rounded-full gh:border-2 gh:border-[#dadee2] gh:border-t-[#15171a]" />;
}
