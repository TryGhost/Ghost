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
  rowSurfaceClasses,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon, cn, formatDisplayDate, formatNumber } from '@tryghost/shade/utils';
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
    <TableRow className={rowSurfaceClasses.inset} data-testid="segment-list-row">
      <TableHead
        className="static h-auto max-w-0 py-3 text-left text-base font-normal tracking-normal text-foreground"
        scope="row"
      >
        <RowPrimaryAction asChild>
          {/* The row's click area is drawn from this button and reaches 16px past each side
              of the row. Shade's inset variant is meant to pull it in, but its rule is less
              specific than the one it overrides, so it has no effect on the click area. Pulled
              in here, or the box scrolls sideways. */}
          <button
            className="block max-w-full truncate rounded-sm text-left text-md font-semibold after:inset-x-0! focus-visible:outline-hidden"
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
          <Inline className="py-10" justify="center">
            <EmptyIndicator
              actions={
                onNewSegment && (
                  <Button onClick={leaveTo(onNewSegment)}>Create a new segment</Button>
                )
              }
              description="Filter your members and save the result as a segment."
              title="Start segmenting your audience"
            >
              <LucideIcon.ChartPie />
            </EmptyIndicator>
          </Inline>
        ) : (
          // Each row keeps its highlight inside itself: a scrolling box has no gutter for it,
          // and a highlight reaching past the rows would make the box scroll sideways. The
          // class goes on the rows themselves. It isn't a utility a parent can apply.
          <div className="max-h-[60vh] overflow-y-auto">
            <Table aria-label="Segments" className="table-fixed" data-testid="segments-list">
              <TableHeader>
                <TableRow className={cn(rowSurfaceClasses.inset, 'hover:bg-transparent')}>
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
