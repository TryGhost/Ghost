/**
 * Newsletter unsubscribe from an email-footer link (unauthenticated, keyed by
 * uuid+key). Ports Portal's unsubscribe-page.js: fetch the member by key,
 * auto-unsubscribe on arrival (specific newsletter / comments / single-newsletter
 * site), then show a confirmation + the shared NewsletterManagement so the reader
 * can adjust. No login required.
 */

import {useEffect, useState, type ReactElement, type ReactNode} from 'react';
import type {Services, SiteNewsletter, SiteState} from '../../types';
import type {MembersApiClient, MemberNewsletterPreference} from '../../shared/api-client';
import {CloseButton} from '../../shared/components/buttons/CloseButton';
import {warn} from '../../shared/log';
import {Interpolate} from '../../shared/i18n/Interpolate';
import {NewsletterManagement} from '../../shared/components/newsletter-management/NewsletterManagement';

interface Props {
    services: Services;
    api: MembersApiClient;
    uuid: string;
    /** Named memberKey (not `key`) — `key` is a reserved React prop. */
    memberKey: string;
    newsletterUuid?: string;
    comments?: boolean;
    onClose(): void;
}

const PRIMARY_BTN = 'gh:flex gh:w-full gh:items-center gh:justify-center gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer gh:bg-[var(--ghost-accent-color,#15171a)] gh:disabled:opacity-60';
const LINK_BTN = 'gh:border-0 gh:bg-transparent gh:p-0 gh:font-semibold gh:text-[var(--ghost-accent-color,#15171a)] gh:cursor-pointer gh:underline';

type HeaderKind = {kind: 'newsletter'; name: string} | {kind: 'comments'} | null;

