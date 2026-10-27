import FeatureImagePlaceholder from '@/shared/feature-image-placeholder';
import React from 'react';
import {
  LucideIcon,
  abbreviateNumber,
  cn,
  formatDisplayDate,
  formatNumber,
} from '@tryghost/shade/utils';
import { type Post } from '@tryghost/admin-x-framework';
import { Skeleton } from '@tryghost/shade/components';
import { editorReturnState } from '@/editor/api';
import { getPostDestination } from '@/analytics/utils/url-helpers';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';
import { useBrowsePosts } from '@tryghost/admin-x-framework/api/posts';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import {
  useEmailTrackClicks,
  useEmailTrackOpens,
  useMembersTrackSources,
  usePaidMembersEnabled,
  useWebAnalyticsEnabled,
} from '@tryghost/admin-x-framework/api/settings';
import { usePostStats } from '@tryghost/admin-x-framework/api/stats';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 3's Recent posts, in place of the latest post and Top posts
// (Top content on Web traffic already ranks posts by visitors). An editorial
// 50/50, after a magazine homepage: the latest post as the lead on the left
// (large image, title, excerpt, byline, numbers), the next three stacked on
// the right (text, then a thumbnail), with a hairline between the halves and
// between the stacked posts. Each post's numbers are today's metric chips,
// with their hover cards, from its own stats.
//
// Every row is one target: the whole post opens its analytics (or the editor,
// with nothing to show), with Top posts' hover fill reaching 12px past it.

const RECENT_COUNT = 4;

type RecentPost = Post & {
  authors?: { name?: string }[];
  excerpt?: string;
  feature_image?: string | null;
  email?: unknown;
  email_only?: boolean;
  count?: { clicks?: number } | null;
};

// The row's hover fill, outside its content edge so nothing moves (as Top
// posts in Exploration 1)
const HOVER_FILL =
  'relative isolate cursor-pointer text-left outline-none before:absolute before:inset-y-0 before:-inset-x-3 before:-z-10 before:rounded-sm before:bg-muted/60 before:opacity-0 before:transition-opacity hover:before:opacity-100 focus-visible:before:opacity-100';

const usePostOpener = (post: RecentPost) => {
  const navigate = useNavigate();
  const location = useLocation();
  const webAnalytics = useWebAnalyticsEnabled();
  const membersTrackSources = useMembersTrackSources() ?? false;

  return () => {
    const destination = getPostDestination({
      postId: post.id,
      hasEmailData: Boolean(post.email),
      analytics: { webAnalytics, membersTrackSources },
    });
    const opensEditor = destination.startsWith('/editor/');
    navigate(destination, { state: opensEditor ? editorReturnState(location) : undefined });
  };
};

// Under the title, 13px: "By Aron Lemke · 22 Oct" (just the date with
// no author)
const Byline: React.FC<{ post: RecentPost }> = ({ post }) => {
  const { settings } = useAnalyticsData();
  const authors = (post.authors ?? [])
    .map((author) => author.name)
    .filter(Boolean)
    .join(', ');

  return (
    <span className="py-1 text-base text-muted-foreground">
      {authors && <>By {authors} &middot; </>}
      {formatDisplayDate(post.published_at ?? '', getSiteTimezone(settings))}
    </span>
  );
};

// Today's hover card for a post's metric (copied from the current build's
// Top posts, analytics/views/stats/overview/components/top-posts.tsx, where
// it isn't exported), opening from the chip's left edge: these chips sit on
// the left, so a right-aligned card would run off the column
interface MetricCardProps {
  title: string;
  metrics: { icon: React.ReactNode; label: string; metric: React.ReactNode }[];
}

const MetricCard: React.FC<MetricCardProps> = ({ title, metrics }) => (
  <div className="pointer-events-none absolute bottom-[calc(100%+2px)] left-0 z-50 min-w-[160px] rounded-md bg-background p-3 text-sm opacity-0 shadow-md transition-all group-hover/tooltip:bottom-[calc(100%+12px)] group-hover/tooltip:opacity-100">
    <div className="mb-1.5 border-b pr-10 pb-1.5 font-medium whitespace-nowrap text-muted-foreground">
      {title}
    </div>
    <div className="flex flex-col gap-1.5">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {metric.icon}
            {metric.label}
          </div>
          <span className="font-mono">{metric.metric}</span>
        </div>
      ))}
    </div>
  </div>
);

