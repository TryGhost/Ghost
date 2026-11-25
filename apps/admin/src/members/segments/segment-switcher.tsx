import { useNavigate } from '@tryghost/admin-x-framework';
import { useMemberCount } from '@tryghost/admin-x-framework/api/members';
import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import { Popover, PopoverContent, PopoverTrigger } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { useRef, useState } from 'react';
import { SegmentList } from './segment-list';
import { buildSegmentUrl } from './segment-route';

interface SegmentSwitcherProps {
  segments: Segment[];
  /** The segment the members screen is showing, or null for every member. */
  current: Segment | null;
  /** Starts a new segment. Left out for staff who can't change segments. */
  onNewSegment?: () => void;
}

/**
 * The members screen's title, as the way between segments: it names what the screen is showing
 * and opens the list of segments to switch to, so moving from one to another never leaves the
 * page. The list is the one the segment picker opens, with every member as its first choice.
 */
export function SegmentSwitcher({ segments, current, onNewSegment }: SegmentSwitcherProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const allMembers = useMemberCount();
  // Closing hands focus back to the title. "New segment" opens the filter control or the name
  // form, which take focus themselves and close when it is taken from them.
  const keepFocusWhereItGoes = useRef(false);
  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* A plain button, not Shade's: it is part of the page title, and has to take the
            title's own type in both designs. Shade's button sets its own size and weight, which
            under the Admin 7 design shrank the large title to button text. The chevron carries
            empty space of its own on each side, so the right padding is the smaller for the two
            sides to look alike, and it is sized from the title so it grows with a large one. */}
        <button
          className="-ml-2.5 inline-flex max-w-full cursor-pointer items-center gap-1 rounded-full py-0.5 pr-1.5 pl-2.5 align-baseline outline-hidden hover:bg-accent focus-visible:ring-2 focus-visible:ring-focus-ring data-[state=open]:bg-accent"
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
          leading={{
            label: 'All members',
            count: allMembers,
            selected: !current,
            onSelect: () => go('/members'),
          }}
          segments={segments}
          selectedId={current?.id}
          onNewSegment={
            onNewSegment
              ? () => {
                  keepFocusWhereItGoes.current = true;
                  setOpen(false);
                  onNewSegment();
                }
              : undefined
          }
          onSelect={(segment) => go(buildSegmentUrl(segment))}
        />
      </PopoverContent>
    </Popover>
  );
}
