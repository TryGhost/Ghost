import { type Segment, useEditSegment } from '@tryghost/admin-x-framework/api/segments';
import { Popover, PopoverContent, PopoverTrigger } from '@tryghost/shade/components';
import { PageHeader } from '@tryghost/shade/patterns';
import { LucideIcon } from '@tryghost/shade/utils';
import { useState } from 'react';
import { EditRow } from '@/members/label-picker';
import { useSegmentUsage } from './poc-store';
import { DeleteSegmentDialog } from './segment-dialogs';
import { SEGMENT_NAME_MAX_LENGTH } from './segment-fields';
import { segmentWriteFailure } from './segment-write-failure';

interface EditSegmentButtonProps {
  segment: Segment;
  /** Leaves the segment, after it is deleted. */
  onDeleted: () => void;
}

/**
 * "Edit segment", a secondary action in the members screen's header while a segment is open,
 * before New member. It opens the form the title's list edits a segment with, from its pencil:
 * the name, with Delete, Cancel and Save. The pencil is only found by opening the list and
 * hovering a row, so this is the way that can be seen.
 */
export function EditSegmentButton({ segment, onDeleted }: EditSegmentButtonProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { usageOf } = useSegmentUsage();
  const { mutateAsync: editSegment } = useEditSegment();

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <PageHeader.Action data-testid="edit-segment" label="Edit segment">
            {/* The segment's own icon, as automations show a segment, rather than a pencil:
                the button is about the segment, and its label says what it does. */}
            <LucideIcon.ChartPie />
            <span className="hidden sm:inline">Edit segment</span>
          </PageHeader.Action>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 px-2 pt-1 pb-0" collisionPadding={16}>
          {/* Keyed by the segment, so it starts from the name of the one shown. */}
          <EditRow
            key={segment.id}
            describeError={(error) => segmentWriteFailure(error, 'edit')}
            label={segment}
            maxLength={SEGMENT_NAME_MAX_LENGTH}
            noun="segment"
            onCancel={() => setOpen(false)}
            onDelete={async () => {}}
            onDeleteRequest={() => {
              setOpen(false);
              setDeleting(true);
            }}
            onSave={async (_id, name) => {
              await editSegment({ id: segment.id, name });
            }}
          />
        </PopoverContent>
      </Popover>
      {deleting && (
        <DeleteSegmentDialog
          segment={segment}
          usage={usageOf(segment.id)}
          open
          onDeleted={onDeleted}
          onOpenChange={setDeleting}
        />
      )}
    </>
  );
}