const ICON_PROPS = { size: 16, strokeWidth: 1.5 } as const;
const cardIcon = (Icon: React.ElementType) => (
  <Icon className="shrink-0 text-muted-foreground" {...ICON_PROPS} />
);

// One metric chip, as today's Top posts: a leading icon (muted) and the
// number (default colour, 17px). A soft fill on hover with its card above,
// and a click through to that part of the post's analytics (without also
// opening the row)
const MetricChip: React.FC<{
  icon: React.ElementType;
  value: React.ReactNode;
  card: MetricCardProps;
  onClick: () => void;
  testId?: string;
}> = ({ icon: Icon, value, card, onClick, testId }) => (
  <span
    className="group/tooltip relative flex"
    data-testid={testId}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
  >
    <MetricCard {...card} />
    <span className="flex items-center gap-1.5 rounded-md px-2 py-1 text-foreground hover:bg-muted-foreground/10">
      <Icon className="shrink-0 text-muted-foreground" size={14} strokeWidth={1.5} />
      {value}
    </span>
  </span>
);

// The post's numbers as today's metric chips: Web traffic, New members and
// Newsletter performance last (only sent posts have it), each with its hover card. The
// row starts 8px left so the first icon lines up with the text above.
// small: the stacked posts' numbers, smaller (14px, from the lead's 17px)
const Numbers: React.FC<{ post: RecentPost; small?: boolean }> = ({ post, small }) => {
  const navigate = useNavigate();
  const webAnalytics = useWebAnalyticsEnabled();
  const membersTrackSources = useMembersTrackSources() ?? false;
  const paidMembersEnabled = usePaidMembersEnabled();
  const showOpenTracking = useEmailTrackOpens() ?? false;
  const showClickTracking = useEmailTrackClicks() ?? false;
  const { data } = usePostStats(post.id, { enabled: Boolean(post.id) });
  const stats = data?.stats?.[0];
  const openTab = (tab: string) => navigate(`/posts/analytics/${post.id}/${tab}`);

  const visitors = stats?.visitors ?? 0;
  const sent = stats?.recipient_count ?? 0;
  const opens = stats?.opened_count ?? 0;
  const openRate = stats?.open_rate ?? 0;
  const clicks = post.count?.clicks ?? 0;
  const members = stats?.member_delta ?? 0;
  const free = stats?.free_members ?? 0;
  const paid = stats?.paid_members ?? 0;
  const plus = (value: number) => (value > 0 ? `+${formatNumber(value)}` : '0');

  const showWeb = webAnalytics && !post.email_only;
  const showNewsletter = Boolean(post.email);
  if (!showWeb && !showNewsletter && !membersTrackSources) {
    return null;
  }

  let newsletterIcon: React.ElementType = LucideIcon.Send;
  let newsletterValue = abbreviateNumber(sent);
  if (showOpenTracking) {
    newsletterIcon = LucideIcon.MailOpen;
    newsletterValue = `${Math.round(openRate)}%`;
  } else if (showClickTracking) {
    newsletterIcon = LucideIcon.MousePointer;
    newsletterValue = abbreviateNumber(clicks);
  }

  return (
    <span className={cn('-ml-2 flex flex-wrap items-start gap-2', small ? 'text-md' : 'text-xl')}>
      {showWeb && (
        <MetricChip
          card={{
            title: 'Web traffic',
            metrics: [
              {
                icon: cardIcon(LucideIcon.Globe),
                label: 'Unique visitors',
                metric: formatNumber(visitors),
              },
            ],
          }}
          icon={LucideIcon.Globe}
          testId="statistics-visitors"
          value={abbreviateNumber(visitors)}
          onClick={() => openTab('web')}
        />
      )}
      {membersTrackSources && (
        <MetricChip
          card={{
            title: 'New members',
            metrics: [
              { icon: cardIcon(LucideIcon.User), label: 'Free', metric: plus(free) },
              ...(paidMembersEnabled
                ? [{ icon: cardIcon(LucideIcon.CreditCard), label: 'Paid', metric: plus(paid) }]
                : []),
            ],
          }}
          icon={LucideIcon.UserPlus}
          testId="statistics-members"
          value={plus(members)}
          onClick={() => openTab('growth')}
        />
      )}
      {showNewsletter && (
        <MetricChip
          card={{
            title: 'Newsletter performance',
            metrics: [
              { icon: cardIcon(LucideIcon.Send), label: 'Sent', metric: formatNumber(sent) },
              ...(showOpenTracking
                ? [
                    {
                      icon: cardIcon(LucideIcon.MailOpen),
                      label: 'Opens',
                      metric: formatNumber(opens),
                    },
                  ]
                : []),
              ...(showClickTracking
                ? [
                    {
                      icon: cardIcon(LucideIcon.MousePointer),
                      label: 'Clicks',
                      metric: formatNumber(clicks),
                    },
                  ]
                : []),
            ],
          }}
          icon={newsletterIcon}
          value={newsletterValue}
          onClick={() => openTab('newsletter')}
        />
      )}
    </span>
  );
};

