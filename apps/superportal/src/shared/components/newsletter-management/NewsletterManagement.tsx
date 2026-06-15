/**
 * Presentational newsletter-management UI — the toggle list, comments toggle,
 * and unsubscribe-all. Shared by the members chunk (AccountEmail, authenticated)
 * and the unsubscribe chunk (keyed by uuid+key), mirroring Portal's single
 * NewsletterManagement component. No API calls — the caller owns data + handlers.
 */

import {type ChangeEvent, type ReactElement, type ReactNode} from 'react';
import type {SiteNewsletter, Translator} from '../../../types';

interface Props {
    newsletters: SiteNewsletter[];
    subscribedIds: Set<string>;
    commentsEnabled: boolean;
    enableCommentNotifications: boolean;
    onToggleNewsletter(id: string, checked: boolean): void;
    onToggleComments(checked: boolean): void;
    onUnsubscribeAll(): void;
    /** Optional confirmation banner shown above the list (unsubscribe flow). */
    headerNotification?: ReactNode;
    successMsg?: string;
    error?: string;
    saving: boolean;
    siteTitle: string;
    /** Portal only shows the paid-subscription notice for non-free members. */
    isPaidMember: boolean;
    /** When provided, renders the "Not receiving emails?" footer link (members flow only). */
    onShowReceivingFAQ?: () => void;
    t: Translator;
}

// Portal's .gh-portal-list anatomy (same constants as AccountHome).
const LIST_BOX = 'gh:rounded-lg gh:border gh:border-[#eaeaea] gh:bg-white gh:p-5';
const LIST_ROW = 'gh:-mx-5 gh:mb-5 gh:flex gh:items-center gh:border-b gh:border-[#eaeaea] gh:px-5 gh:pb-5 gh:last:mb-0 gh:last:border-b-0 gh:last:pb-0';
const LIST_DETAIL = 'gh:min-w-0 gh:grow gh:me-3';
const LIST_TITLE = 'gh:m-0 gh:text-[15px] gh:font-semibold gh:text-[#1d1d1d]';
const LIST_TEXT = 'gh:mb-0 gh:me-2 gh:ms-0 gh:mt-[5px] gh:break-words gh:text-[14.5px] gh:leading-[1.3] gh:tracking-[0.3px] gh:text-[#7f7f7f]';

export function NewsletterManagement({
    newsletters,
    subscribedIds,
    commentsEnabled,
    enableCommentNotifications,
    onToggleNewsletter,
    onToggleComments,
    onUnsubscribeAll,
    headerNotification,
    successMsg,
    error,
    saving,
    siteTitle,
    isPaidMember,
    onShowReceivingFAQ,
    t,
}: Props): ReactElement {
    // Portal disables unsubscribe-all once there is nothing left to unsubscribe.
    const unsubscribeAllDisabled = saving || (
        subscribedIds.size === 0 && ((commentsEnabled && !enableCommentNotifications) || !commentsEnabled)
    );

    return (
        <>
            {error && (
                <div className="gh:mb-4 gh:rounded-md gh:bg-[#fde7e7] gh:px-3 gh:py-2 gh:text-[14px] gh:text-[#a3160e]">{error}</div>
            )}
            {successMsg && (
                <div className="gh:mb-4 gh:rounded-md gh:bg-[#e6f4ea] gh:px-3 gh:py-2 gh:text-[14px] gh:text-[#1b5e20]">{successMsg}</div>
            )}

            {headerNotification && (
                <div className="gh:mb-5 gh:text-center gh:text-[14px] gh:text-[#3d3d3d]">{headerNotification}</div>
            )}

            <div className={LIST_BOX}>
                {newsletters.map(nl => (
                    <section key={nl.id} className={LIST_ROW}>
                        <div className={LIST_DETAIL}>
                            <h3 className={LIST_TITLE}>{nl.name}</h3>
                            {nl.description && <p className={LIST_TEXT}>{nl.description}</p>}
                        </div>
                        <Toggle
                            id={`sp-nl-${nl.id}`}
                            checked={subscribedIds.has(nl.id)}
                            disabled={saving}
                            onChange={e => onToggleNewsletter(nl.id, e.target.checked)}
                        />
                    </section>
                ))}

                {commentsEnabled && (
                    <section className={LIST_ROW}>
                        <div className={LIST_DETAIL}>
                            <h3 className={LIST_TITLE}>{t('Comments')}</h3>
                            <p className={LIST_TEXT}>{t('Get notified when someone replies to your comment')}</p>
                        </div>
                        <Toggle
                            id="sp-comment-notifications"
                            checked={enableCommentNotifications}
                            disabled={saving}
                            onChange={e => onToggleComments(e.target.checked)}
                        />
                    </section>
                )}
            </div>

            <div className="gh:mt-6 gh:text-center">
                <button
                    type="button"
                    disabled={unsubscribeAllDisabled}
                    onClick={onUnsubscribeAll}
                    className="gh:border-0 gh:bg-transparent gh:p-0 gh:text-[14px] gh:font-semibold gh:text-[var(--ghost-accent-color,#15171a)] gh:cursor-pointer gh:hover:underline gh:disabled:opacity-60 gh:disabled:cursor-not-allowed"
                >
                    {t('Unsubscribe from all emails')}
                </button>
                {isPaidMember && (
                    <p className="gh:mt-2 gh:mb-0 gh:text-[13px] gh:text-[#7c8087]">
                        {t('Unsubscribing from emails will not cancel your paid subscription to {title}', {title: siteTitle})}
                    </p>
                )}
            </div>

            {onShowReceivingFAQ && (
                <div className="gh:mt-5 gh:text-center">
                    <button
                        type="button"
                        onClick={onShowReceivingFAQ}
                        className="gh:border-0 gh:bg-transparent gh:p-0 gh:text-[13px] gh:text-[#7c8087] gh:cursor-pointer gh:hover:underline"
                    >
                        {t('Not receiving emails?')}
                    </button>
                </div>
            )}
        </>
    );
}

interface ToggleProps {
    id: string;
    checked: boolean;
    disabled?: boolean;
    onChange(e: ChangeEvent<HTMLInputElement>): void;
}

export function Toggle({id, checked, disabled, onChange}: ToggleProps): ReactElement {
    return (
        <label htmlFor={id} className="gh:relative gh:inline-flex gh:h-5 gh:w-9 gh:shrink-0 gh:cursor-pointer gh:items-center">
            <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="gh:peer gh:sr-only" />
            <span className="gh:absolute gh:inset-0 gh:rounded-full gh:bg-[#dadee2] gh:transition-colors gh:peer-checked:bg-[var(--ghost-accent-color,#15171a)]" />
            <span className="gh:absolute gh:start-0.5 gh:h-4 gh:w-4 gh:rounded-full gh:bg-white gh:shadow gh:transition-transform gh:ltr:peer-checked:translate-x-4 gh:rtl:peer-checked:-translate-x-4" />
        </label>
    );
}
