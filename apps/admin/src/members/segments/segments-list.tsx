import { useCanChangeMemberViews, useMemberViews } from '@/members/hooks/use-member-views';
import { Link } from '@tryghost/admin-x-framework';
import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import {
  Button,
  DropdownMenuItem,
  EmptyIndicator,
  RowPrimaryAction,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { ListPage } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { Box, Container } from '@tryghost/shade/primitives';
import { LucideIcon, formatDisplayDate, formatNumber } from '@tryghost/shade/utils';
import { useState } from 'react';
import { PocEmptySegmentsToggle } from './poc-empty-toggle';
import { SegmentBuilderDialog } from './segment-builder';
import { SegmentMenu } from './segment-menu';
import { buildSegmentUrl } from './segment-route';
import { type SegmentFacts, useSegmentFacts } from './use-segment-facts';

const NONE = <span className="text-muted-foreground">—</span>;

function MemberCount({ filter }: { filter: string }) {
  const { count, isLoading } = useMembersCount(filter);

  if (isLoading) {
    return <Skeleton className="h-3 w-10" />;
  }

  return count === null ? NONE : <>{formatNumber(count)}</>;
}

interface SegmentRowProps {
  segment: Segment;
  facts: SegmentFacts;
  timezone: string;
  canChange: boolean;
}

function SegmentRow({ segment, facts, timezone, canChange }: SegmentRowProps) {
  const membersUrl = buildSegmentUrl(segment);

  return (
    <TableRow data-testid="segment-list-row">
      <TableHead
        className="static h-auto max-w-0 py-4 text-left text-base font-normal tracking-normal text-foreground"
        scope="row"
      >
        <RowPrimaryAction asChild>
          <Link className="rounded-sm focus-visible:outline-hidden" to={membersUrl}>
            <span className="block truncate text-md font-semibold">{segment.name}</span>
          </Link>
        </RowPrimaryAction>
      </TableHead>
      <TableCell className="w-28 tabular-nums">
        <MemberCount filter={segment.filter} />
      </TableCell>
      <TableCell className="w-48">
        {facts.createdAt ? (
          <>
            <span className="block">{formatDisplayDate(facts.createdAt, timezone)}</span>
            {facts.createdBy && (
              <span className="block truncate text-sm text-muted-foreground">
                by {facts.createdBy}
              </span>
            )}
          </>
        ) : (
          NONE
        )}
      </TableCell>
      {canChange && (
        <TableCell className="w-16 text-right">
          <SegmentMenu
            leadingItems={
              <DropdownMenuItem asChild>
                <Link to={membersUrl}>
                  <LucideIcon.Users className="size-4" />
                  View members
                </Link>
              </DropdownMenuItem>
            }
            segment={segment}
          >
            <Button
              aria-label={`Actions for ${segment.name}`}
              className="border border-control-border shadow-none enabled:active:shadow-none enabled:aria-expanded:shadow-none"
              variant="outline"
              data-row-secondary
            >
              <LucideIcon.MoreHorizontal />
            </Button>
          </SegmentMenu>
        </TableCell>
      )}
    </TableRow>
  );
}

/**
 * Every segment, to manage them: how many members each has, and who made it and when. What
 * uses a segment is said when it is about to be changed or deleted, not here. Opening one shows
 * its members on the members screen, which is also where one segment is switched for another.
 */
const SegmentsList: React.FC = () => {
  const segments = useMemberViews();
  const canChange = useCanChangeMemberViews();
  const factsOf = useSegmentFacts(segments);
  const { data: settingsData } = useBrowseSettings({});
  const timezone = getSiteTimezone(settingsData?.settings ?? []);
  const [newSegmentOpen, setNewSegmentOpen] = useState(false);

  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <ListPage data-testid="segments-page">
          <ListPage.Header>
            <PageHeader blurredBackground={false} sticky={false}>
              <PageHeader.Left>
                <PageHeader.Title>Segments</PageHeader.Title>
              </PageHeader.Left>
              {canChange && (
                <PageHeader.Actions>
                  <PageHeader.ActionGroup>
                    <PageHeader.ActionGroup.Primary>
                      <PageHeader.Action
                        label="New segment"
                        onClick={() => setNewSegmentOpen(true)}
                      >
                        <LucideIcon.Plus />
                        New segment
                      </PageHeader.Action>
                    </PageHeader.ActionGroup.Primary>
                  </PageHeader.ActionGroup>
                </PageHeader.Actions>
              )}
            </PageHeader>
          </ListPage.Header>
          <ListPage.Body>
            {segments.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-16">
                <EmptyIndicator
                  actions={
                    canChange && (
                      <Button onClick={() => setNewSegmentOpen(true)}>Create a new segment</Button>
                    )
                  }
                  description="Group members to email them a post or start an automation."
                  title="Start segmenting your audience"
                >
                  <LucideIcon.ChartPie />
                </EmptyIndicator>
              </div>
            ) : (
              <Table aria-label="Segments" data-testid="segments-list">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead scope="col">Segment</TableHead>
                    <TableHead className="w-28" scope="col">
                      Members
                    </TableHead>
                    <TableHead className="w-48" scope="col">
                      Created
                    </TableHead>
                    {canChange && (
                      <TableHead className="w-16" scope="col">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segments.map((segment) => (
                    <SegmentRow
                      key={segment.id}
                      canChange={canChange}
                      facts={factsOf(segment.id)}
                      segment={segment}
                      timezone={timezone}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </ListPage.Body>
        </ListPage>
        {newSegmentOpen && <SegmentBuilderDialog open withPin onOpenChange={setNewSegmentOpen} />}
        <PocEmptySegmentsToggle />
      </Container>
    </Box>
  );
};

export default SegmentsList;
