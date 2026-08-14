import React from 'react';
import moment from 'moment-timezone';
import {Avatar} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import type {Member} from '@tryghost/admin-x-framework/api/members';
import {formatMemberLocation, getMemberReferrerSource} from './member-detail-format';
import {isSafeHref} from './is-safe-href';

// Matches the members list (`members-list-item.tsx`), which also renders member
// dates in UTC. Site-timezone formatting is a follow-up for the cutover.
const formatDate = (value: string) => moment.utc(value).format('D MMM YYYY');

const MetaRow: React.FC<{icon: React.ReactNode; children: React.ReactNode}> = ({icon, children}) => (
    <p className='flex items-center gap-2 text-muted-foreground'>
        <span className='shrink-0 text-muted-foreground'>{icon}</span>
        <span className='min-w-0 truncate'>{children}</span>
    </p>
);

interface MemberDetailSidebarProps {
    // Saved member from the query — absent in create mode.
    member?: Member;
    // Live values from the draft: the sidebar mirrors what the user is typing so
    // there's always an identity to show (matches Ember, which live-updates the
    // sidebar title as the fields change).
    draftName?: string;
    draftEmail?: string;
    // Ember-parity gate for the engagement stats section (see
    // `gh-member-details.hbs:84`). Owned by the parent so all settings
    // reads happen in one place.
    engagementEnabled?: boolean;
}

// Matches Ember's `first-name` helper (`ghost/admin/app/helpers/first-name.js`):
// splits on a single space, takes the first token. NO trim — a name that
// somehow slipped through with a leading space should render the same empty
// first-token Ember would, not a coincidentally-different truthy one.
const getFirstName = (name: string) => name.split(' ')[0] || '';

const MemberDetailSidebar: React.FC<MemberDetailSidebarProps> = ({member, draftName, draftEmail, engagementEnabled}) => {
    // Prefer the live draft over the saved member so a rename shows up in the
    // sidebar immediately. In create mode there's no saved member; fall back to
    // "New member" so the sidebar isn't a bare avatar during first-run typing.
    const name = (draftName ?? member?.name ?? '').trim();
    const email = (draftEmail ?? member?.email ?? '').trim();
    const identityName = name || email || 'New member';
    const isNewMember = !member;

    return (
        <aside className='flex w-full shrink-0 flex-col gap-6 lg:w-80' data-testid='member-detail-sidebar'>
            <div className='flex items-center gap-3 py-4'>
                <Avatar className='size-12 min-w-12 [&_span]:text-lg' email={email || undefined} name={name || undefined} src={member?.avatar_image} />
                <div className='min-w-0'>
                    <h2 className='truncate text-xl font-semibold'>{identityName}</h2>
                    {name && email && (
                        <a className='block truncate text-muted-foreground hover:underline' href={`mailto:${email}`}>
                            {email}
                        </a>
                    )}
                    {!name && email && (
                        // In create mode only the email is filled at first; still show it so the
                        // sidebar visibly follows what the user has typed.
                        <span className='block truncate text-muted-foreground'>{email}</span>
                    )}
                </div>
            </div>

            {!isNewMember && member && (
                <>
                    <div className='flex flex-col gap-2 text-sm'>
                        <MetaRow icon={<LucideIcon.MapPin size={16} />}>
                            <span data-testid='member-detail-location'>{formatMemberLocation(member.geolocation)}</span>
                        </MetaRow>
                        <MetaRow icon={<LucideIcon.Eye size={16} />}>
                            {member.last_seen_at ? `Last seen on ${formatDate(member.last_seen_at)}` : 'Not seen yet'}
                        </MetaRow>
                        {member.can_comment === false && (
                            <MetaRow icon={<LucideIcon.MessageSquareOff size={16} />}>
                                Comments disabled
                            </MetaRow>
                        )}
                    </div>

                    <div className='mt-4 flex flex-col gap-3 text-sm'>
                        <h3 className='border-b border-border pb-2 text-base font-semibold'>Signup info</h3>
                        <MetaRow icon={<LucideIcon.UserPlus size={16} />}>
                            Created — <span className='text-foreground'>{formatDate(member.created_at)}</span>
                        </MetaRow>
                        {(() => {
                            const referrerSource = getMemberReferrerSource(member.attribution);
                            return referrerSource ? (
                                <MetaRow icon={<LucideIcon.Globe size={16} />}>
                                    Source — <span className='text-foreground' title={referrerSource}>{referrerSource}</span>
                                </MetaRow>
                            ) : null;
                        })()}
                        {member.attribution?.title && (
                            <MetaRow icon={<LucideIcon.FileText size={16} />}>
                                {/* Attribution URLs originate from external
                                    signup traffic (Referer header, UTM params),
                                    so validate the scheme before dropping it
                                    into an anchor `href`. Same rule set as the
                                    activity feed. Falls back to plain text
                                    when the URL is missing or unsafe. */}
                                Page — {isSafeHref(member.attribution.url) ? (
                                    <a className='truncate text-foreground hover:underline' href={member.attribution.url} rel='noopener noreferrer' target='_blank' title={member.attribution.title}>{member.attribution.title}</a>
                                ) : (
                                    <span className='truncate text-foreground' title={member.attribution.title}>{member.attribution.title}</span>
                                )}
                            </MetaRow>
                        )}
                    </div>

                    {engagementEnabled && (
                        <section className='mt-4 flex flex-col gap-3 text-sm' data-testid='member-detail-engagement'>
                            <h4 className='border-b border-border pb-2 text-base font-semibold'>Engagement</h4>
                            {/* `?? 0` matches Ember Data's serializer, which
                                defaults `emailCount` to `0`
                                (`ghost/admin/app/models/member.js:20`). A
                                strict `=== 0` would diverge from Ember on
                                a payload where the field is `undefined`. */}
                            {(member.email_count ?? 0) === 0 ? (
                                // Ember `gh-member-details.hbs:87-96`: same copy,
                                // same curly apostrophe. Falls back to a generic
                                // "this member" when no name is known.
                                <p className='text-muted-foreground'>
                                    {name
                                        ? `We’ll show ${getFirstName(name)}’s email stats here once they receive their first newsletter.`
                                        : 'We’ll show this member’s email stats here once they receive their first newsletter.'}
                                </p>
                            ) : (
                                <div className='flex flex-col gap-4'>
                                    <div className='flex flex-col gap-0.5'>
                                        <p className='text-muted-foreground'>Emails received</p>
                                        <p className='text-2xl font-semibold'>{member.email_count}</p>
                                    </div>
                                    <div className='flex flex-col gap-0.5'>
                                        <p className='text-muted-foreground'>Emails opened</p>
                                        {/* Ember Data defaults this to `0`
                                            too (`ghost/admin/app/models/member.js:21`),
                                            so mirror that here for parity. */}
                                        <p className='text-2xl font-semibold'>{member.email_opened_count ?? 0}</p>
                                    </div>
                                    <div className='flex flex-col gap-0.5'>
                                        <p className='text-muted-foreground'>Average open rate</p>
                                        {member.email_open_rate === null || member.email_open_rate === undefined ? (
                                            // Server sends `null` until the member has
                                            // been sent 5 newsletters (Ember shows this
                                            // exact string via
                                            // `gh-member-details.hbs:112-114`).
                                            <p className='text-muted-foreground'>
                                                This metric is calculated once a member has received 5 newsletters.
                                            </p>
                                        ) : (
                                            <p className='text-2xl font-semibold'>
                                                {member.email_open_rate}<span className='text-base font-normal text-muted-foreground'>%</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                </>
            )}
        </aside>
    );
};

export default MemberDetailSidebar;
