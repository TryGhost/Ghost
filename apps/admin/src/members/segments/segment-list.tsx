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
import { useState } from 'react';
import { EditRow } from '@/members/label-picker';
import { SEGMENT_NAME_MAX_LENGTH } from './segment-fields';

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
  /**
   * Renames a segment, from the pencil that hovering its row shows, as the label picker edits a
   * label. Given, each row can be edited in place.
   */
  onRename?: (segment: Segment, name: string) => Promise<void>;
  /** What a failed rename says. */
  describeRenameError?: (error: unknown) => string;
  /** Asks to delete a segment, from the row being edited. */
  onDeleteRequest?: (segment: Segment) => void;
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
  onRename,
  describeRenameError,
  onDeleteRequest,
}: SegmentListProps) {
  const group = dense ? 'p-0' : undefined;
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Command>
      <CommandInput aria-label="Search segments" placeholder="Search segments..." />
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
            {segments.map((segment) =>
              onRename && editingId === segment.id ? (
                <div key={segment.id} className="px-2">
                  <EditRow
                    describeError={describeRenameError}
                    label={segment}
                    maxLength={SEGMENT_NAME_MAX_LENGTH}
                    noun="segment"
                    onCancel={() => setEditingId(null)}
                    onDelete={async () => {}}
                    onDeleteRequest={
                      onDeleteRequest
                        ? () => {
                            setEditingId(null);
                            onDeleteRequest(segment);
                          }
                        : undefined
                    }
                    onSave={(_id, name) => onRename(segment, name)}
                  />
                </div>
              ) : (
                <CommandItem
                  key={segment.id}
                  className={onRename ? 'group' : undefined}
                  value={segment.name}
                  onSelect={() => onSelect(segment)}
                >
                  <span className="min-w-0 truncate">{segment.name}</span>
                  {showCounts && <MemberCount filter={segment.filter} />}
                  {onRename ? (
                    // The tick and the pencil share one place, as in the label picker: the
                    // pencil slides in over the tick while the row is hovered.
                    <button
                      aria-label={`Edit segment ${segment.name}`}
                      className="relative ms-auto flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        setEditingId(segment.id);
                      }}
                    >
                      {segment.id === selectedId && (
                        <LucideIcon.Check className="absolute text-primary transition-opacity duration-150 group-hover:opacity-0" />
                      )}
                      <LucideIcon.Pencil className="absolute translate-x-2 opacity-0 transition-all duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
                    </button>
                  ) : (
                    segment.id === selectedId && <CommandCheck />
                  )}
                </CommandItem>
              ),
            )}
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
