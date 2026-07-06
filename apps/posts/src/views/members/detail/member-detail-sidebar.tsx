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

const MemberDetailSidebar: React.FC<{member: Member}> = ({member}) => {
    const location = formatMemberLocation(member.geolocation);
    const referrerSource = getMemberReferrerSource(member.attribution);
    const attributionUrl = member.attribution?.url;
    const attributionTitle = member.attribution?.title;

    return (
        <aside className='flex w-full shrink-0 flex-col gap-6 lg:w-72' data-testid='member-detail-sidebar'>
            <div className='flex items-center gap-3'>
                <Avatar className='size-12 min-w-12' email={member.email} name={member.name} src={member.avatar_image} />
                <div className='min-w-0'>
                    <h2 className='truncate text-lg font-semibold'>{member.name || member.email}</h2>
                    {member.name && member.email && (
                        <a className='block truncate text-muted-foreground hover:underline' href={`mailto:${member.email}`}>
                            {member.email}
                        </a>
                    )}
                </div>
            </div>

            <div className='flex flex-col gap-2 text-sm'>
                <MetaRow icon={<LucideIcon.MapPin size={16} />}>
                    <span data-testid='member-detail-location'>{location}</span>
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
                {referrerSource && (
                    <MetaRow icon={<LucideIcon.Globe size={16} />}>
                        Source — <span title={referrerSource}>{referrerSource}</span>
                    </MetaRow>
                )}
                {attributionUrl && attributionTitle && (
                    <MetaRow icon={<LucideIcon.FileText size={16} />}>
                        Page — <a className='truncate hover:underline' href={attributionUrl} rel='noopener noreferrer' target='_blank' title={attributionTitle}>{attributionTitle}</a>
                    </MetaRow>
                )}
            </div>
        </aside>
    );
};

export default MemberDetailSidebar;
