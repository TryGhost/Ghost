import { Fragment, useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyIndicator,
  LoadingIndicator,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { Box, Container, Inline, Stack } from '@tryghost/shade/primitives';
import { ListPage } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { LucideIcon, cn, getScrollParent } from '@tryghost/shade/utils';
import { Link, useSearchParams } from '@tryghost/admin-x-framework';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { useBrowseMemberActivityFeed, useMember } from '@tryghost/admin-x-framework/api/members';
import { useBrowseNewsletters } from '@tryghost/admin-x-framework/api/newsletters';
import { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { formatMemberName, memberAvatarProps } from '@/members/member-format';
import { parseActivityEvent } from './activity-event';
import ActivityEmailPreview from './activity-email-preview';
import ActivityMemberSearch from './activity-member-search';
import ActivityRow from './activity-row';
import {
  availableActivityTypes,
  activityQueryOptions,
  excludedActivityEvents,
  toggleActivityType,
} from './activity-filters';

function ActivityPage() {
  const [params, setParams] = useSearchParams();
  const memberId = params.get('member') || undefined;
  const excluded = params.get('excludedEvents');
  const [previewEmail, setPreviewEmail] = useState<unknown>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const settingsQuery = useBrowseSettings({ defaultErrorHandler: false });
  const settings = settingsQuery.data?.settings ?? [];
  const activitySettings = {
    editorDefaultEmailRecipients:
      getSettingValue<string>(settings, 'editor_default_email_recipients') ?? undefined,
    commentsEnabled: getSettingValue<string>(settings, 'comments_enabled') ?? undefined,
    emailTrackClicks: getSettingValue<boolean>(settings, 'email_track_clicks') ?? undefined,
  };
  const paidMembersEnabled = getSettingValue<boolean>(settings, 'paid_members_enabled') ?? false;
  const memberQuery = useMember(memberId ?? '', {
    enabled: !!memberId,
    defaultErrorHandler: false,
  });
  const member = memberQuery.data?.members[0];
  const memberMissing =
    !!memberId &&
    ((memberQuery.error instanceof APIError && memberQuery.error.response?.status === 404) ||
      (memberQuery.isSuccess && !member));
  const memberFailed = !!memberId && memberQuery.isError && !memberMissing;
  const newslettersQuery = useBrowseNewsletters({
    searchParams: { filter: 'status:active', limit: '1' },
  });
  const tiersQuery = useBrowseTiers({
    searchParams: { filter: 'type:paid+active:true', limit: 'all' },
    enabled: paidMembersEnabled,
  });
  const feed = useBrowseMemberActivityFeed({
    ...activityQueryOptions({ settings: activitySettings, memberId, excluded }),
    enabled: !!settingsQuery.data && !settingsQuery.isError && (!memberId || !!member),
    defaultErrorHandler: false,
  });
  const events = feed.data?.events ?? [];
  const eventTypes = availableActivityTypes(activitySettings, memberId);
  const excludedTypes = excludedActivityEvents(excluded);
  const loading =
    settingsQuery.isLoading || (!!memberId && memberQuery.isLoading) || feed.isLoading;

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setParams(next);
  };

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !feed.hasNextPage || feed.isFetching || feed.isError) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void feed.fetchNextPage();
        }
      },
      { root: getScrollParent(element), rootMargin: '250px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [feed.hasNextPage, feed.isFetching, feed.isError, feed.fetchNextPage]);

  const hasFilter = !!memberId || excludedTypes.length > 0;

  return (
    <Box className="size-full">
      <Container className="relative h-full" size="page">
        <ListPage data-testid="member-activity-page">
          <ListPage.Header>
            <PageHeader blurredBackground={false} sticky={false}>
              <PageHeader.Left>
                {memberId ? (
                  <PageHeader.Breadcrumb>
                    <Link className="hover:underline" to="/members-activity">
                      Member activity
                    </Link>
                    <LucideIcon.ChevronRight className="size-4" />
                    <span>{member ? formatMemberName(member) : 'Member'}</span>
                  </PageHeader.Breadcrumb>
                ) : (
                  <PageHeader.Title>Member activity</PageHeader.Title>
                )}
              </PageHeader.Left>
              <PageHeader.Actions className="max-w-full min-w-0">
                <Inline gap="lg" wrap>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className={cn(excludedTypes.length > 0 && 'bg-interactive-hover')}
                        variant="outline"
                      >
                        <LucideIcon.ListFilter className="size-4" />
                        Filter events
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto">
                      {eventTypes.map((type, index) => (
                        <Fragment key={type.event}>
                          {index > 0 && type.group !== eventTypes[index - 1].group && (
                            <DropdownMenuSeparator />
                          )}
                          <DropdownMenuCheckboxItem
                            checked={!excludedTypes.includes(type.event)}
                            onCheckedChange={() =>
                              updateParam(
                                'excludedEvents',
                                toggleActivityType(type.event, excluded),
                              )
                            }
                            onSelect={(event) => event.preventDefault()}
                          >
                            {type.name}
                          </DropdownMenuCheckboxItem>
                        </Fragment>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {memberId ? (
                    <Button variant="outline" onClick={() => updateParam('member')}>
                      Clear member <LucideIcon.X className="size-4" />
                    </Button>
                  ) : (
                    <ActivityMemberSearch onSelect={(id) => updateParam('member', id)} />
                  )}
                </Inline>
              </PageHeader.Actions>
            </PageHeader>
          </ListPage.Header>
          <ListPage.Body>
            {member && (
              <Inline className="py-6" gap="lg">
                <Avatar
                  {...memberAvatarProps(member)}
                  className="size-16"
                  src={member.avatar_image}
                />
                <Stack className="min-w-0" gap="xs">
                  <h2 className="truncate text-xl font-semibold">{formatMemberName(member)}</h2>
                  {member.name?.trim() && (
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  )}
                  <Link
                    className="text-sm font-medium hover:underline"
                    to={`/members/${encodeURIComponent(member.id)}`}
                  >
                    View member profile →
                  </Link>
                </Stack>
              </Inline>
            )}
            {settingsQuery.isError ? (
              <EmptyIndicator
                actions={
                  <Button variant="outline" onClick={() => void settingsQuery.refetch()}>
                    Retry
                  </Button>
                }
                title="Couldn’t load activity settings"
              />
            ) : memberMissing ? (
              <EmptyIndicator
                actions={
                  <Button variant="outline" onClick={() => updateParam('member')}>
                    Clear member
                  </Button>
                }
                description="This member may have been deleted."
                title="Member not found"
              />
            ) : memberFailed ? (
              <EmptyIndicator
                actions={
                  <Button variant="outline" onClick={() => void memberQuery.refetch()}>
                    Retry
                  </Button>
                }
                title="Couldn’t load member"
              />
            ) : loading ? (
              <Inline className="grow py-10" justify="center">
                <LoadingIndicator size="lg" />
              </Inline>
            ) : (
              <>
                {events.length > 0 ? (
                  <Box className="shrink-0 overflow-x-auto">
                    <Table aria-label="Member activity">
                      <TableHeader>
                        <TableRow>
                          {!memberId && <TableHead scope="col">Member</TableHead>}
                          <TableHead scope="col">Event</TableHead>
                          <TableHead className="text-right" scope="col">
                            Time
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.map((raw, index) => {
                          const event = parseActivityEvent(raw, {
                            hasMultipleNewsletters:
                              newslettersQuery.isError ||
                              (newslettersQuery.data?.meta?.pagination.total ?? 0) > 1,
                            hasMultipleTiers: (tiersQuery.data?.tiers.length ?? 0) > 1,
                            paidMembersEnabled,
                          });
                          const memberParams = new URLSearchParams(params);
                          if (event.member?.id) {
                            memberParams.set('member', event.member.id);
                          }
                          return (
                            <ActivityRow
                              key={`${raw.type}:${event.id ?? index}`}
                              event={event}
                              hideMember={!!memberId}
                              memberHref={
                                event.member?.id ? `/members-activity?${memberParams}` : undefined
                              }
                              onPreview={setPreviewEmail}
                            />
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                ) : (
                  !feed.isError && (
                    <EmptyIndicator
                      actions={
                        hasFilter ? (
                          <Button variant="outline" asChild>
                            <Link to="/members-activity">Show all activity</Link>
                          </Button>
                        ) : undefined
                      }
                      title={
                        hasFilter
                          ? 'No activities match the current filter'
                          : 'No member activity yet'
                      }
                    >
                      <LucideIcon.Activity />
                    </EmptyIndicator>
                  )
                )}
                {feed.isError && (
                  <EmptyIndicator
                    actions={
                      <Button
                        variant="outline"
                        onClick={() =>
                          void (feed.isFetchNextPageError ? feed.fetchNextPage() : feed.refetch())
                        }
                      >
                        Retry
                      </Button>
                    }
                    title={
                      events.length
                        ? 'Couldn’t load more activity'
                        : 'Couldn’t load member activity'
                    }
                  />
                )}
                {feed.isFetchingNextPage && (
                  <Inline className="py-6" justify="center">
                    <LoadingIndicator size="md" />
                  </Inline>
                )}
                <Box ref={sentinel} className="h-px" />
              </>
            )}
          </ListPage.Body>
        </ListPage>
      </Container>
      {!!previewEmail && (
        <ActivityEmailPreview email={previewEmail} onClose={() => setPreviewEmail(null)} />
      )}
    </Box>
  );
}

export default ActivityPage;
