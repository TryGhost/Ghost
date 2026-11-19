import { PageHeader } from '@tryghost/shade/patterns';
import GiftLinkModal from '@/posts/analytics/modals/gift-link-modal';
import PostShareModal from '@/shared/analytics/post-share-modal';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Indicator,
  Navbar,
  PageMenu,
  PageMenuItem,
} from '@tryghost/shade/components';
import { H1 } from '@tryghost/shade/primitives';
import { LucideIcon, cn, formatDisplayDate, formatNumber } from '@tryghost/shade/utils';
import { usePageChrome } from '@tryghost/shade/page-templates';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';
import { editorReturnState } from '@/editor/api';
import { usePostAnalytics } from '@/posts/analytics/providers/post-analytics-context';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { giftAccessLabel } from '@/posts/analytics/utils/gift-link';
import {
  isPublishedOnly,
  trackEvent,
  useActiveVisitors,
  useLocation,
  useNavigate,
} from '@tryghost/admin-x-framework';
import {
  useMembersTrackSources,
  useWebAnalyticsEnabled,
} from '@tryghost/admin-x-framework/api/settings';
import { useCanManageGiftLink } from '@/posts/analytics/hooks/use-can-manage-gift-link';
import { postsDataType, useDeletePost } from '@tryghost/admin-x-framework/api/posts';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useEmailSendingStatusContext } from '@/posts/analytics/email-sending-status/email-sending-status-context';
import { useQueryClient } from '@tanstack/react-query';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 3's post analytics header: a copy of
// posts/analytics/components/post-analytics-header.tsx, swapped in on every
// post analytics tab (post-analytics-header.tsx picks it). What's different:
//
// - Under the title, Recent posts' byline ("By Aron Lemke · 9 Nov") instead
//   of the full publish line and the sending status, which move to
//   Overview's right column (sidebar.tsx)
// - The actions move down from the breadcrumb row to the post's row,
//   centred on its image and title
// - Share is an icon button, like the ⋯ menu beside it
// - "Reading now" is a book icon with the count beside it, and Shade's
//   Indicator over the icon's top right, pulsing green while anyone is reading

/**
 * Readers on the post right now: a book icon, the count beside it, and
 * Shade's Indicator over the icon's top right: success and pulsing (active)
 * while anyone is reading, a grey outline (inactive) with nobody reading,
 * and a grey pulse while loading, when the count is blank.
 */
const ReadingNow: React.FC<{ count: number; isLoading: boolean }> = ({ count, isLoading }) => {
  const live = !isLoading && count > 0;
  return (
    <div
      aria-label={isLoading ? 'Readers right now' : `${formatNumber(count)} reading now`}
      className="flex items-center gap-1.5 text-muted-foreground"
      role="img"
      title="Active readers in the last 5 minutes · Updates every 60 seconds"
    >
      <span className="relative inline-flex">
        <LucideIcon.BookOpen size={16} strokeWidth={1.5} />
        <span className="absolute -top-1 -right-1 flex">
          <Indicator
            // A ring in the page colour keeps the dot clear of the icon's lines
            className="ring-2 ring-background"
            size="sm"
            state={isLoading || live ? 'active' : 'inactive'}
            variant={live ? 'success' : 'neutral'}
          />
        </span>
      </span>
      <span className="min-w-[1ch] font-mono tabular-nums">
        {isLoading ? '' : formatNumber(count)}
      </span>
    </div>
  );
};

/**
 * Holds the header and its tabs together, sticky as a whole, where `sticky`;
 * otherwise only the tabs stick. It scrolls up until its first row (the
 * breadcrumb) sits where a list page's collapsed header row does, 24px from
 * the top, level with the sidebar's menu. It stays below overlays (z-50) and
 * above the content, which keeps its own raised layers, like the newsletter
 * charts' hover cards (z-50), to itself (PostAnalyticsContent).
 */
const HeaderChrome: React.FC<{ sticky: boolean; children: React.ReactNode }> = ({
  sticky,
  children,
}) =>
  sticky ? (
    <div className="sticky top-[calc(24px-var(--large-title-space))] z-40 -mx-(--page-gutter) bg-background px-(--page-gutter)">
      {children}
    </div>
  ) : (
    <>{children}</>
  );

export interface PostAnalyticsHeaderProps {
  currentTab?: string;
  children?: React.ReactNode;
}

