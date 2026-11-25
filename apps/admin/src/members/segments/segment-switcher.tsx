import { useNavigate } from '@tryghost/admin-x-framework';
import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { useState } from 'react';
import { buildSegmentUrl } from './segment-route';

// A row that stays at an edge of the scrolling list, over the popover's own surface.
const STICKY_ROW = 'sticky z-10 border-border bg-surface-elevated-2';

interface SegmentSwitcherProps {
  segments: Segment[];
  /** The segment the members screen is showing. */
  current: Segment;
  /** Starts a new segment. Left out for staff who can't change segments. */
  onNewSegment?: () => void;
}

/**
 * The members screen's title while it shows a segment, as the way between segments: it names
 * the segment and opens the list of segments to switch to, so moving from one to another never
 * goes through a different page.
 *
 * A long list scrolls above "New segment", which stays in view, and can be searched by name.
 */
export function SegmentSwitcher({ segments, current, onNewSegment }: SegmentSwitcherProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="-ml-1.5 inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 align-baseline outline-hidden hover:bg-accent focus-visible:ring-2 focus-visible:ring-focus-ring data-[state=open]:bg-accent"
          data-testid="segment-switcher"
          type="button"
        >
          <span className="truncate">{current.name}</span>
          <LucideIcon.ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-0 font-normal tracking-normal"
        collisionPadding={16}
      >
        <Command>
          <CommandInput placeholder="Search segments..." />
          {/* Everything is in the one list, so the arrow keys reach all of it. The last row
              sticks to its edge, in view however far the segments are scrolled. */}
          <CommandList className="p-0">
            <CommandEmpty>No segments found.</CommandEmpty>
            {segments.length > 0 && (
              <CommandGroup>
                {segments.map((segment) => (
                  <CommandItem
                    key={segment.id}
                    value={segment.name}
                    onSelect={() => go(buildSegmentUrl(segment))}
                  >
                    <span className="min-w-0 truncate">{segment.name}</span>
                    {segment.id === current.id && <CommandCheck />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {onNewSegment && (
              // Offered whatever is searched for.
              <CommandGroup className={`${STICKY_ROW} bottom-0 border-t`} forceMount>
                <CommandItem
                  value="New segment"
                  forceMount
                  onSelect={() => {
                    setOpen(false);
                    onNewSegment();
                  }}
                >
                  <LucideIcon.Plus />
                  <span>New segment</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
