import { useCanChangeMemberViews, useMemberViews } from '@/members/hooks/use-member-views';
import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { LucideIcon, formatDisplayDate, formatNumber } from '@tryghost/shade/utils';
import { SegmentMenu } from './segment-menu';
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
  onOpen: () => void;
}

function SegmentRow({ segment, facts, timezone, canChange, onOpen }: SegmentRowProps) {
  return (
    <TableRow data-testid="segment-list-row">
      <TableHead
        className="static h-auto max-w-0 py-3 text-left text-base font-normal tracking-normal text-foreground"
        scope="row"
      >
        <RowPrimaryAction asChild>
          <button
            className="block max-w-full truncate rounded-sm text-left text-md font-semibold focus-visible:outline-hidden"
            type="button"
            onClick={onOpen}
          >
            {segment.name}
          </button>
        </RowPrimaryAction>
      </TableHead>
      <TableCell className="w-24 tabular-nums">
        <MemberCount filter={segment.filter} />
      </TableCell>
      <TableCell className="w-44">
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
        <TableCell className="w-14 text-right">
          <SegmentMenu
            leadingItems={
              <DropdownMenuItem onSelect={onOpen}>
                <LucideIcon.Users className="size-4" />
                View members
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

interface ManageSegmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shows a segment's members, after the dialog closes. */
  onOpenSegment: (segment: Segment) => void;
  /** Starts a new segment, after the dialog closes. Left out for staff who can't change segments. */
  onNewSegment?: () => void;
}

/**
 * Every segment at once, from the members screen's menu: how many members each has, who made it
 * and when, and its menu to rename, pin or delete it. The members screen shows one segment at a
 * time. This is where they are looked over together and tidied up, without a screen of its own.
 */
export function ManageSegmentsDialog({
  open,
  onOpenChange,
  onOpenSegment,
  onNewSegment,
}: ManageSegmentsDialogProps) {
  const segments = useMemberViews();
  const canChange = useCanChangeMemberViews();
  const factsOf = useSegmentFacts(segments);
  const { data: settingsData } = useBrowseSettings({});
  const timezone = getSiteTimezone(settingsData?.settings ?? []);

  const leaveTo = (action: () => void) => () => {
    onOpenChange(false);
    action();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" data-testid="manage-segments-dialog">
        <DialogHeader>
          <DialogTitle>Segments</DialogTitle>
        </DialogHeader>
        {segments.length === 0 ? (
          <div className="flex justify-center py-10">
            <EmptyIndicator
              actions={
                onNewSegment && (
                  <Button onClick={leaveTo(onNewSegment)}>Create a new segment</Button>
                )
              }
              description="Group members to email them a post or start an automation."
              title="Start segmenting your audience"
            >
              <LucideIcon.ChartPie />
            </EmptyIndicator>
          </div>
        ) : (
          // The rows keep their highlight inside themselves: a scrolling box has no gutter for it.
          <div className="max-h-[60vh] overflow-y-auto">
            <Table
              aria-label="Segments"
              className="[&_.shade-row]:shade-row-inset table-fixed"
              data-testid="segments-list"
            >
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">Segment</TableHead>
                  <TableHead className="w-24" scope="col">
                    Members
                  </TableHead>
                  <TableHead className="w-44" scope="col">
                    Created
                  </TableHead>
                  {canChange && (
                    <TableHead className="w-14" scope="col">
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
                    onOpen={leaveTo(() => onOpenSegment(segment))}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
