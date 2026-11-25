import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@tryghost/shade/components';
import { FilterBar } from '@tryghost/shade/patterns';
import { Stack } from '@tryghost/shade/primitives';
import { SegmentFields } from './segment-fields';
import { useSaveSegment } from './use-save-segment';

interface SaveSegmentFormProps {
  filter: string;
  onClose: () => void;
  onCreated?: (segment: Segment) => void;
}

/** The popover's contents, for a place that opens it from a control of its own. */
export function SaveSegmentForm({ filter, onClose, onCreated }: SaveSegmentFormProps) {
  const draft = useSaveSegment(onCreated);

  const save = async () => {
    if (await draft.save(filter)) {
      onClose();
    }
  };

  return (
    <PopoverContent align="end" className="w-72" data-testid="save-segment-popover">
      <Stack gap="md">
        <h3 className="text-sm font-semibold">Save as segment</h3>
        <SegmentFields
          error={draft.error}
          name={draft.name}
          pin={{ pinned: draft.pinned, onChange: draft.setPinned }}
          onNameChange={draft.setName}
          onSubmit={() => void save()}
        />
        <Button className="w-full" disabled={!draft.canSave(filter)} onClick={() => void save()}>
          {draft.isPending ? 'Saving...' : 'Save'}
        </Button>
      </Stack>
    </PopoverContent>
  );
}

interface SaveSegmentPopoverProps {
  /** The filters the members screen is showing, which become the segment's conditions. */
  filter: string;
  /** What the button says: saving filters as a segment, or a changed segment as another one. */
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (segment: Segment) => void;
}

/**
 * Saves the members screen's filters as a segment, from a popover under the filter bar's button:
 * a name and whether to pin it. The members matched are the list behind it.
 */
export function SaveSegmentPopover({
  filter,
  label,
  open,
  onOpenChange,
  onCreated,
}: SaveSegmentPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <FilterBar.Action variant="outline">{label}</FilterBar.Action>
      </PopoverTrigger>
      {/* Keyed on the filters, so it starts afresh when other filters are being saved. */}
      {open && (
        <SaveSegmentForm
          key={filter}
          filter={filter}
          onClose={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      )}
    </Popover>
  );
}
