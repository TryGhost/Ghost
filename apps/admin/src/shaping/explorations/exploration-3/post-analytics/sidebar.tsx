import PostAnalyticsEmailSendingStatus from '@/posts/analytics/email-sending-status/post-analytics-email-sending-status';
import React from 'react';
import { Button, Separator, Skeleton } from '@tryghost/shade/components';
import {
  LucideIcon,
  formatDisplayDate,
  formatDisplayTime,
  formatNumber,
} from '@tryghost/shade/utils';
import { type Post } from '@/posts/analytics/providers/post-analytics-context';
import { SectionTitle, Stat } from './section';
import { centsToDollars } from '@/shared/analytics/chart-helpers';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { humanizeRecipientFilter } from '@/posts/list/humanize-recipient-filter';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';
import { useBrowseNewsletters } from '@tryghost/admin-x-framework/api/newsletters';
import { useEmailSendingStatusContext } from '@/posts/analytics/email-sending-status/email-sending-status-context';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Overview's right column, like member detail's sidebar (members/detail/
// member-detail-sidebar.tsx): what this post was and what it earned. Numbers
// first, reference facts last, with a separator between sections:
//
// 1. Sending: the send in progress (or failed), moved from under the title;
//    gone once it's sent
// 2. Growth: free and paid members, MRR impact
// 3. Gift link: its visitors, with Share
// 4. Details: published, sent to, access, tags, authors, link

// A section's heading with a hairline under it; with `href`, the title is
// the link and hovering the section raises an arrow after it (section.tsx)
const SidebarSection: React.FC<{
  id: string;
  title: string;
  href?: string;
  action?: React.ReactNode;
  testId?: string;
  children: React.ReactNode;
}> = ({ id, title, href, action, testId, children }) => (
  <section aria-labelledby={id} className="group/section flex flex-col gap-5" data-testid={testId}>
    <div className="flex items-center justify-between gap-x-4 border-b border-border pb-3">
      <SectionTitle href={href} id={id} title={title} />
      {action}
    </div>
    {children}
  </section>
);

// Member detail's InfoRow: a stat-label over a 14px value
const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex min-w-0 flex-col gap-1.5">
    <p className="stat-label text-muted-foreground">{label}</p>
    <div className="min-w-0 text-md text-foreground">{children}</div>
  </div>
);

const StatSkeletons: React.FC<{ count: number }> = ({ count }) => (
  <div className="grid grid-cols-2 gap-x-6 gap-y-8">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="flex flex-col gap-2">
        <Skeleton className="w-2/3" />
        <Skeleton className="h-8 w-12" />
      </div>
    ))}
  </div>
);

const ACCESS_LABELS: Record<string, string> = {
  public: 'Public',
  members: 'Members only',
  paid: 'Paid members only',
};

