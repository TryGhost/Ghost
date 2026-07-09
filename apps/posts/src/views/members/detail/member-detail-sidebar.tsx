import React from 'react';
import moment from 'moment-timezone';
import {Avatar} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {Member} from '@tryghost/admin-x-framework/api/members';
import {formatMemberLocation, getMemberReferrerSource} from './member-detail-format';

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
}

const MemberDetailSidebar: React.FC<MemberDetailSidebarProps> = ({member, draftName, draftEmail}) => {
    // Prefer the live draft over the saved member so a rename shows up in the
    // sidebar immediately. In create mode there's no saved member; fall back to
    // "New member" so the sidebar isn't a bare avatar during first-run typing.
    const name = (draftName ?? member?.name ?? '').trim();
    const email = (draftEmail ?? member?.email ?? '').trim();
    const identityName = name || email || 'New member';
    const isNewMember = !member;

    return (
        <aside className='flex w-full shrink-0 flex-col gap-6 lg:w-72' data-testid='member-detail-sidebar'>
            <div className='flex items-center gap-3'>
                <Avatar className='size-12 min-w-12' email={email || undefined} name={name || undefined} src={member?.avatar_image} />
                <div className='min-w-0'>
                    <h2 className='truncate text-lg font-semibold'>{identityName}</h2>
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

                    <div className='flex flex-col gap-2 text-sm'>
                        <h3 className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>Signup info</h3>
                        <MetaRow icon={<LucideIcon.UserPlus size={16} />}>
                            Created — {formatDate(member.created_at)}
                        </MetaRow>
                        {(() => {
                            const referrerSource = getMemberReferrerSource(member.attribution);
                            return referrerSource ? (
                                <MetaRow icon={<LucideIcon.Globe size={16} />}>
                                    Source — <span title={referrerSource}>{referrerSource}</span>
                                </MetaRow>
                            ) : null;
                        })()}
                        {member.attribution?.url && member.attribution?.title && (
                            <MetaRow icon={<LucideIcon.FileText size={16} />}>
                                Page — <a className='truncate hover:underline' href={member.attribution.url} rel='noopener noreferrer' target='_blank' title={member.attribution.title}>{member.attribution.title}</a>
                            </MetaRow>
                        )}
                    </div>
                </>
            )}
        </aside>
    );
};

export default MemberDetailSidebar;
