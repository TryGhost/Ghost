import React from 'react';
import moment from 'moment-timezone';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { Avatar, Separator } from '@tryghost/shade/components';
import { cn, formatNumber, LucideIcon } from '@tryghost/shade/utils';
import type { Member } from '@tryghost/admin-x-framework/api/members';
import { formatMemberLocation, getMemberReferrerSource } from './member-detail-format';
import { memberAvatarProps } from '@/members/member-format';
import { isSafeHref } from './is-safe-href';

// Matches the members list (`members-list-item.tsx`), which also renders member
// dates in UTC. Site-timezone formatting is a follow-up for the cutover.
const formatDate = (value: string) => moment.utc(value).format('D MMM YYYY');

const MetaRow: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <p className="flex items-center gap-2 text-muted-foreground">
    <span className="shrink-0 text-muted-foreground">{icon}</span>
    <span className="min-w-0 truncate">{children}</span>
  </p>
);

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex min-w-0 flex-col gap-1.5">
    <p className="stat-label text-muted-foreground">{label}</p>
    <p className="min-w-0 truncate text-md text-foreground">{children}</p>
  </div>
);

interface MemberDetailSidebarProps {
  // Saved member from the query — absent in create mode.
  member?: Member;
  // Live values from the draft: the sidebar mirrors what the user is typing so
  // there's always an identity to show.
  draftName?: string;
  draftEmail?: string;
  // Gate for the engagement stats section. Owned by the parent so all settings
  // reads happen in one place.
  engagementEnabled?: boolean;
  showIdentity?: boolean;
}

// Takes the first token split on a single space, without trimming: a name with a
// leading space yields an empty first name.
const getFirstName = (name: string) => name.split(' ')[0] || '';

