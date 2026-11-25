import { useCanChangeMemberViews } from '@/members/hooks/use-member-views';
import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverAnchor,
} from '@tryghost/shade/components';
import { FilterBar } from '@tryghost/shade/patterns';
import { useEffect, useRef, useState } from 'react';
import { useSegmentUsage } from './poc-store';
import { SaveSegmentForm, SaveSegmentPopover } from './save-segment-popover';
import { UpdateSegmentDialog } from './segment-dialogs';
import { SegmentMenu } from './segment-menu';

interface MemberSegmentActionsProps {
  /** The filters the members screen is showing. */
  filter: string;
  /** The segment the screen is showing, if it is showing one. */
  segment: Segment | null;
  /** Whether the filters shown differ from the segment's own. */
  isModified: boolean;
  /** Shows a segment: one just saved, or the same one after its conditions changed. */
  onOpenSegment: (segment: Segment) => void;
  /** Leaves the segment, after it is deleted. */
  onLeaveSegment: () => void;
  /**
   * Counts the times something else on the screen asked for these filters to be saved as a new
   * segment, such as "New segment" in the title's list. Each new count opens the name form.
   */
  saveRequest?: number;
}

/**
 * What the members screen offers for the filters it is showing: one button at the end of the
 * filter bar, after the bar's own clear button.
 *
 * - Filters that are no segment's can be saved as one.
 * - A segment shown as it is saved can be edited: renamed, pinned, deleted.
 * - A segment whose filters have been changed is not saved by the change. Saving asks whether to
 *   update the segment, which is confirmed first, or to keep it and save another.
 *
 * Nothing is offered to staff who can't change segments.
 */
export function MemberSegmentActions({
  filter,
  segment,
  isModified,
  onOpenSegment,
  onLeaveSegment,
  saveRequest = 0,
}: MemberSegmentActionsProps) {
  const canChange = useCanChangeMemberViews();
  const { usageOf } = useSegmentUsage();
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  // The menu hands focus back to its button as it closes. When it closes to open the save
  // form, that would take focus out of the form, which closes on losing it.
  const openingSaveForm = useRef(false);
  const answeredSaveRequest = useRef(saveRequest);
  useEffect(() => {
    if (saveRequest !== answeredSaveRequest.current) {
      answeredSaveRequest.current = saveRequest;
      setSaving(true);
    }
  }, [saveRequest]);

  if (!canChange) {
    return null;
  }

  if (!segment) {
    return (
      <SaveSegmentPopover
        filter={filter}
        label="Save segment"
        open={saving}
        onCreated={onOpenSegment}
        onOpenChange={setSaving}
      />
    );
  }

  if (!isModified) {
    return (
      <SegmentMenu segment={segment} onDeleted={onLeaveSegment}>
        <FilterBar.Action variant="outline">Edit segment</FilterBar.Action>
      </SegmentMenu>
    );
  }

  return (
    <>
      <Popover open={saving} onOpenChange={setSaving}>
        <DropdownMenu>
          <PopoverAnchor asChild>
            <DropdownMenuTrigger asChild>
              <FilterBar.Action>Save changes</FilterBar.Action>
            </DropdownMenuTrigger>
          </PopoverAnchor>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(event) => {
              if (openingSaveForm.current) {
                openingSaveForm.current = false;
                event.preventDefault();
              }
            }}
          >
            <DropdownMenuItem onSelect={() => setUpdating(true)}>
              Update “{segment.name}”
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                openingSaveForm.current = true;
                setSaving(true);
              }}
            >
              Save as new segment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {saving && (
          <SaveSegmentForm
            key={filter}
            filter={filter}
            onClose={() => setSaving(false)}
            onCreated={onOpenSegment}
          />
        )}
      </Popover>
      {updating && (
        <UpdateSegmentDialog
          nextFilter={filter}
          segment={segment}
          usage={usageOf(segment.id)}
          open
          onOpenChange={setUpdating}
          onUpdated={() => onOpenSegment({ ...segment, filter })}
        />
      )}
    </>
  );
}
