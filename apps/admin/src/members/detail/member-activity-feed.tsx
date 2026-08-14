import React from 'react';
import moment from 'moment-timezone';
import {Card, CardContent, EmptyIndicator, Skeleton} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {isSafeHref} from './is-safe-href';
import {parseMemberEvent} from './member-event';
import {useMemberActivityFeed} from '@tryghost/admin-x-framework/api/members';
import type {MemberActivityEvent} from '@tryghost/admin-x-framework/api/members';
import type {ParsedMemberEvent} from './member-event';

interface MemberActivityFeedProps {
    // Optional so the create screen (/members/new) can render just the empty
    // state without a member yet — matches Ember's `activity-feed.hbs:2`,
    // which short-circuits to `Member::ActivityFeedEmpty` when `@member.isNew`
    // (there's no member id to fetch events for).
    memberId?: string;
    hasMultipleNewsletters: boolean;
    hasMultipleTiers: boolean;
    paidMembersEnabled: boolean;
}

/**
 * Renders a Lucide substitute for Ember's custom SVG icon names
 * (`event-signed-up`, `event-comment`, …). Intentional visual approximation
 * — pixel-perfect rendering lives behind the "View all member activity"
 * link that routes to Ember. Anything unmapped falls back to the generic
 * `Activity` icon so a new server-side event type never crashes the row.
 *
 * A switch (rather than a `Record<string, React.ComponentType>` map) sidesteps
 * a repo-wide type-mismatch: React 17 and 18 typings coexist in node_modules,
 * and Lucide's `ForwardRefExoticComponent` type doesn't fit `React.ElementType`
 * under that mix. Inline JSX resolves each icon at its use-site, which is what
 * every other member-detail component already does.
 */
const EventIcon: React.FC<{iconName: string}> = ({iconName}) => {
    const iconProps = {className: 'shrink-0 text-muted-foreground', size: 16};
    switch (iconName) {
    case 'event-signed-up': return <LucideIcon.UserPlus {...iconProps} />;
    case 'event-logged-in': return <LucideIcon.LogIn {...iconProps} />;
    case 'event-subscriptions': return <LucideIcon.CreditCard {...iconProps} />;
    case 'event-canceled-subscription': return <LucideIcon.CircleSlash {...iconProps} />;
    case 'event-subscribed-to-email': return <LucideIcon.MailPlus {...iconProps} />;
    case 'event-unsubscribed-from-email': return <LucideIcon.MailMinus {...iconProps} />;
    case 'event-opened-email': return <LucideIcon.MailOpen {...iconProps} />;
    case 'event-received-email': return <LucideIcon.Mail {...iconProps} />;
    case 'event-sent-email': return <LucideIcon.Send {...iconProps} />;
    case 'event-email-delivery-failed': return <LucideIcon.MailX {...iconProps} />;
    case 'event-email-delivery-spam': return <LucideIcon.MailWarning {...iconProps} />;
    case 'event-email-changed': return <LucideIcon.AtSign {...iconProps} />;
    case 'event-comment': return <LucideIcon.MessageSquare {...iconProps} />;
    case 'event-click': return <LucideIcon.MousePointerClick {...iconProps} />;
    case 'event-more-like-this': return <LucideIcon.ThumbsUp {...iconProps} />;
    case 'event-less-like-this': return <LucideIcon.ThumbsDown {...iconProps} />;
    case 'event-gift': return <LucideIcon.Gift {...iconProps} />;
    default: return <LucideIcon.Activity {...iconProps} />;
    }
};

/**
 * "View all member activity →" link. Points at Ember's members-activity
 * route (still on Ember post-cutover — the plan calls out that Phase 8 keeps
 * the paginated feed page on Ember for a follow-up). Uses a plain anchor with
 * the `#/…` href so the Ember hash-router picks it up rather than React
 * Router intercepting the click.
 */
const ViewAllLink: React.FC<{memberId: string}> = ({memberId}) => (
    <a
        className='block pt-3 font-medium text-primary hover:underline'
        data-testid='member-activity-view-all'
        href={`#/members-activity?member=${memberId}`}
    >
        View all member activity →
    </a>
);

// Copy pinned to Ember's `activity-feed-empty.hbs:5` so any future refactor of
// the message stays in lockstep with what Ember users see.
const NEW_MEMBER_ACTIVITY_COPY = 'All events related to this member will be shown here.';

const capitalize = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

/**
 * Ember's activity-feed row renders an `EmailPreviewLink` when `event.email`
 * is set on delivery/open/sent rows. We don't have that component in the
 * posts app — surface a plain "Email" label so the admin can at least see
 * the row carries an email object; the "View all" link routes them to Ember
 * for the actual preview.
 */
function getEmailLabel(email: unknown): string | undefined {
    if (email && typeof email === 'object') {
        const subject = (email as {subject?: string}).subject;
        return subject ? `“${subject}”` : 'Email';
    }
    return undefined;
}