export function UnsubscribeModal({services, api, uuid, memberKey, newsletterUuid, comments, onClose}: Props): ReactElement {
    const t = services.t;
    const state = services.getState();
    const site = state.site;

    const siteNewsletters = (site.newsletters ?? []).filter(n => n.status !== 'archived');
    const commentsEnabled = Boolean(site.comments_enabled && site.comments_enabled !== 'off');

    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [memberStatus, setMemberStatus] = useState<string>('free');
    const [found, setFound] = useState(false);
    const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
    const [commentNotifications, setCommentNotifications] = useState(false);
    const [header, setHeader] = useState<HeaderKind>(null);
    const [showPrefs, setShowPrefs] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    function flash(msg: string): void {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 3000);
    }

    useEffect(() => {
        let active = true;
        api.member.newsletters({uuid, key: memberKey})
            .then(async (res) => {
                if (!active) return;
                // The endpoint returns member fields at the top level.
                const m = res;
                if (!m || !m.email) {
                    setFound(false);
                    return;
                }
                setFound(true);
                setEmail(m.email);
                setMemberStatus(m.status ?? 'free');
                setCommentNotifications(m.enable_comment_notifications ?? false);
                const subs = new Set((m.newsletters ?? []).map((n: MemberNewsletterPreference) => n.id));

                // Auto-unsubscribe on arrival (mirrors Portal).
                if (siteNewsletters.length === 1 && !commentsEnabled && !newsletterUuid) {
                    await api.member.updateNewsletters({uuid, key: memberKey,newsletters: [], enable_comment_notifications: false});
                    setSubscribedIds(new Set());
                } else if (newsletterUuid) {
                    const target = (m.newsletters ?? []).find((n: MemberNewsletterPreference) => n.uuid === newsletterUuid);
                    const remaining = (m.newsletters ?? []).filter((n: MemberNewsletterPreference) => n.uuid !== newsletterUuid);
                    await api.member.updateNewsletters({uuid, key: memberKey,newsletters: remaining.map((n: MemberNewsletterPreference) => ({id: n.id}))});
                    setSubscribedIds(new Set(remaining.map((n: MemberNewsletterPreference) => n.id)));
                    const name = target?.name ?? siteNewsletters.find(n => n.uuid === newsletterUuid)?.name ?? '';
                    setHeader({kind: 'newsletter', name});
                } else if (comments && commentsEnabled) {
                    await api.member.updateNewsletters({uuid, key: memberKey, newsletters: [...subs].map(id => ({id})), enable_comment_notifications: false});
                    setCommentNotifications(false);
                    setSubscribedIds(subs);
                    setHeader({kind: 'comments'});
                } else {
                    setSubscribedIds(subs);
                }
            })
            .catch((err) => {
                warn('unsubscribe fetch error', err);
                if (active) setFound(false);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function persist(ids: Set<string>, commentNotif: boolean | undefined, msg: string): Promise<void> {
        setSaving(true);
        setError('');
        try {
            await api.member.updateNewsletters({
                uuid,
                key: memberKey,
                newsletters: [...ids].map(id => ({id})),
                ...(commentNotif !== undefined ? {enable_comment_notifications: commentNotif} : {}),
            });
            setSubscribedIds(ids);
            if (commentNotif !== undefined) setCommentNotifications(commentNotif);
            flash(msg);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to update newsletter settings'));
        } finally {
            setSaving(false);
        }
    }

    function toggleNewsletter(id: string, checked: boolean): void {
        const next = new Set(subscribedIds);
        if (checked) next.add(id); else next.delete(id);
        void persist(next, undefined, t('Email preferences updated.')).catch(err => warn('toggle error', err));
    }

    function toggleComments(checked: boolean): void {
        void persist(subscribedIds, checked, t('Comment preferences updated.')).catch(err => warn('comment toggle error', err));
    }

    function unsubscribeAll(): void {
        void persist(new Set(), false, t('Unsubscribed from all emails.')).catch(err => warn('unsubscribe all error', err));
    }

    const bold = (text: string): ReactElement => <strong>{text}</strong>;

    if (loading) {
        return (
            <div className="gh:relative">
                <CloseButton onClick={onClose} t={t} />
                <div className="gh:flex gh:justify-center gh:py-10"><Spinner /></div>
            </div>
        );
    }

    if (!found) {
        return (
            <div className="gh:relative gh:text-center">
                <CloseButton onClick={onClose} t={t} />
                <div className="gh:mb-3 gh:flex gh:flex-col gh:items-center gh:gap-4">
                    <WarningIcon />
                    <h1 className="gh:m-0 gh:text-[26px] gh:font-bold gh:leading-tight gh:text-[#15171a]">{t('That didn\'t go to plan')}</h1>
                </div>
                <p className="gh:mb-6 gh:text-[15px] gh:text-[#7c8087]">
                    {t('We couldn\'t unsubscribe you as the email address was not found. Please contact the site owner.')}
                </p>
                <button type="button" onClick={onClose} className={PRIMARY_BTN}>{t('Close')}</button>
            </div>
        );
    }

    // Single-newsletter site: simple confirmation with an option to expand prefs.
    if (siteNewsletters.length === 1 && !commentsEnabled && !showPrefs) {
        return (
            <div className="gh:relative gh:text-center">
                <CloseButton onClick={onClose} t={t} />
                <SiteHeader site={site} />
                <h1 className="gh:m-0 gh:mb-4 gh:text-[26px] gh:font-bold gh:leading-tight gh:text-[#15171a]">{t('Successfully unsubscribed')}</h1>
                <p className="gh:mb-3 gh:text-[15px] gh:text-[#3d3d3d]">
                    <Interpolate string={t('{memberEmail} will no longer receive this newsletter.')} mapping={{memberEmail: bold(email)}} />
                </p>
                <p className="gh:m-0 gh:text-[14px] gh:text-[#7c8087]">
                    <Interpolate
                        string={t('Didn\'t mean to do this? Manage your preferences <button>here</button>.')}
                        mapping={{button: <button type="button" className={LINK_BTN} onClick={() => setShowPrefs(true)} />}}
                    />
                </p>
            </div>
        );
    }

    const headerNotification: ReactNode = header?.kind === 'newsletter'
        ? <Interpolate string={t('{memberEmail} will no longer receive {newsletterName} newsletter.')} mapping={{memberEmail: bold(email), newsletterName: bold(header.name)}} />
        : header?.kind === 'comments'
            ? <Interpolate string={t('{memberEmail} will no longer receive emails when someone replies to your comments.')} mapping={{memberEmail: bold(email)}} />
            : undefined;

    return (
        <div className="gh:relative">
            <CloseButton onClick={onClose} t={t} />
            <SiteHeader site={site} />
            <NewsletterManagement
                newsletters={siteNewsletters as SiteNewsletter[]}
                subscribedIds={subscribedIds}
                commentsEnabled={commentsEnabled}
                enableCommentNotifications={commentNotifications}
                onToggleNewsletter={toggleNewsletter}
                onToggleComments={toggleComments}
                onUnsubscribeAll={unsubscribeAll}
                headerNotification={headerNotification}
                successMsg={successMsg}
                error={error}
                saving={saving}
                siteTitle={site.title}
                isPaidMember={memberStatus !== 'free'}
                t={t}
            />
        </div>
    );
}

function SiteHeader({site}: {site: SiteState}): ReactElement {
    return (
        <header className="gh:mb-5 gh:flex gh:flex-col gh:items-center gh:gap-3">
            {site.icon && <img className="gh:h-12 gh:w-12 gh:rounded-sm gh:object-cover" src={site.icon} alt={site.title} />}
            <h2 className="gh:m-0 gh:text-[18px] gh:font-semibold gh:text-[#15171a]">{site.title}</h2>
        </header>
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

function Spinner(): ReactElement {
    return <div className="gh:h-6 gh:w-6 gh:animate-spin gh:rounded-full gh:border-2 gh:border-[#dadee2] gh:border-t-[#15171a]" />;
}
