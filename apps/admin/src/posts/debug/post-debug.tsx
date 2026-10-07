import { useState } from 'react';
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
import {
  LoadingIndicator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TabsTriggerCount,
} from '@tryghost/shade/components';
import { PageHeader } from '@tryghost/shade/patterns';
import { Stack } from '@tryghost/shade/primitives';
import { cn, formatNumber } from '@tryghost/shade/utils';
import { NotFound } from '@/shared/not-found';
import AnalyticsSync from './analytics-sync';
import Batches from './batches';
import Failures from './failures';
import { formatPublishedDate } from './format';
import Overview, { type DebugTab } from './overview';

const PLAIN_COUNT = 'bg-transparent px-0';

function DebugContent({ post }: { post: Post }) {
  const [tab, setTab] = useState<DebugTab>('overview');
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
  const timezone = getSiteTimezone(settings?.settings ?? []);
  const publishedAt = post.published_at ? formatPublishedDate(post.published_at, timezone) : null;
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
    <Stack className="h-full max-w-5xl overflow-auto px-4 pb-10 md:px-8" gap="lg">
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
      {emailQuery.isError && (
        <p role="alert">Could not refresh email status. Showing the last available data.</p>
      )}
      {!emailId || !email ? (
        <p className="text-muted-foreground">No email data for this post.</p>
      ) : (
        <Tabs value={tab} variant="underline" onValueChange={(value) => setTab(value as DebugTab)}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="failures">
              Failures
              {failuresQuery.data && (
                <TabsTriggerCount className={PLAIN_COUNT}>
                  {formatNumber(failures.length)}
                </TabsTriggerCount>
              )}
            </TabsTrigger>
            <TabsTrigger value="batches">
              Batches
              {batchesQuery.data &&
                (failedBatches > 0 ? (
                  <TabsTriggerCount className={cn(PLAIN_COUNT, 'text-destructive')}>
                    {formatNumber(failedBatches)} failed
                  </TabsTriggerCount>
                ) : (
                  <TabsTriggerCount className={PLAIN_COUNT}>
                    {formatNumber(batches.length)}
                  </TabsTriggerCount>
                ))}
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics sync</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Overview
              batches={batchesQuery.data ? batches : null}
              email={email}
              emailId={emailId}
              failures={failuresQuery.data ? failures : null}
              postId={post.id}
              timezone={timezone}
              onOpenTab={setTab}
            />
          </TabsContent>
          <TabsContent value="failures">
            <Failures
              failures={failures}
              isError={failuresQuery.isError}
              isLoading={failuresQuery.isLoading}
            />
          </TabsContent>
          <TabsContent value="batches">
            <Batches
              batches={batches}
              isError={batchesQuery.isError}
              isLoading={batchesQuery.isLoading}
            />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalyticsSync email={email} emailId={emailId} />
          </TabsContent>
        </Tabs>
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
