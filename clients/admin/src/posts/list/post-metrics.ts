import type { PostListItem } from '@/posts/list/hooks/use-posts-list';
import type { PostResource } from '@/posts/list/post-resource';

/**
 * Which metric columns a row shows, and where each links.
 *
 * Two rules are easy to get wrong and invisible unless a site is configured a
 * particular way: **Sent is a fallback**, shown only when neither Opens nor
 * Clicks is; and the email columns need tracking enabled *both* site-wide and
 * on the individual email, because a post sent before the setting changed
 * carries its own flags.
 */

export type PostMetricKey = 'visitors' | 'opens' | 'clicks' | 'sent' | 'members';

export interface PostMetricsSettings {
  webAnalyticsEnabled: boolean;
  membersTrackSources: boolean;
  emailTrackOpens: boolean;
  emailTrackClicks: boolean;
  /** `'none'` means memberships are off, which hides email engagement. */
  membersSignupAccess: string;
  isMembersInviteOnly: boolean;
  isContributor: boolean;
}

export interface PostMetricColumn {
  key: PostMetricKey;
  label: string;
  /** Which analytics tab the column links to. */
  tab: 'web' | 'newsletter' | 'growth';
}

const COLUMNS: Record<PostMetricKey, Omit<PostMetricColumn, 'key'>> = {
  visitors: { label: 'Visitors', tab: 'web' },
  opens: { label: 'Opens', tab: 'newsletter' },
  clicks: { label: 'Clicks', tab: 'newsletter' },
  sent: { label: 'Sent', tab: 'newsletter' },
  members: { label: 'Members', tab: 'growth' },
};

/**
 * A post (never a page) that went out and didn't
 * fail. Gates the *rate* columns; the Sent column has a weaker gate, below.
 */
function hasBeenEmailed(post: PostListItem, resource: PostResource): boolean {
  return (
    resource === 'posts' &&
    (post.status === 'published' || post.status === 'sent') &&
    Boolean(post.email) &&
    post.email?.status !== 'failed'
  );
}

/**
 * `showEmailOpenAnalytics` / `showEmailClickAnalytics`. Tracking must be on
 * both site-wide and on the individual email, because an email sent before the
 * setting changed keeps the flags it went out with.
 */
function showsOpens(
  post: PostListItem,
  settings: PostMetricsSettings,
  resource: PostResource,
): boolean {
  return (
    hasBeenEmailed(post, resource) &&
    !settings.isContributor &&
    settings.membersSignupAccess !== 'none' &&
    settings.emailTrackOpens &&
    post.email?.track_opens === true
  );
}

function showsClicks(
  post: PostListItem,
  settings: PostMetricsSettings,
  resource: PostResource,
): boolean {
  return (
    hasBeenEmailed(post, resource) &&
    !settings.isContributor &&
    settings.membersSignupAccess !== 'none' &&
    settings.emailTrackClicks &&
    post.email?.track_clicks === true
  );
}

/** `showAttributionAnalytics`. Note this is *not* the Members column's gate. */
function showsAttribution(
  post: PostListItem,
  settings: PostMetricsSettings,
  resource: PostResource,
): boolean {
  return (
    (resource === 'pages' || !post.email_only) &&
    post.status === 'published' &&
    settings.membersTrackSources &&
    !settings.isMembersInviteOnly &&
    !settings.isContributor
  );
}

/**
 * Which columns a row shows.
 *
 * These conditions are **not** the `shows*` predicates above: two of the
 * columns render under weaker conditions than the predicates that gate the
 * trailing button, and collapsing the two loses real columns:
 *
 * - the Members column asks only "is source tracking on and is this
 *   published?", so an invite-only site still gets it;
 * - the email block renders whenever the post has an `email` at all, so a
 *   *failed* send still shows its Sent count.
 */
export function getPostMetricColumns(
  post: PostListItem,
  settings: PostMetricsSettings,
  resource: PostResource,
): PostMetricColumn[] {
  const keys: PostMetricKey[] = [];
  const isPublished = post.status === 'published';

  if (settings.webAnalyticsEnabled && isPublished) {
    keys.push('visitors');
  }

  if (post.email) {
    const opens = showsOpens(post, settings, resource);
    const clicks = showsClicks(post, settings, resource);

    if (opens) {
      keys.push('opens');
    }

    if (clicks) {
      keys.push('clicks');
    }

    // Fallback only — the raw count stands in when neither rate is shown.
    if (!opens && !clicks) {
      keys.push('sent');
    }
  }

  if (settings.membersTrackSources && isPublished) {
    keys.push('members');
  }

  return keys.map((key) => ({ key, ...COLUMNS[key] }));
}

export function getPostClickRate(post: PostListItem): number {
  const sent = post.email?.email_count;
  const clicks = post.count?.clicks;

  if (!sent || !clicks) {
    return 0;
  }

  return Math.round((clicks / sent) * 100);
}

export function getPostOpenRate(post: PostListItem): number {
  const sent = post.email?.email_count;
  const opened = post.email?.opened_count;

  if (!sent || !opened) {
    return 0;
  }

  return Math.round((opened / sent) * 100);
}

/**
 * Whether the row's trailing button goes to the post's analytics screen.
 *
 * Note what it is *not*: web analytics ("Visitors") does not count. A post can
 * show a Visitors column and still have no analytics page — the button falls
 * back to the editor. Pages never have one.
 */
export function hasPostAnalyticsPage(
  post: PostListItem,
  settings: PostMetricsSettings,
  resource: PostResource,
  isAdmin: boolean,
): boolean {
  if (resource !== 'posts' || !isAdmin) {
    return false;
  }

  return (
    showsOpens(post, settings, resource) ||
    showsClicks(post, settings, resource) ||
    showsAttribution(post, settings, resource)
  );
}
