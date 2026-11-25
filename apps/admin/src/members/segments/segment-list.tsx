import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import {
  Command,
  CommandCheck,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@tryghost/shade/components';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';

/** A count beside a name, quieter than the name. Nothing while it isn't known. */
export function SegmentListCount({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return null;
  }

  return <span className="text-muted-foreground tabular-nums">{formatNumber(value)}</span>;
}

/**
 * How many members a segment has. POC: one request for each segment listed, made when the list
 * opens. The segments API would return the counts with the list.
 */
function MemberCount({ filter }: { filter: string }) {
  const { count } = useMembersCount(filter);
  return <SegmentListCount value={count} />;
}

interface SegmentListProps {
  segments: Segment[];
  /** The segment marked as the one chosen. */
  selectedId?: string;
  onSelect: (segment: Segment) => void;
  /** Whether each segment shows how many members it has. */
  showCounts?: boolean;
  /**
   * A choice listed before the segments, with a line under it: what the list offers besides a
   * segment, such as every member.
   */
  leading?: { label: string; count?: number | null; selected: boolean; onSelect: () => void };
  /** Starts a new segment. Given, the list ends with the "New segment" row. */
  onNewSegment?: () => void;
  /** Rows set closer to the list's edges, for a list hung from a form field. */
  dense?: boolean;
  /** A small control at the end of the search row, such as a way to manage the segments. */
  searchAction?: React.ReactNode;
}

/**
 * The list of segments, wherever one is chosen from: a search, each segment with its member
 * count and a tick on the one chosen, and a last row that starts a new one. The members screen's
 * title and the segment picker both open this list, each from its own kind of button, so the two
 * can't drift apart.
 *
 * The last row is drawn as the custom field picker draws "Add custom field": the arrow keys
 * reach it, and when a search matches nothing it is the row left.
 */
export function SegmentList({
  segments,
  selectedId,
  onSelect,
  showCounts = true,
  leading,
  onNewSegment,
  dense = false,
  searchAction,
}: SegmentListProps) {
  const group = dense ? 'p-0' : undefined;

  return (
    <Command>
      {searchAction ? (
        <div className="relative">
          <CommandInput
            aria-label="Search segments"
            className="pr-8"
            placeholder="Search segments..."
          />
          <div className="absolute inset-y-0 right-1.5 flex items-center">{searchAction}</div>
        </div>
      ) : (
        <CommandInput aria-label="Search segments" placeholder="Search segments..." />
      )}
      <CommandList>
        {leading && (
          <CommandGroup className={group}>
            <CommandItem value={leading.label} onSelect={leading.onSelect}>
              <span>{leading.label}</span>
              {showCounts && <SegmentListCount value={leading.count} />}
              {leading.selected && <CommandCheck />}
            </CommandItem>
          </CommandGroup>
        )}
        {/* A line, as the checkout's country list has under "All countries". */}
        {leading && segments.length > 0 && <CommandSeparator className="-mx-1" />}
        {segments.length > 0 && (
          <CommandGroup className={group}>
            {segments.map((segment) => (
              <CommandItem key={segment.id} value={segment.name} onSelect={() => onSelect(segment)}>
                <span className="min-w-0 truncate">{segment.name}</span>
                {showCounts && <MemberCount filter={segment.filter} />}
                {segment.id === selectedId && <CommandCheck />}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {onNewSegment && (
          <CommandGroup className={dense ? 'p-0' : 'pt-0'} forceMount>
            <CommandItem
              className="font-semibold text-green"
              value="__new-segment__"
              forceMount
              onSelect={onNewSegment}
            >
              <LucideIcon.Plus className="size-4" />
              <span>New segment</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