const ActivityRow: React.FC<{event: ParsedMemberEvent}> = ({event}) => {
    // Unknown event types produce an empty action. Rather than shipping a
    // ghost row with just an icon + timestamp when a new server-side event
    // type appears, skip the row entirely.
    if (!event.action) {
        return null;
    }

    const emailLabel = getEmailLabel(event.email);
    const hasObjectLink = event.object && (event.route || isSafeHref(event.url));
    const hasEmailFallback = !hasObjectLink && emailLabel;

    const relativeTime = event.timestamp
        ? moment(event.timestamp).fromNow()
        // Silent misleading "a few seconds ago" from `moment(undefined)` is
        // worse than an honest hyphen — the row still renders, just without
        // a fake timestamp.
        : '—';

    return (
        <div className='flex items-start gap-3 py-3' data-testid='member-activity-event'>
            <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-muted'>
                <EventIcon iconName={event.icon} />
            </div>
            <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                <div className='text-sm leading-snug'>
                    <span data-testid='member-activity-action'>{capitalize(event.action)}</span>
                    {event.info && <span className='ml-1 text-muted-foreground'>({event.info})</span>}
                    {hasObjectLink && (
                        <>
                            <span className='mx-1 text-muted-foreground'>{event.join}</span>
                            {event.route ? (
                                // Internal Ghost route (hash-based). React
                                // Router only intercepts real `<Link>`s; a
                                // plain anchor + `#/...` hits the hash router.
                                <a className='hover:underline' href={event.route}>{event.object}</a>
                            ) : (
                                <a
                                    className='hover:underline'
                                    // isSafeHref narrowed this to a real URL.
                                    href={event.url}
                                    rel='noopener noreferrer'
                                    target='_blank'
                                >
                                    {event.object}
                                </a>
                            )}
                        </>
                    )}
                    {hasEmailFallback && (
                        // Ember shows the email preview link here; we show a
                        // plain subject label as the closest text-only parity.
                        <>
                            <span className='mx-1 text-muted-foreground'>{event.join}</span>
                            <span className='text-muted-foreground'>{emailLabel}</span>
                        </>
                    )}
                </div>
                {event.description && (
                    <div className='truncate text-xs text-muted-foreground'>{event.description}</div>
                )}
                <div className='text-xs text-muted-foreground'>{relativeTime}</div>
            </div>
        </div>
    );
};

const MemberActivityFeed: React.FC<MemberActivityFeedProps> = ({memberId, hasMultipleNewsletters, hasMultipleTiers, paidMembersEnabled}) => {
    // Cap the inline feed to the same 5 events Ember shows in the sidebar
    // section (`activity-feed.hbs:9` — pageSize=5). Anything beyond that lives
    // behind the "View all" link. On the create screen there's no memberId
    // to query against, so disable the fetch entirely — an unsaved member has
    // no events by definition.
    const {data, isLoading} = useMemberActivityFeed(memberId ?? '', {limit: '5', enabled: !!memberId});
    const rawEvents: MemberActivityEvent[] = data?.events ?? [];
    const events = rawEvents.map(rawEvent => parseMemberEvent(rawEvent, {
        hasMultipleNewsletters,
        hasMultipleTiers,
        paidMembersEnabled
    }));
    // Track duplicate composite keys as a defensive tie-break — if the server
    // ever returns two events with the same id (or missing id), append the
    // slot index so React's diff still gets a stable per-row identity.
    const seen = new Set<string>();

    // Create mode (`/members/new`) — no member id, no fetch, no "View all"
    // link. Ember renders `Member::ActivityFeedEmpty` in this state
    // (`activity-feed.hbs:2-7`); we render the same copy via Shade's
    // `EmptyIndicator` so the parity assertion for that string holds.
    if (!memberId) {
        return (
            <section className='flex flex-col gap-3' data-testid='member-activity-feed'>
                <h3 className='text-base font-semibold'>Activity</h3>
                <Card>
                    {/* Same wrapper padding as the Subscriptions empty state
                        (`member-subscriptions-section.tsx`) so both cards line
                        up visually when they render side-by-side. */}
                    <CardContent className='pt-6'>
                        <div className='flex flex-col items-center gap-3 py-4'>
                            <EmptyIndicator description={NEW_MEMBER_ACTIVITY_COPY} title='Activity'>
                                <LucideIcon.Activity />
                            </EmptyIndicator>
                        </div>
                    </CardContent>
                </Card>
            </section>
        );
    }

    return (
        <section className='flex flex-col gap-3' data-testid='member-activity-feed'>
            <h3 className='text-base font-semibold'>Activity</h3>
            <Card>
                <CardContent className='pt-3'>
                    {isLoading ? (
                        <div className='flex flex-col gap-3'>
                            <Skeleton className='h-10' />
                            <Skeleton className='h-10' />
                            <Skeleton className='h-10' />
                        </div>
                    ) : events.length === 0 ? (
                        <p className='py-4 text-center text-sm text-muted-foreground' data-testid='member-activity-empty'>
                            No activity yet
                        </p>
                    ) : (
                        <div className='divide-y divide-border'>
                            {events.map((event) => {
                                // Prefer the server-side event id. Fall back
                                // through timestamp+type+action, then append
                                // an increasing suffix to guarantee uniqueness
                                // even when two events collide on all of those
                                // (server tie-breaks same `created_at` events
                                // by id — this is a defensive backstop only).
                                const base = event.id || `${event.timestamp ?? '?'}-${event.icon}-${event.action}`;
                                let key = base;
                                let bump = 1;
                                while (seen.has(key)) {
                                    key = `${base}#${bump}`;
                                    bump += 1;
                                }
                                seen.add(key);
                                return <ActivityRow key={key} event={event} />;
                            })}
                        </div>
                    )}
                    {/* Only meaningful once there is activity to view — an empty
                        feed has nothing for the link to lead to. */}
                    {!isLoading && events.length > 0 && <ViewAllLink memberId={memberId} />}
                </CardContent>
            </Card>
        </section>
    );
};

export default MemberActivityFeed;
