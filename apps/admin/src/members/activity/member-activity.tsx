import { Fragment, useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
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
import { LucideIcon, formatNumber, getScrollParent } from '@tryghost/shade/utils';
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
import { EventIcon } from '@/members/detail/member-activity-feed';
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
  const selectedEventTypes = eventTypes.filter(({ event }) => !excludedTypes.includes(event));
  const eventFilterLabel =
    selectedEventTypes.length === eventTypes.length
      ? 'All events'
      : selectedEventTypes.length === 1
        ? selectedEventTypes[0].name
        : selectedEventTypes.length === 0
          ? 'No events selected'
          : `${formatNumber(selectedEventTypes.length)} events`;
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
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                          <Link to="/members-activity">Member activity</Link>
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="truncate">
                          {member ? formatMemberName(member) : 'Member'}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                ) : (
                  <PageHeader.Title>Member activity</PageHeader.Title>
                )}
              </PageHeader.Left>
              <PageHeader.Actions className="max-w-full min-w-0">
                <Inline className="max-w-full min-w-0" gap="md" wrap>
                  {!memberId && (
                    <ActivityMemberSearch onSelect={(id) => updateParam('member', id)} />
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-label="Filter events" variant="outline">
                        <LucideIcon.ListFilter className="size-4" />
                        {eventFilterLabel}
                        <LucideIcon.ChevronDown className="size-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="max-h-[70vh] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto"
                    >
                      {eventTypes.map((type, index) => (
                        <Fragment key={type.event}>
                          {index > 0 && type.group !== eventTypes[index - 1].group && (
                            <DropdownMenuSeparator />
                          )}
                          <DropdownMenuCheckboxItem
                            checked={!excludedTypes.includes(type.event)}
                            className="gap-2 pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto"
                            onCheckedChange={() =>
                              updateParam(
                                'excludedEvents',
                                toggleActivityType(type.event, excluded),
                              )
                            }
                            onSelect={(event) => event.preventDefault()}
                          >
                            <EventIcon iconName={type.icon} />
                            {type.name}
                          </DropdownMenuCheckboxItem>
                        </Fragment>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Inline>
              </PageHeader.Actions>
            </PageHeader>
          </ListPage.Header>
          <ListPage.Body>
            {member && (
              <Inline className="py-6" gap="lg">
                <Avatar
                  {...memberAvatarProps(member)}
                  className="size-12 min-w-12 [&_span]:text-lg"
                  src={member.avatar_image}
                />
                <Stack className="min-w-0" gap="none">
                  <h2 className="truncate text-xl font-semibold">{formatMemberName(member)}</h2>
                  {member.name?.trim() && (
                    <p className="truncate text-muted-foreground">{member.email}</p>
                  )}
                  <Link
                    className="mt-0.5 text-sm font-medium hover:underline"
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
                role="alert"
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
                role="alert"
                title="Member not found"
              />
            ) : memberFailed ? (
              <EmptyIndicator
                actions={
                  <Button variant="outline" onClick={() => void memberQuery.refetch()}>
                    Retry
                  </Button>
                }
                role="alert"
                title="Couldn’t load member"
              />
            ) : loading ? (
              <Inline
                aria-label="Loading member activity"
                className="grow py-10"
                justify="center"
                role="status"
              >
                <LoadingIndicator size="lg" />
              </Inline>
            ) : (
              <>
                {events.length > 0 ? (
                  <Box className="shrink-0 overflow-x-auto">
                    <Table aria-label="Member activity" className="text-[13px]">
                      <TableHeader>
                        <TableRow>
                          {!memberId && (
                            <TableHead className="text-[13px]" scope="col">
                              Member
                            </TableHead>
                          )}
                          <TableHead className="text-[13px]" scope="col">
                            Event
                          </TableHead>
                          <TableHead className="text-[13px]" scope="col">
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
                      className="grow"
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
                    role="alert"
                    title={
                      events.length
                        ? 'Couldn’t load more activity'
                        : 'Couldn’t load member activity'
                    }
                  />
                )}
                {feed.isFetchingNextPage && (
                  <Inline
                    aria-label="Loading more activity"
                    className="py-6"
                    justify="center"
                    role="status"
                  >
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
