import { useNavigate } from '@tryghost/admin-x-framework';
import { useMemberCount, useMembersCount } from '@tryghost/admin-x-framework/api/members';
import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import {
  Button,
  Command,
  CommandCheck,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import { useRef, useState } from 'react';
import { buildSegmentUrl } from './segment-route';

/** A count beside a name, as the page title shows its own: quieter than the name. */
function Count({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return null;
  }

  return <span className="text-muted-foreground tabular-nums">{formatNumber(value)}</span>;
}

/**
 * How many members a segment has. POC: one request for each segment listed, made when the list
 * opens. The segments API would return the counts with the list.
 */
function SegmentCount({ filter }: { filter: string }) {
  const { count } = useMembersCount(filter);
  return <Count value={count} />;
}

interface SegmentSwitcherProps {
  segments: Segment[];
  /** The segment the members screen is showing, or null for every member. */
  current: Segment | null;
  /** Starts a new segment. Left out for staff who can't change segments. */
  onNewSegment?: () => void;
}

/**
 * The members screen's title, as the way between segments: it names what the screen is showing
 * and opens the list to switch to, so moving from one segment to another never leaves the page.
 * Each is listed with how many members it has, and the list can be searched by name.
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
        {/* Shade's ghost button, set in the title's own type instead of a button's. */}
        <Button
          className="-ml-1.5 h-auto max-w-full gap-1 px-1.5 py-0.5 align-baseline font-[inherit] text-[length:inherit] tracking-[inherit] data-[state=open]:bg-accent"
          data-testid="segment-switcher"
          variant="ghost"
        >
          <span className="truncate">{current ? current.name : 'Members'}</span>
          <LucideIcon.ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
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
        <Command>
          <CommandInput placeholder="Search segments..." />
          <CommandList>
            <CommandGroup>
              <CommandItem value="All members" onSelect={() => go('/members')}>
                <span>All members</span>
                <Count value={allMembers} />
                {!current && <CommandCheck />}
              </CommandItem>
            </CommandGroup>
            {segments.length > 0 && (
              <CommandGroup heading="Segments">
                {segments.map((segment) => (
                  <CommandItem
                    key={segment.id}
                    value={segment.name}
                    onSelect={() => go(buildSegmentUrl(segment))}
                  >
                    <span className="min-w-0 truncate">{segment.name}</span>
                    <SegmentCount filter={segment.filter} />
                    {segment.id === current?.id && <CommandCheck />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {/* A row of the list, drawn as the custom field picker draws "Add custom field":
                the arrow keys reach it, and when a search matches nothing it is the row left. */}
            {onNewSegment && (
              <CommandGroup className="pt-0" forceMount>
                <CommandItem
                  className="font-semibold text-green"
                  value="__new-segment__"
                  forceMount
                  onSelect={() => {
                    keepFocusWhereItGoes.current = true;
                    setOpen(false);
                    onNewSegment();
                  }}
                >
                  <LucideIcon.Plus className="size-4" />
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