const MemberDetailSidebar: React.FC<MemberDetailSidebarProps> = ({
  member,
  draftName,
  draftEmail,
  engagementEnabled,
  showIdentity = true,
}) => {
  // Prefer the live draft over the saved member so a rename shows up in the
  // sidebar immediately. In create mode there's no saved member; fall back to
  // "New member" so the sidebar isn't a bare avatar during first-run typing.
  const name = (draftName ?? member?.name ?? '').trim();
  const email = (draftEmail ?? member?.email ?? '').trim();
  const identityName = name || email || 'New member';
  const isNewMember = !member;
  const admin7Design = useFeatureFlag('admin7Design');
  const referrerSource = getMemberReferrerSource(member?.attribution);
  // Attribution URLs originate from external signup traffic (Referer header, UTM
  // params), so validate the scheme before dropping it into an anchor `href`. Same
  // rule set as the activity feed. Falls back to plain text when the URL is missing
  // or unsafe.
  const attributionPage =
    member?.attribution?.title &&
    (isSafeHref(member.attribution.url) ? (
      <a
        className="truncate text-foreground hover:underline"
        href={member.attribution.url}
        rel="noopener noreferrer"
        target="_blank"
        title={member.attribution.title}
      >
        {member.attribution.title}
      </a>
    ) : (
      <span className="truncate text-foreground" title={member.attribution.title}>
        {member.attribution.title}
      </span>
    ));
  const engagement = member && engagementEnabled && (
    <section
      className={cn('flex flex-col text-sm', admin7Design ? 'gap-5' : 'mt-4 gap-3')}
      data-testid="member-detail-engagement"
    >
      <h4 className="section-heading border-b border-border pb-2 text-base font-semibold in-data-[admin7-design=true]:pb-3">
        Engagement
      </h4>
      {/* A missing `email_count` counts as no newsletters received. */}
      {(member.email_count ?? 0) === 0 ? (
        // Falls back to a generic "this member" when no name is known.
        <p className="text-muted-foreground in-data-[admin7-design=true]:text-base in-data-[admin7-design=true]:italic">
          {name
            ? `We’ll show ${getFirstName(name)}’s email stats here once they receive their first newsletter.`
            : 'We’ll show this member’s email stats here once they receive their first newsletter.'}
        </p>
      ) : (
        <div className="flex flex-col gap-4 in-data-[admin7-design=true]:grid in-data-[admin7-design=true]:grid-cols-2 in-data-[admin7-design=true]:gap-x-6 in-data-[admin7-design=true]:gap-y-8">
          <div className="flex flex-col gap-0.5 in-data-[admin7-design=true]:gap-2">
            <p className="stat-label text-muted-foreground">Emails received</p>
            <p className="stat-value text-2xl font-semibold">
              {formatNumber(member.email_count ?? 0)}
            </p>
          </div>
          <div className="flex flex-col gap-0.5 in-data-[admin7-design=true]:gap-2">
            <p className="stat-label text-muted-foreground">Emails opened</p>
            <p className="stat-value text-2xl font-semibold">
              {formatNumber(member.email_opened_count ?? 0)}
            </p>
          </div>
          <div className="flex flex-col gap-0.5 in-data-[admin7-design=true]:col-span-2 in-data-[admin7-design=true]:gap-2">
            <p className="stat-label text-muted-foreground">Average open rate</p>
            {member.email_open_rate === null || member.email_open_rate === undefined ? (
              // Server sends `null` until the member has
              // been sent 5 newsletters.
              <p className="text-muted-foreground in-data-[admin7-design=true]:text-base in-data-[admin7-design=true]:italic">
                This metric is calculated once a member has received 5 newsletters.
              </p>
            ) : (
              <p className="stat-value text-2xl font-semibold">
                {formatNumber(member.email_open_rate)}
                <span className="text-base font-normal text-muted-foreground">%</span>
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );

  return (
    <aside
      className="flex w-full shrink-0 flex-col gap-6 lg:w-80"
      data-testid="member-detail-sidebar"
    >
      {showIdentity && (
        <div className="flex items-center gap-3 py-4">
          <Avatar
            className="size-12 min-w-12 [&_span]:text-lg"
            {...memberAvatarProps({ name, email })}
            src={member?.avatar_image}
          />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">{identityName}</h2>
            {name && email && (
              <a
                className="block truncate text-muted-foreground hover:underline"
                href={`mailto:${email}`}
              >
                {email}
              </a>
            )}
            {!name &&
              email && (
                // In create mode only the email is filled at first; still show it so the
                // sidebar visibly follows what the user has typed.
                <span className="block truncate text-muted-foreground">{email}</span>
              )}
          </div>
        </div>
      )}

      {!isNewMember && member && admin7Design && (
        <>
          {engagement}
          {engagement && <Separator />}
          <div className="flex flex-col gap-6">
            <InfoRow label="Location">
              <span data-testid="member-detail-location">
                {formatMemberLocation(member.geolocation)}
              </span>
            </InfoRow>
            <InfoRow label="Created">{formatDate(member.created_at)}</InfoRow>
            <InfoRow label="Last seen">
              {member.last_seen_at ? formatDate(member.last_seen_at) : 'Not seen yet'}
            </InfoRow>
            {referrerSource && (
              <InfoRow label="Source">
                <span title={referrerSource}>{referrerSource}</span>
              </InfoRow>
            )}
            {attributionPage && <InfoRow label="Page">{attributionPage}</InfoRow>}
            {member.can_comment === false && <InfoRow label="Comments">Disabled</InfoRow>}
          </div>
        </>
      )}

      {!isNewMember && member && !admin7Design && (
        <>
          <div className="flex flex-col gap-2 text-sm">
            <MetaRow icon={<LucideIcon.MapPin size={16} />}>
              <span data-testid="member-detail-location">
                {formatMemberLocation(member.geolocation)}
              </span>
            </MetaRow>
            <MetaRow icon={<LucideIcon.Eye size={16} />}>
              {member.last_seen_at
                ? `Last seen on ${formatDate(member.last_seen_at)}`
                : 'Not seen yet'}
            </MetaRow>
            {member.can_comment === false && (
              <MetaRow icon={<LucideIcon.MessageSquareOff size={16} />}>Comments disabled</MetaRow>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 text-sm">
            <h3 className="section-heading border-b border-border pb-2 text-base font-semibold">
              Signup info
            </h3>
            <MetaRow icon={<LucideIcon.UserPlus size={16} />}>
              Created — <span className="text-foreground">{formatDate(member.created_at)}</span>
            </MetaRow>
            {referrerSource && (
              <MetaRow icon={<LucideIcon.Globe size={16} />}>
                Source —{' '}
                <span className="text-foreground" title={referrerSource}>
                  {referrerSource}
                </span>
              </MetaRow>
            )}
            {attributionPage && (
              <MetaRow icon={<LucideIcon.FileText size={16} />}>Page — {attributionPage}</MetaRow>
            )}
          </div>

          {engagement}
        </>
      )}
    </aside>
  );
};

export default MemberDetailSidebar;
