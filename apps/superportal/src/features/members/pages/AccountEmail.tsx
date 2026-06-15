import {useState, useEffect, type ReactElement} from 'react';
import type {Services, SiteNewsletter} from '../../../types';
import type {MembersApiClient, MemberRecord} from '../../../shared/api-client';
import {warn} from '../../../shared/log';
import {BackButton} from '../../../shared/components/buttons/BackButton';
import {NewsletterManagement} from '../../../shared/components/newsletter-management/NewsletterManagement';

interface Props {
    services: Services;
    api: MembersApiClient;
    /** Optional success banner shown on mount (e.g. after re-enabling emails). */
    initialSuccess?: string;
    onBack(): void;
    onShowReceivingFAQ(): void;
}

export function AccountEmail({services, api, initialSuccess, onBack, onShowReceivingFAQ}: Props): ReactElement | null {
    const t = services.t;
    const state = services.getState();
    const member = state.member;
    const site = state.site;

    const [record, setRecord] = useState<MemberRecord | null>(null);
    const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
    const [commentNotifications, setCommentNotifications] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState(initialSuccess ?? '');

    useEffect(() => {
        if (!initialSuccess) return;
        const id = setTimeout(() => setSuccessMsg(''), 3000);
        return () => clearTimeout(id);
    }, [initialSuccess]);

    useEffect(() => {
        if (!member) return;
        api.member.sessionData()
            .then((rec) => {
                setRecord(rec);
                setSubscribedIds(new Set((rec?.newsletters ?? []).map(n => n.id)));
                setCommentNotifications(rec?.enable_comment_notifications ?? false);
            })
            .catch(err => warn('failed to load member record', err))
            .finally(() => setLoading(false));
    }, [api, member]);

    if (!member) return null;

    // Show every active site newsletter; fall back to the member's own list if the
    // site list isn't in the state blob. Toggles reflect current subscriptions.
    const siteNewsletters = (site.newsletters ?? []).filter(n => n.status !== 'archived');
    const newsletters: SiteNewsletter[] = siteNewsletters.length > 0
        ? siteNewsletters
        : (record?.newsletters ?? []).map(n => ({id: n.id, name: n.name, description: n.description}));

    const commentsEnabled = Boolean(site.comments_enabled && site.comments_enabled !== 'off');

    function flash(msg: string): void {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 3000);
    }

    async function persistNewsletters(ids: Set<string>): Promise<void> {
        setSaving(true);
        setError('');
        try {
            await api.member.update({newsletters: [...ids].map(id => ({id}))});
            setSubscribedIds(ids);
            flash(t('Email preferences updated.'));
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to update newsletter settings'));
        } finally {
            setSaving(false);
        }
    }

    function toggleNewsletter(id: string, checked: boolean): void {
        const next = new Set(subscribedIds);
        if (checked) next.add(id); else next.delete(id);
        void persistNewsletters(next).catch(err => warn('newsletter toggle error', err));
    }

    async function toggleComments(checked: boolean): Promise<void> {
        setSaving(true);
        setError('');
        setCommentNotifications(checked);
        try {
            await api.member.update({enable_comment_notifications: checked});
            flash(t('Comment preferences updated.'));
        } catch (err) {
            setCommentNotifications(!checked);
            setError(err instanceof Error ? err.message : t('Failed to update newsletter settings'));
        } finally {
            setSaving(false);
        }
    }

    function unsubscribeAll(): void {
        void persistNewsletters(new Set()).catch(err => warn('unsubscribe all error', err));
    }

    return (
        <div className="gh:relative">
            <BackButton onClick={onBack} t={t} />

            <header className="gh:flex gh:flex-col gh:items-center gh:gap-1 gh:mb-6">
                <h1 className="gh:m-0 gh:text-center gh:text-[28px] gh:font-bold gh:leading-tight gh:text-[#15171a]">
                    {t('Email preferences')}
                </h1>
                <p className="gh:m-0 gh:text-[14px] gh:text-[#7c8087]">{record?.email || member.email}</p>
            </header>

            {loading ? (
                <div className="gh:flex gh:justify-center gh:py-6"><Spinner /></div>
            ) : (
                <NewsletterManagement
                    newsletters={newsletters}
                    subscribedIds={subscribedIds}
                    commentsEnabled={commentsEnabled}
                    enableCommentNotifications={commentNotifications}
                    onToggleNewsletter={toggleNewsletter}
                    onToggleComments={(checked) => { void toggleComments(checked).catch(err => warn('comment toggle error', err)); }}
                    onUnsubscribeAll={unsubscribeAll}
                    successMsg={successMsg}
                    error={error}
                    saving={saving}
                    siteTitle={site.title}
                    isPaidMember={member.status !== 'free'}
                    onShowReceivingFAQ={onShowReceivingFAQ}
                    t={t}
                />
            )}
        </div>
    );
}

function Spinner(): ReactElement {
    return (
        <div className="gh:h-6 gh:w-6 gh:animate-spin gh:rounded-full gh:border-2 gh:border-[#dadee2] gh:border-t-[#15171a]" />
    );
}
