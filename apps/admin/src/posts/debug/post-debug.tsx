import { useState } from 'react';
import { Navigate, useParams } from '@tryghost/admin-x-framework';
import { useBrowsePosts } from '@tryghost/admin-x-framework/api/posts';
import type { Post } from '@tryghost/admin-x-framework/api/content-types';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isAuthorOrContributor, isContributorUser } from '@tryghost/admin-x-framework/api/users';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import {
  type EmailDebugBatch,
  type EmailRecipientFailure,
  useEmail,
  useEmailDebugBatches,
  useEmailRecipientFailures,
} from '@tryghost/admin-x-framework/api/emails';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  LoadingIndicator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@tryghost/shade/components';
import { PageHeader } from '@tryghost/shade/patterns';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { NotFound } from '@/shared/not-found';
import Overview from './overview';
import { formatDebugDate, formatPublishedDate, statusLabel } from './format';

function FailureMessage({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Stack gap="xs">
      <p className={expanded ? 'break-words whitespace-pre-wrap' : 'line-clamp-2 break-words'}>
        {message}
      </p>
      {message && (
        <Button
          aria-expanded={expanded}
          className="self-start"
          size="sm"
          variant="ghost"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : 'Show full error'}
        </Button>
      )}
    </Stack>
  );
}

function Failures({
  failures,
  severity,
}: {
  failures: EmailRecipientFailure[];
  severity: 'temporary' | 'permanent';
}) {
  if (!failures.length) {
    return <p className="py-10 text-center text-muted-foreground">No {severity} failures.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recipient</TableHead>
          <TableHead>Failure</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {failures.map((failure) => {
          const name = failure.email_recipient?.member_name || '';
          const email = failure.email_recipient?.member_email || '';
          const initials = (name || email || 'U')
            .split(' ')
            .filter(Boolean)
            .map((part) => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
          const recipient = (
            <Inline gap="md">
              <Avatar>
                <AvatarImage src={failure.member?.avatar_image || undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <Stack gap="none">
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground">{email}</span>
              </Stack>
            </Inline>
          );
          return (
            <TableRow key={failure.id}>
              <TableCell className="align-top">
                {failure.member?.id ? (
                  <a href={`#/members/${failure.member.id}`}>{recipient}</a>
                ) : (
                  recipient
                )}
              </TableCell>
              <TableCell className="max-w-xl align-top whitespace-normal">
                <Stack gap="sm">
                  <Inline gap="lg" wrap>
                    <span>Failure code: {failure.code}</span>
                    {failure.enhanced_code && <span>Enhanced code: {failure.enhanced_code}</span>}
                  </Inline>
                  <FailureMessage message={failure.message} />
                </Stack>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function Batches({ batches }: { batches: EmailDebugBatch[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {['Status', 'Created', 'Segment', 'Recipients', 'Details'].map((label) => (
            <TableHead key={label}>{label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((batch) => (
          <TableRow key={batch.id}>
            <TableCell className={batch.status === 'failed' ? 'text-destructive' : ''}>
              {statusLabel(batch.status)}
            </TableCell>
            <TableCell>{formatDebugDate(batch.created_at)}</TableCell>
            <TableCell className="max-w-xs break-words whitespace-normal">
              {batch.member_segment || 'N/A'}
            </TableCell>
            <TableCell>{formatNumber(batch.count?.recipients ?? 0)}</TableCell>
            <TableCell className="max-w-xl break-words whitespace-normal">
              <Stack gap="sm">
                {batch.mailgun_message_id && (
                  <span>
                    Provider id: <code>{batch.mailgun_message_id}</code>
                  </span>
                )}
                {!!batch.error_status_code && (
                  <span>Failure status code: {batch.error_status_code}</span>
                )}
                {batch.error_message && <FailureMessage message={batch.error_message} />}
                {!batch.mailgun_message_id &&
                  !batch.error_status_code &&
                  !batch.error_message &&
                  'N/A'}
              </Stack>
            </TableCell>
          </TableRow>
        ))}
        {!batches.length && (
          <TableRow>
            <TableCell className="py-10 text-center text-muted-foreground" colSpan={5}>
              No batch data.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

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
  const permanent = failures.filter((failure) => failure.severity === 'permanent');
  const temporary = failures.filter((failure) => failure.severity === 'temporary');
  const failedBatches = batches.filter((batch) => batch.status === 'failed').length;
  const publishedAt = post.published_at
    ? formatPublishedDate(post.published_at, getSiteTimezone(settings?.settings ?? []))
    : null;
  const sent =
    Boolean(email) &&
    (post.status === 'published' || post.status === 'sent') &&
    email?.status !== 'failed';
  const publication = sent
    ? post.status === 'sent'
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
        <Tabs defaultValue="permanent">
          <TabsList className="mb-6 h-auto flex-wrap">
            <TabsTrigger value="permanent">
              {formatNumber(permanent.length)} Permanent{' '}
              {permanent.length === 1 ? 'failure' : 'failures'}
            </TabsTrigger>
            <TabsTrigger value="temporary">
              {formatNumber(temporary.length)} Temporary{' '}
              {temporary.length === 1 ? 'failure' : 'failures'}
            </TabsTrigger>
            <TabsTrigger value="batches">
              {formatNumber(failedBatches)} {failedBatches === 1 ? 'batch' : 'batches'} errored
            </TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>
          {(['permanent', 'temporary'] as const).map((severity) => (
            <TabsContent key={severity} value={severity}>
              {failuresQuery.isLoading ? (
                <LoadingIndicator size="lg" />
              ) : failuresQuery.isError ? (
                <p role="alert">Could not load recipient failures.</p>
              ) : (
                <Failures
                  failures={severity === 'permanent' ? permanent : temporary}
                  severity={severity}
                />
              )}
            </TabsContent>
          ))}
          <TabsContent value="batches">
            {batchesQuery.isLoading ? (
              <LoadingIndicator size="lg" />
            ) : batchesQuery.isError ? (
              <p role="alert">Could not load email batches.</p>
            ) : (
              <Batches batches={batches} />
            )}
          </TabsContent>
          <TabsContent className="data-[state=inactive]:hidden" value="overview" forceMount>
            <Overview email={email} emailId={emailId} />
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
