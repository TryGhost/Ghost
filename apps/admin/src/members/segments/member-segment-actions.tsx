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
import { LucideIcon } from '@tryghost/shade/utils';
import { useEffect, useRef, useState } from 'react';
import { useSegmentUsage } from './poc-store';
import { SaveSegmentForm, SaveSegmentPopover } from './save-segment-popover';
import { UpdateSegmentDialog } from './segment-dialogs';

interface MemberSegmentActionsProps {
  /** The filters the members screen is showing. */
  filter: string;
  /** The segment the screen is showing, if it is showing one. */
  segment: Segment | null;
  /** Whether the filters shown differ from the segment's own. */
  isModified: boolean;
  /** Shows a segment: one just saved, or the same one after its conditions changed. */
  onOpenSegment: (segment: Segment) => void;
  /**
   * Counts the times something else on the screen asked for these filters to be saved as a new
   * segment, such as "New segment" in the title's list. Each new count opens the name form.
   */
  saveRequest?: number;
  /** A name the save form starts with, such as the suggestion the filters came from. */
  suggestedName?: string;
}

/**
 * What the members screen offers for the filters it is showing: one button at the end of the
 * filter bar, after the bar's own clear button.
 *
 * - Filters that are no segment's can be saved as one.
 * - A segment shown as it is saved has nothing here: it is renamed and deleted from the title.
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
  saveRequest = 0,
  suggestedName,
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

  // No filter yet, making a segment or with a segment's last filter removed: the button still
  // says what the bar is for, but a segment can't be saved without conditions, so it takes the
  // publisher to the missing step instead. A filter that isn't finished, such as one with no value, filters nothing, so the
  // cursor goes to its empty value. With no filter at all, the bar's Filter menu opens.
  if (!filter) {
    return (
      <FilterBar.Action
        variant={segment ? 'default' : 'outline'}
        onClick={(event) => {
          const bar =
            event.currentTarget.closest('[data-slot="filter-bar"]') ??
            event.currentTarget.closest('[data-list-page="header"]');
          const emptyValue = [...(bar?.querySelectorAll<HTMLInputElement>('input') ?? [])].find(
            (input) => input.value === '',
          );
          if (emptyValue) {
            emptyValue.focus();
            return;
          }
          bar?.querySelector<HTMLButtonElement>('[data-slot="filters-add"]')?.click();
        }}
      >
        {segment ? 'Save changes' : 'Save segment'}
      </FilterBar.Action>
    );
  }

  if (!segment) {
    return (
      <SaveSegmentPopover
        filter={filter}
        initialName={suggestedName}
        label="Save segment"
        open={saving}
        onCreated={onOpenSegment}
        onOpenChange={setSaving}
      />
    );
  }

  // An unchanged segment is renamed and deleted from the title's list, not here.
  if (!isModified) {
    return null;
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
            {/* Icons, as the title's list has for renaming and deleting a segment. */}
            <DropdownMenuItem onSelect={() => setUpdating(true)}>
              <LucideIcon.RefreshCw className="size-4" />
              Update segment
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                openingSaveForm.current = true;
                setSaving(true);
              }}
            >
              <LucideIcon.Plus className="size-4" />
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
