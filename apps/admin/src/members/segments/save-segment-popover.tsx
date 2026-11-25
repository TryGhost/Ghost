import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import {
  Button,
  FieldError,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { FilterBar } from '@tryghost/shade/patterns';
import { Stack, Text } from '@tryghost/shade/primitives';
import { SegmentFields } from './segment-fields';
import { useSaveSegment } from './use-save-segment';

interface SaveSegmentFormProps {
  /** The filters being saved. Empty, saving says a filter is needed. */
  filter: string;
  /** A name to start with, such as the suggestion the filters came from. */
  initialName?: string;
  onClose: () => void;
  onCreated?: (segment: Segment) => void;
}

/** The popover's contents, for a place that opens it from a control of its own. */
export function SaveSegmentForm({ filter, initialName, onClose, onCreated }: SaveSegmentFormProps) {
  const draft = useSaveSegment(onCreated, initialName);
  const filterError = draft.filterError(filter || undefined);

  const save = async () => {
    if (await draft.save(filter || undefined)) {
      onClose();
    }
  };

  return (
    <PopoverContent align="end" className="w-72" data-testid="save-segment-popover">
      <Stack gap="md">
        <Text as="h3" size="sm" weight="semibold">
          Save segment
        </Text>
        <SegmentFields
          error={draft.error}
          name={draft.name}
          pin={{ pinned: draft.pinned, onChange: draft.setPinned }}
          onNameChange={draft.setName}
          onSubmit={() => void save()}
        />
        {filterError && <FieldError>{filterError}</FieldError>}
        <Button
          className="w-full"
          disabled={draft.isPending}
          variant={draft.error || filterError ? 'destructive' : 'default'}
          onClick={() => void save()}
        >
          {draft.isPending ? 'Saving…' : draft.error || filterError ? 'Retry' : 'Save'}
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
  /** A name to start with, such as the suggestion the filters came from. */
  initialName?: string;
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
  initialName,
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
          initialName={initialName}
          onClose={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      )}
    </Popover>
  );
}