const accessLabel = (post: Post) => {
  if (post.visibility === 'tiers') {
    const names = ((post.tiers ?? []) as { name?: string }[])
      .map((tier) => tier.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'Specific tiers';
  }
  return ACCESS_LABELS[post.visibility ?? 'public'] ?? post.visibility;
};

// The post's address without the site's origin, e.g. /the-recycling-plant/
const urlPath = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

interface SidebarProps {
  post: Post;
  postId: string;
  showGrowth: boolean;
  showGiftLink: boolean;
  isLoading: boolean;
  paidMembersEnabled: boolean;
  totals?: { free_members?: number; paid_members?: number; mrr?: number };
  currencySymbol: string;
  giftLinkVisits?: number;
  isGiftLinkLoading: boolean;
  onShareGiftLink: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  post,
  postId,
  showGrowth,
  showGiftLink,
  isLoading,
  paidMembersEnabled,
  totals,
  currencySymbol,
  giftLinkVisits,
  isGiftLinkLoading,
  onShareGiftLink,
}) => {
  const { settings } = useAnalyticsData();
  const timezone = getSiteTimezone(settings);
  const { status, isNewsletterDataHidden, isEmailSent } = useEmailSendingStatusContext();
  const { data: newslettersData } = useBrowseNewsletters({ searchParams: { limit: '50' } });
  const hasSeveralNewsletters = (newslettersData?.newsletters?.length ?? 0) > 1;

  // 1. Sending: while a send is under way or has failed, as the status line
  // under the title showed it (post-analytics-email-sending-status.tsx)
  const sending = status?.sending;
  const showSending = Boolean(
    sending && (sending.status !== 'submitted' || isNewsletterDataHidden),
  );

  // 4. Details
  const authors = (post.authors ?? []).map((author) => author.name).filter(Boolean);
  const tags = ((post.tags ?? []) as { name?: string }[]).map((tag) => tag.name).filter(Boolean);
  const emailCount = post.email?.email_count ?? 0;
  const audience = humanizeRecipientFilter(post.email?.recipient_filter ?? '');
  const sentToDetail = [
    hasSeveralNewsletters ? post.newsletter?.name : null,
    audience && audience !== 'All subscribers' ? audience : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const sections: { key: string; node: React.ReactNode }[] = [];

  if (showSending) {
    sections.push({
      key: 'sending',
      node: (
        <SidebarSection id="post-sending-heading" testId="post-sending" title="Sending">
          <PostAnalyticsEmailSendingStatus key={postId} />
        </SidebarSection>
      ),
    });
  }

  if (showGrowth) {
    sections.push({
      key: 'growth',
      node: (
        <SidebarSection
          href={`#/posts/analytics/${postId}/growth`}
          id="post-growth-heading"
          testId="growth"
          title="Growth"
        >
          {isLoading ? (
            <StatSkeletons count={paidMembersEnabled ? 3 : 1} />
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-8">
              <Stat label="Free members">{formatNumber(totals?.free_members || 0)}</Stat>
              {paidMembersEnabled && (
                <>
                  <Stat label="Paid members">{formatNumber(totals?.paid_members || 0)}</Stat>
                  <Stat className="col-span-2" label="MRR impact">
                    {currencySymbol}
                    {formatNumber(centsToDollars(totals?.mrr || 0))}
                  </Stat>
                </>
              )}
            </div>
          )}
        </SidebarSection>
      ),
    });
  }

  if (showGiftLink) {
    sections.push({
      key: 'gift-link',
      node: (
        <SidebarSection
          action={
            <Button className="-mr-3" type="button" variant="ghost" onClick={onShareGiftLink}>
              <LucideIcon.Share />
              Share
            </Button>
          }
          id="post-gift-link-heading"
          testId="gift-link-card"
          title="Gift link"
        >
          {isGiftLinkLoading ? (
            <StatSkeletons count={1} />
          ) : (
            <Stat label="Visitors" testId="gift-link-card-visitors">
              {formatNumber(giftLinkVisits ?? 0)}
            </Stat>
          )}
        </SidebarSection>
      ),
    });
  }

  sections.push({
    key: 'details',
    node: (
      <SidebarSection id="post-details-heading" testId="post-details" title="Details">
        <div className="flex flex-col gap-6">
          {post.published_at && (
            <InfoRow label={post.email_only ? 'Sent' : 'Published'}>
              {formatDisplayDate(post.published_at, timezone)},{' '}
              {formatDisplayTime(post.published_at, timezone)}
            </InfoRow>
          )}
          {isEmailSent && emailCount > 0 && (
            <InfoRow label="Sent to">
              {formatNumber(emailCount)} {emailCount === 1 ? 'member' : 'members'}
              {sentToDetail && (
                <span className="block text-base text-muted-foreground">{sentToDetail}</span>
              )}
            </InfoRow>
          )}
          {!post.email_only && <InfoRow label="Access">{accessLabel(post)}</InfoRow>}
          {tags.length > 0 && <InfoRow label="Tags">{tags.join(', ')}</InfoRow>}
          {authors.length > 1 && <InfoRow label="Authors">{authors.join(', ')}</InfoRow>}
          {!post.email_only && post.url && (
            <InfoRow label="Link">
              <a
                className="flex min-w-0 items-center gap-1 hover:underline"
                href={post.url}
                rel="noopener noreferrer"
                target="_blank"
                title={post.url}
              >
                <span className="truncate">{urlPath(post.url)}</span>
                <LucideIcon.ArrowUpRight className="shrink-0 text-muted-foreground" size={14} />
              </a>
            </InfoRow>
          )}
        </div>
      </SidebarSection>
    ),
  });

  return (
    <aside
      className="flex w-full shrink-0 flex-col gap-6 lg:w-80"
      data-testid="post-analytics-sidebar"
    >
      {sections.map(({ key, node }, index) => (
        <React.Fragment key={key}>
          {index > 0 && <Separator />}
          {node}
        </React.Fragment>
      ))}
    </aside>
  );
};

export default Sidebar;
