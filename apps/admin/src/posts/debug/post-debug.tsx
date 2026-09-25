import { Navigate, useParams } from '@tryghost/admin-x-framework';
import { useBrowsePosts } from '@tryghost/admin-x-framework/api/posts';
import type { Post } from '@tryghost/admin-x-framework/api/content-types';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isAuthorOrContributor, isContributorUser } from '@tryghost/admin-x-framework/api/users';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import {
  useEmail,
  useEmailDebugBatches,
  useEmailRecipientFailures,
} from '@tryghost/admin-x-framework/api/emails';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { PageHeader } from '@tryghost/shade/patterns';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { NotFound } from '@/shared/not-found';
import AnalyticsSync from './analytics-sync';
import { formatPublishedDate } from './format';
import Problems from './problems';
import Summary from './summary';

function DebugContent({ post }: { post: Post }) {
  const emailId = post.email?.id ?? '';
  const emailQuery = useEmail(emailId, {
    enabled: !!emailId,
    refetchInterval: 10000,
    retry: false,
    defaultErrorHandler: false,
  });
  const batchesQuery = useEmailDebugBatches(emailId, {
    enabled: !!emailId,
    defaultErrorHandler: false,
  });
  const failuresQuery = useEmailRecipientFailures(emailId, {
    enabled: !!emailId,
    defaultErrorHandler: false,
  });
  const { data: settings } = useBrowseSettings();
  const email = emailQuery.data?.emails[0] ?? post.email;
  const batches = batchesQuery.data?.batches ?? [];
  const failures = failuresQuery.data?.failures ?? [];
  const failedBatches = batches.filter((batch) => batch.status === 'failed').length;
  const publishedAt = post.published_at
    ? formatPublishedDate(post.published_at, getSiteTimezone(settings?.settings ?? []))
    : null;
  const sent =
    Boolean(email) &&
    (post.status === 'published' || post.status === 'sent') &&
    email?.status !== 'failed';
  const publication = sent
    ? post.email_only
      ? 'Sent'
      : 'Published and sent'
    : email?.status === 'failed'
      ? 'Published but failed to send'
      : 'Published on your site';

  return (
    <Stack className="h-full overflow-auto px-4 pb-10 md:px-8" gap="xl">
      <PageHeader className="pt-7" sticky={false}>
        <PageHeader.Left>
          <PageHeader.Breadcrumb>
            <a href="#/posts">Posts</a>
            <span aria-hidden="true">/</span>
            <a href={`#/posts/analytics/${post.id}`}>Analytics</a>
            <span aria-hidden="true">/</span>
            <span>Debug</span>
          </PageHeader.Breadcrumb>
          <PageHeader.Title className="whitespace-normal">
            {post.title || '(Untitled)'}
          </PageHeader.Title>
          {publishedAt && (
            <PageHeader.Meta>
              {publication} on {publishedAt}
            </PageHeader.Meta>
          )}
        </PageHeader.Left>
      </PageHeader>
      {email?.status === 'failed' && (
        <Inline className="rounded-md border border-destructive p-4" gap="lg" role="alert">
          <Stack className="grow" gap="sm">
            <p className="font-semibold text-destructive">
              {email.error || 'Failed to send email.'}
            </p>
            {batchesQuery.data && batches.length > 0 && (
              <p>
                {formatNumber(failedBatches)} of {formatNumber(batches.length)}{' '}
                {batches.length === 1 ? 'batch' : 'batches'} failed to send, check below for more
                details.
              </p>
            )}
          </Stack>
          <Button variant="outline" asChild>
            <a href={`#/editor/post/${post.id}`}>Retry</a>
          </Button>
        </Inline>
      )}
      {emailQuery.isError && (
        <p role="alert">Could not refresh email status. Showing the last available data.</p>
      )}
      {!emailId || !email ? (
        <p className="text-muted-foreground">No email data for this post.</p>
      ) : (
        <>
          <Summary email={email} />
          <Stack gap="md">
            <Text as="h2" size="lg" weight="semibold">
              Failures
            </Text>
            <Problems
              batches={batches}
              batchesState={batchesQuery}
              failures={failures}
              failuresState={failuresQuery}
            />
          </Stack>
          <AnalyticsSync email={email} emailId={emailId} />
        </>
      )}
    </Stack>
  );
}

export default function PostDebug() {
  const { postId } = useParams();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data, isLoading, isError } = useBrowsePosts({
    searchParams: {
      filter: `id:${postId}`,
      include: 'tags,authors,authors.roles,email,tiers,newsletter',
    },
    defaultErrorHandler: false,
  });
  const post = data?.posts[0];
  if (isLoading || userLoading) {
    return <LoadingIndicator size="lg" />;
  }
  if (isError || !user) {
    return <p role="alert">Could not load this post.</p>;
  }
  if (!post) {
    return <NotFound />;
  }
  if (
    (isAuthorOrContributor(user) && !post.authors?.some((author) => author.id === user.id)) ||
    (isContributorUser(user) && post.status !== 'draft')
  ) {
    return <Navigate to="/posts" replace />;
  }
  return <DebugContent key={post.id} post={post} />;
}