const LeadPost: React.FC<{ post: RecentPost }> = ({ post }) => {
  const openPost = usePostOpener(post);

  return (
    <button
      className={cn(HOVER_FILL, 'flex w-full flex-col gap-5 py-3')}
      type="button"
      onClick={openPost}
    >
      {post.feature_image ? (
        <div
          className="aspect-[16/10] w-full rounded-[2px] bg-cover bg-center"
          style={{ backgroundImage: `url(${post.feature_image})` }}
        />
      ) : (
        <FeatureImagePlaceholder className="aspect-[16/10] w-full bg-gray-200" />
      )}
      <span className="flex flex-col gap-2">
        <span className="flex flex-col gap-1">
          <span className="text-2xl leading-tight font-medium tracking-[-0.02em] wrap-anywhere">
            {post.title}
          </span>
          {/* The excerpt: the author's own, or Ghost's from the opening text */}
          {post.excerpt && (
            <span className="line-clamp-3 pt-1 text-md text-muted-foreground">{post.excerpt}</span>
          )}
          <Byline post={post} />
        </span>
        <span className="pt-1">
          <Numbers post={post} />
        </span>
      </span>
    </button>
  );
};

const StackedPost: React.FC<{ post: RecentPost }> = ({ post }) => {
  const openPost = usePostOpener(post);

  return (
    <button
      className={cn(
        HOVER_FILL,
        'flex w-full items-stretch gap-5 border-border py-7 not-first:border-t first:pt-3',
      )}
      type="button"
      onClick={openPost}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-lg leading-snug font-medium tracking-tight wrap-anywhere">
          {post.title}
        </span>
        <Byline post={post} />
        {/* Pinned to the bottom of the text column, so the numbers end level with
            the thumbnail's bottom edge (the chips' 4px padding pulled back) */}
        <span className="mt-auto -mb-1 pt-2">
          <Numbers post={post} small />
        </span>
      </span>
      {post.feature_image ? (
        <div
          className="h-[130px] w-[208px] shrink-0 self-start rounded-[2px] bg-cover bg-center"
          style={{ backgroundImage: `url(${post.feature_image})` }}
        />
      ) : (
        <FeatureImagePlaceholder className="h-[130px] w-[208px] shrink-0 self-start bg-gray-200" />
      )}
    </button>
  );
};

const RecentPosts: React.FC = () => {
  const { data, isLoading } = useBrowsePosts({
    searchParams: {
      filter: 'status:[published,sent]',
      order: 'published_at DESC',
      limit: String(RECENT_COUNT),
      include: 'authors,email,count.clicks',
    },
  });
  const posts = (data?.posts ?? []) as RecentPost[];
  const [lead, ...rest] = posts;

  return (
    <section className="flex flex-col gap-4" data-testid="recent-posts">
      <h3 className="text-3xl font-medium tracking-[-0.02em]">Recent posts</h3>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-[16/10] w-full" />
          <div className="flex flex-col gap-4">
            <Skeleton className="w-3/4" />
            <Skeleton className="w-1/2" />
            <Skeleton className="w-2/3" />
          </div>
        </div>
      ) : !lead ? (
        <p className="text-md text-muted-foreground">Publish a post to see how it does.</p>
      ) : (
        // Two halves with a hairline between them; stacked below lg
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="lg:border-r lg:border-border lg:pr-10">
            <LeadPost post={lead} />
          </div>
          {rest.length > 0 && (
            <div className="flex flex-col border-t border-border pt-2 lg:border-t-0 lg:pt-0 lg:pl-10">
              {rest.map((post) => (
                <StackedPost key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default RecentPosts;
