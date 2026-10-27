import PostShareModal from '@/shared/analytics/post-share-modal';
import React, { useEffect, useState } from 'react';
import { LucideIcon, cn, formatDisplayDate, formatNumber } from '@tryghost/shade/utils';
import { type LatestPostWithStats } from '@/analytics/hooks/use-latest-post-stats';
import { type Post, getPostMetricsToDisplay, trackEvent } from '@tryghost/admin-x-framework';
import { CAPS_LABEL } from './type';
import {
  Badge,
  Button,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { editorReturnState } from '@/editor/api';
import { getPostDestination } from '@/analytics/utils/url-helpers';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import {
  useMembersTrackSources,
  useWebAnalyticsEnabled,
} from '@tryghost/admin-x-framework/api/settings';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 1's latest post, after the Vision prototype's LatestPostCard:
// a grey box (grey 50, 32px in) with 4px corners all round (Shade
// rounded-sm), clipping the full-bleed feature image to them, with a "Latest"
// badge on it. Then the title and byline, a rule, Members and Unique visitors,
// and one quiet action pinned to the bottom: "View analytics", a muted text
// link with at least 32px above it. Shade tokens throughout; the Vision's own
// sizes are only a guide.
//
// Today's card also shows email opens and clicks, Edit post and Share; the
// Vision shows only the two metrics. Edit and Share stay as icon buttons in
// the bottom right.

const LABEL = CAPS_LABEL;

// The "Latest" badge: Shade's Badge, a pill, in the page's own
// colours so it reads on any image. Its text is the caps label style
// (type.ts) a size down, 11px (Shade text-xs), in the default colour.
const LATEST_BADGE = cn(
  CAPS_LABEL,
  'border-transparent bg-background text-xs font-medium text-foreground',
);

// The card's actions: round icon buttons with a soft fill, like a news app's
// share row. Shade's large icon button (one control tall), white (the page
// background, on the box's grey 50) with the icon in the default text colour;
// grey 100 on hover. Each names itself in a tooltip.
const ROUND_ACTION = 'bg-background text-foreground hover:bg-gray-100';

const RoundAction: React.FC<{
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, onClick, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        aria-label={label}
        className={ROUND_ACTION}
        shape="pill"
        size="icon"
        type="button"
        variant="ghost"
        onClick={onClick}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

const Stat: React.FC<{ label: string; value: string; onClick?: () => void }> = ({
  label,
  value,
  onClick,
}) => (
  <button
    className="flex cursor-pointer flex-col items-start gap-2 text-left"
    type="button"
    onClick={onClick}
  >
    <span className={LABEL}>{label}</span>
    <span className="text-3xl leading-none font-normal tracking-tight">{value}</span>
  </button>
);

interface LatestPostBoxProps {
  latestPostStats: LatestPostWithStats | null;
  isLoading: boolean;
}

const LatestPostBox: React.FC<LatestPostBoxProps> = ({ latestPostStats, isLoading }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { site, settings } = useAnalyticsData();
  const webAnalytics = useWebAnalyticsEnabled();
  const membersTrackSources = useMembersTrackSources() ?? false;
  const [isShareOpen, setIsShareOpen] = useState(false);

  // As the real card: the share dialog never offers gift links here
  useEffect(() => {
    if (isShareOpen) {
      trackEvent('Share Modal Opened', { giftLinkShown: false, source: 'stats-overview' });
    }
  }, [isShareOpen]);

  const siteTitle =
    site.title ||
    String(settings.find((setting) => setting.key === 'title')?.value || 'Ghost Site');

  const box = 'flex h-full flex-col gap-6 overflow-hidden rounded-sm bg-gray-50 p-8';

  if (isLoading) {
    return (
      <div className={box}>
        <Skeleton className="aspect-[16/10] w-full" />
        <Skeleton className="w-3/4" />
        <Skeleton className="w-1/2" />
      </div>
    );
  }

  if (!latestPostStats) {
    return (
      <div className={cn(box, 'justify-center text-muted-foreground')}>
        <span className={LABEL}>Latest post</span>
        <span>Publish a post to see how it does.</span>
      </div>
    );
  }

  const siteTimezone = getSiteTimezone(settings);
  const metrics = getPostMetricsToDisplay(latestPostStats as Post, { membersTrackSources });
  // The API returns full author objects; the hook's type only declares name
  const authors = ((latestPostStats.authors ?? []) as { name?: string; slug?: string }[]).filter(
    (author) => author.name,
  );

  // With web analytics and member sources both off (and no email), the post
  // has no analytics to show and its destination is the editor
  const destination = getPostDestination({
    postId: latestPostStats.id,
    hasEmailData: Boolean(latestPostStats.email),
    analytics: { webAnalytics, membersTrackSources },
  });
  const opensEditor = destination.startsWith('/editor/');
  const openPost = (tab = '') =>
    navigate(opensEditor ? destination : `${destination}${tab}`, {
      state: opensEditor ? editorReturnState(location) : undefined,
    });

  return (
    <div className={box} data-testid="latest-post">
      {/* Full bleed: out to the box's edges; the box clips its top corners */}
      {/* A "Latest" badge in its top left says what the card is; without an
          image it sits above the title instead */}
      {/* The image and the title both open the post. The image is a
          pointer-only shortcut; the title is the keyboard stop. */}
      {latestPostStats.feature_image && (
        <div
          className="relative -mx-8 -mt-8 aspect-[16/10] cursor-pointer rounded-none! bg-cover bg-center"
          style={{ backgroundImage: `url(${latestPostStats.feature_image})` }}
          onClick={() => openPost()}
        >
          <Badge className={cn(LATEST_BADGE, 'absolute top-4 left-4')} shape="pill" size="md">
            Latest
          </Badge>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {!latestPostStats.feature_image && (
          <Badge className={cn(LATEST_BADGE, 'self-start')} shape="pill" size="md">
            Latest
          </Badge>
        )}
        <button
          className="cursor-pointer text-left text-xl leading-snug font-medium tracking-tight wrap-anywhere"
          type="button"
          onClick={() => openPost()}
        >
          {latestPostStats.title}
        </button>
        {/* "Aron Lemke · 26 Oct". Each name opens Posts filtered to that
            author's published posts. */}
        <span className="text-md text-muted-foreground">
          {authors.map((author, index) => (
            <React.Fragment key={author.slug ?? author.name}>
              {index > 0 && ', '}
              {author.slug ? (
                <button
                  className="cursor-pointer transition-colors hover:text-foreground"
                  type="button"
                  onClick={() => navigate(`/posts?type=published&author=${author.slug}`)}
                >
                  {author.name}
                </button>
              ) : (
                author.name
              )}
            </React.Fragment>
          ))}
          {authors.length > 0 && ' · '}
          {formatDisplayDate(latestPostStats.published_at, siteTimezone)}
        </span>
        {/* Edit and Share under the byline, like a news app's share row:
            round icon buttons with tooltips */}
        <TooltipProvider delayDuration={0}>
          <div className="mt-3 flex items-center gap-2">
            {/* No Edit button when the link at the bottom already edits */}
            {!opensEditor && (
              <RoundAction
                label="Edit post"
                onClick={() =>
                  navigate(`/editor/post/${latestPostStats.id}`, {
                    state: editorReturnState(location),
                  })
                }
              >
                <LucideIcon.PenLine />
              </RoundAction>
            )}
            {/* Email-only posts have nothing to share, as today */}
            {!latestPostStats.email_only && (
              <RoundAction label="Share post" onClick={() => setIsShareOpen(true)}>
                <LucideIcon.Share />
              </RoundAction>
            )}
          </div>
        </TooltipProvider>
      </div>

      {(metrics.showMemberGrowth || (metrics.showWebMetrics && webAnalytics)) && (
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-5">
          {metrics.showMemberGrowth && (
            <Stat
              label="Members"
              value={formatNumber(latestPostStats.member_delta || 0)}
              onClick={() => openPost('/growth')}
            />
          )}
          {metrics.showWebMetrics && webAnalytics && (
            <Stat
              label="Unique visitors"
              value={formatNumber(latestPostStats.visitors)}
              onClick={() => openPost('/web')}
            />
          )}
        </div>
      )}

      {/* Pinned to the bottom (the box stretches to the table's height), with
          at least 32px above: the 24px gap plus 8px */}
      <button
        className="mt-auto flex cursor-pointer items-center gap-1.5 self-start pt-2 text-md text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-4 [&_svg]:stroke-[1.5px]"
        type="button"
        onClick={() => openPost()}
      >
        {opensEditor ? 'Edit post' : 'View analytics'}
        <LucideIcon.ArrowRight />
      </button>
      {/* The real card's share dialog, opened by the Share button above (not
          its own trigger, so the button can carry a tooltip) */}
      {!latestPostStats.email_only && (
        <PostShareModal
          author={authors.map((author) => author.name).join(', ')}
          description=""
          faviconURL={site.icon || ''}
          featureImageURL={latestPostStats.feature_image || ''}
          open={isShareOpen}
          postExcerpt={latestPostStats.excerpt || ''}
          postTitle={latestPostStats.title}
          postURL={latestPostStats.url || ''}
          siteTitle={siteTitle}
          onClose={() => setIsShareOpen(false)}
          onOpenChange={setIsShareOpen}
        />
      )}
    </div>
  );
};

export default LatestPostBox;