const Exploration3PostAnalyticsHeader: React.FC<PostAnalyticsHeaderProps> = ({
  currentTab,
  children,
}) => {
  // Where list pages show their titles large (admin7Design), the post's title
  // goes large too, a step down as it can run long, under the same space.
  const { largeTitles } = usePageChrome();
  const navigate = useNavigate();
  const location = useLocation();
  const webAnalyticsEnabled = useWebAnalyticsEnabled();
  const membersTrackSources = useMembersTrackSources();
  const queryClient = useQueryClient();
  const { mutateAsync: deletePost } = useDeletePost();
  const handleError = useHandleError();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isGiftLinkOpen, setIsGiftLinkOpen] = useState(false);
  const { settings, site, statsConfig } = useAnalyticsData();
  const { post, isPostLoading, postId } = usePostAnalytics();
  const { hasNewsletterAnalytics } = useEmailSendingStatusContext();
  const canManageGiftLink = useCanManageGiftLink(post);
  const editorPath = `/editor/post/${postId}`;

  // Under the title, Recent posts' byline: "By Aron Lemke · 9 Nov" ("Sent
  // 9 Nov" for an email-only post). The full publish and send details, and
  // a send in progress, are in Overview's right column.
  const bylineAuthors = (post?.authors ?? [])
    .map((author) => author.name)
    .filter(Boolean)
    .join(', ');
  const bylineDate =
    post?.published_at && formatDisplayDate(post.published_at, getSiteTimezone(settings));

  // Track once per open — canManageGiftLink can flip while the modal is open
  // (current-user query resolving), which must not re-fire the event.
  const shareOpenTrackedRef = useRef(false);
  useEffect(() => {
    if (!isShareOpen) {
      shareOpenTrackedRef.current = false;
      return;
    }
    if (shareOpenTrackedRef.current) {
      return;
    }
    shareOpenTrackedRef.current = true;
    trackEvent('Share Modal Opened', {
      giftLinkShown: canManageGiftLink,
      source: 'post-analytics',
    });
  }, [isShareOpen, canManageGiftLink]);

  // Use the active visitors hook with post-specific filtering
  const { activeVisitors, isLoading: isActiveVisitorsLoading } = useActiveVisitors({
    postUuid: post?.uuid,
    statsConfig,
    enabled: webAnalyticsEnabled,
  });

  // Determine which tabs to show based on post type and settings
  const availableTabs = useMemo(() => {
    if (!post) {
      return [];
    }
    const tabs = [];

    // Only show Overview and Web tabs if it's NOT a published-only post with web analytics disabled
    const isPublishedOnlyWithoutWebAnalytics = isPublishedOnly(post) && !webAnalyticsEnabled;
    if (!isPublishedOnlyWithoutWebAnalytics) {
      tabs.push('Overview');
      if (!post.email_only && webAnalyticsEnabled) {
        tabs.push('Web');
      }
    }
    if (hasNewsletterAnalytics) {
      tabs.push('Newsletter');
    }
    // Only show Growth tab if member source tracking is enabled
    if (membersTrackSources) {
      tabs.push('Growth');
    }

    return tabs;
  }, [post, webAnalyticsEnabled, membersTrackSources, hasNewsletterAnalytics]);

  const handleDeletePost = () => {
    if (!post) {
      return;
    }

    // We'll implement this as a controlled AlertDialog with React state
    setShowDeleteDialog(true);
  };

  const performDelete = async () => {
    if (!post) {
      return;
    }
    try {
      await deletePost({ id: postId });
      // `refetchType: 'none'`: this screen's own read of the post is still mounted.
      void queryClient.invalidateQueries({ queryKey: [postsDataType], refetchType: 'none' });
      setShowDeleteDialog(false);
      // Navigate back to posts list
      navigate('/posts/');
    } catch (e) {
      handleError(e);
    }
  };

  const shareAction = !post?.email_only && (
    <PostShareModal
      author={post?.authors?.[0]?.name || ''}
      canShareAsGift={canManageGiftLink}
      description=""
      faviconURL={site?.icon || ''}
      featureImageURL={post?.feature_image ?? undefined}
      giftAccessLabel={giftAccessLabel(post?.visibility)}
      open={isShareOpen}
      postExcerpt={post?.excerpt || ''}
      postTitle={post?.title}
      postURL={post?.url}
      siteTitle={site?.title || ''}
      onClose={() => setIsShareOpen(false)}
      onOpenChange={setIsShareOpen}
      onShareAsGift={() => {
        setIsShareOpen(false);
        setIsGiftLinkOpen(true);
      }}
    >
      <PageHeader.Action label="Share" iconOnly onClick={() => setIsShareOpen(true)}>
        <LucideIcon.Share />
      </PageHeader.Action>
    </PostShareModal>
  );

  const moreActions = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <PageHeader.Action label="More post actions" iconOnly>
            <LucideIcon.Ellipsis />
          </PageHeader.Action>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <a href={post?.url} rel="noopener noreferrer" target="_blank">
                <LucideIcon.ExternalLink />
                View in browser
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                navigate(editorPath, {
                  state: editorReturnState(`${location.pathname}${location.search}`),
                });
              }}
            >
              <LucideIcon.Pen />
              Edit post
              {/* <DropdownMenuShortcut>⌘E</DropdownMenuShortcut> */}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleDeletePost}
            >
              <LucideIcon.Trash />
              Delete post
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <>
      <HeaderChrome sticky={largeTitles}>
        <header
          className={cn(
            'z-50 -mx-(--page-gutter)',
            largeTitles ? 'bg-background' : 'bg-white/70 backdrop-blur-md dark:bg-background',
          )}
        >
          <div
            className={cn(
              'relative flex min-h-[102px] w-full items-start justify-between gap-5 px-(--page-gutter) pb-0',
              largeTitles ? 'pt-(--large-title-space)!' : 'pt-[28px]!',
            )}
            data-header="header"
          >
            <div className={cn('flex w-full flex-col', largeTitles ? 'gap-1' : 'gap-6')}>
              <div className="flex w-full flex-col flex-wrap justify-between md:flex-row md:items-center">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <button
                          className="cursor-pointer rounded-sm focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden"
                          type="button"
                          onClick={() => navigate('/analytics/')}
                        >
                          Analytics
                        </button>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Post analytics</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              {!isPostLoading && (
                // The post's row: its image and title, with the reading count and
                // actions at the right, centred on them
                <div className="flex items-start gap-6 md:items-center">
                  {post?.feature_image && (
                    <div
                      className="aspect-[16/10] w-full max-w-[100px] rounded-md bg-cover bg-center md:max-w-[132px]"
                      style={{
                        backgroundImage: `url(${post.feature_image})`,
                      }}
                    ></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <H1
                      className={cn(
                        '-ml-px max-w-[920px] indent-0',
                        largeTitles
                          ? 'text-[length:var(--large-title-size-sm)]! leading-[1.15]! font-title! tracking-[-0.025em]!'
                          : '!text-xl md:leading-[1.2em]',
                      )}
                      data-header="header-title"
                    >
                      {post?.title}
                    </H1>
                    {(bylineAuthors || bylineDate) && (
                      <p className="py-1 text-base text-muted-foreground">
                        {bylineAuthors && <>By {bylineAuthors}</>}
                        {bylineAuthors && bylineDate && <> &middot; </>}
                        {bylineDate && (post?.email_only ? `Sent ${bylineDate}` : bylineDate)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {webAnalyticsEnabled && !post?.email_only && (
                      <ReadingNow count={activeVisitors} isLoading={isActiveVisitorsLoading} />
                    )}
                    <PageHeader.ActionGroup>
                      {moreActions}
                      {shareAction}
                    </PageHeader.ActionGroup>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <Navbar
          className={cn(
            '-mb-8 transform-gpu flex-col items-start gap-y-0 border-none py-8 lg:flex-row lg:items-center',
            largeTitles
              ? 'bg-background'
              : 'sticky top-0 z-50 bg-white/70 backdrop-blur-md dark:bg-background',
          )}
        >
          {!isPostLoading && (
            <PageMenu className="min-h-[34px]" value={currentTab} responsive>
              {availableTabs.includes('Overview') && (
                <PageMenuItem
                  value="Overview"
                  onClick={() => {
                    navigate(`/posts/analytics/${postId}`);
                  }}
                >
                  Overview
                </PageMenuItem>
              )}
              {availableTabs.includes('Web') && (
                <PageMenuItem
                  value="Web"
                  onClick={() => {
                    navigate(`/posts/analytics/${postId}/web`);
                  }}
                >
                  Web traffic
                </PageMenuItem>
              )}
              {availableTabs.includes('Newsletter') && (
                <PageMenuItem
                  value="Newsletter"
                  onClick={() => {
                    navigate(`/posts/analytics/${postId}/newsletter`);
                  }}
                >
                  Newsletter
                </PageMenuItem>
              )}
              {availableTabs.includes('Growth') && (
                <PageMenuItem
                  value="Growth"
                  onClick={() => {
                    navigate(`/posts/analytics/${postId}/growth`);
                  }}
                >
                  Growth
                </PageMenuItem>
              )}
            </PageMenu>
          )}
          {children}
        </Navbar>
      </HeaderChrome>

      {canManageGiftLink && postId && (
        <GiftLinkModal
          key={postId}
          open={isGiftLinkOpen}
          postId={postId}
          source="share-modal"
          onOpenChange={setIsGiftLinkOpen}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;re about to delete &quot;<strong>{post?.title}</strong>&quot;. This is
              permanent! We warned you, k?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => void performDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Exploration3PostAnalyticsHeader;
