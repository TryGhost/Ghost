import { useNavigate } from '@tryghost/admin-x-framework';
import { useMemberCount } from '@tryghost/admin-x-framework/api/members';
import { type Segment, useEditSegment } from '@tryghost/admin-x-framework/api/segments';
import { Popover, PopoverContent, PopoverTrigger } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { useRef, useState } from 'react';
import { useSegmentUsage } from './poc-store';
import { DeleteSegmentDialog } from './segment-dialogs';
import { SegmentList } from './segment-list';
import { buildSegmentUrl } from './segment-route';
import { segmentWriteFailure } from './segment-write-failure';

interface SegmentSwitcherProps {
  segments: Segment[];
  /** The segment the members screen is showing, or null for every member. */
  current: Segment | null;
  /** Starts a new segment. Left out for staff who can't change segments. */
  onNewSegment?: () => void;
  /**
   * Leaves the segment shown, after it is deleted. Given, each segment in the list can be
   * renamed and deleted. Left out for staff who can't change segments.
   */
  onCurrentDeleted?: () => void;
}

/**
 * The members screen's title, as the way between segments: it names what the screen is showing
 * and opens the list of segments to switch to, so moving from one to another never leaves the
 * page. The list is the one the segment picker opens, with every member as its first choice.
 *
 * Segments are also renamed and deleted here, as labels are in the label picker: hovering a row
 * shows a pencil, which turns the row into its name, with Delete, Cancel and Save. What is done
 * to a segment itself starts from the list that names it. The filter bar keeps what changes the
 * conditions: saving and resetting changed filters.
 */
export function SegmentSwitcher({
  segments,
  current,
  onNewSegment,
  onCurrentDeleted,
}: SegmentSwitcherProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Segment | null>(null);
  const allMembers = useMemberCount();
  const { usageOf } = useSegmentUsage();
  const { mutateAsync: editSegment } = useEditSegment();
  // Closing hands focus back to the title. "New segment" opens the filter control or the name
  // form, which take focus themselves and close when it is taken from them.
  const keepFocusWhereItGoes = useRef(false);
  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };
  const canEdit = Boolean(onCurrentDeleted);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {/* A plain button, not Shade's: it is part of the page title, and has to take the
              title's own type in both designs. Shade's button sets its own size and weight, which
              under the Admin 7 design shrank the large title to button text. The chevron carries
              empty space of its own on each side, so the right padding is the smaller for the two
              sides to look alike, and it is sized from the title so it grows with a large one.
              The button gives back its padding on both sides, so what is around the title sits
              where it would beside a plain title. */}
          <button
            className="-mr-1.5 -ml-2.5 inline-flex max-w-full cursor-pointer items-center gap-1 rounded-full py-0.5 pr-1.5 pl-2.5 align-baseline outline-hidden hover:bg-accent focus-visible:ring-2 focus-visible:ring-focus-ring data-[state=open]:bg-accent"
            data-testid="segment-switcher"
            type="button"
          >
            <span className="truncate">{current ? current.name : 'Members'}</span>
            <LucideIcon.ChevronDown className="size-[0.8em] min-h-4 min-w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-72 p-0 font-normal tracking-normal"
          collisionPadding={16}
          onCloseAutoFocus={(event) => {
            if (keepFocusWhereItGoes.current) {
              keepFocusWhereItGoes.current = false;
              event.preventDefault();
            }
          }}
        >
          <SegmentList
            describeRenameError={(error) => segmentWriteFailure(error, 'edit')}
            leading={{
              label: 'All members',
              count: allMembers,
              selected: !current,
              onSelect: () => go('/members'),
            }}
            segments={segments}
            selectedId={current?.id}
            onDeleteRequest={
              canEdit
                ? (segment) => {
                    setOpen(false);
                    setDeleting(segment);
                  }
                : undefined
            }
            onNewSegment={
              onNewSegment
                ? () => {
                    keepFocusWhereItGoes.current = true;
                    setOpen(false);
                    onNewSegment();
                  }
                : undefined
            }
            onRename={
              canEdit
                ? async (segment, name) => {
                    await editSegment({ id: segment.id, name });
                  }
                : undefined
            }
            onSelect={(segment) => go(buildSegmentUrl(segment))}
          />
        </PopoverContent>
      </Popover>
      {deleting && (
        <DeleteSegmentDialog
          segment={deleting}
          usage={usageOf(deleting.id)}
          open
          onDeleted={deleting.id === current?.id ? onCurrentDeleted : undefined}
          onOpenChange={(next) => !next && setDeleting(null)}
        />
      )}
    </>
  );
}
