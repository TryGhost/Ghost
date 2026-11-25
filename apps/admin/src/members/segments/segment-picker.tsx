import { useMemberViews } from '@/members/hooks/use-member-views';
import {
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
} from '@tryghost/shade/components';
import { useRef, useState } from 'react';
import { SegmentBuilderDialog, SegmentBuilderPopover } from './segment-builder';
import { SegmentList } from './segment-list';

interface SegmentPickerProps {
  /** The id of the segment chosen, if one is. */
  value?: string;
  onChange: (segmentId: string) => void;
  /** Whether each segment shows how many members it has. On unless a place turns it off. */
  showCounts?: boolean;
  /**
   * How a new segment is made from here: in a popover hung from the picker, in a dialog, or not
   * at all, when the list has no "New segment" row.
   */
  create?: 'popover' | 'dialog' | false;
  /** Whether the builder asks if the new segment is pinned to the sidebar. */
  withPin?: boolean;
  /** Names the control for assistive technology, when no visible label is tied to it. */
  ariaLabel?: string;
  placeholder?: string;
  /** Classes for the list, such as those a canvas needs to leave its scrolling alone. */
  contentClassName?: string;
}

/**
 * A single-select picker over segments, for any screen that needs one chosen, such as an
 * automation's trigger: a form field that opens the list of segments. A place decides whether
 * the list shows member counts, and whether and how a new segment can be made from it. The
 * segment made becomes the one chosen.
 */
export function SegmentPicker({
  value,
  onChange,
  showCounts = true,
  create = 'popover',
  withPin = false,
  ariaLabel = 'Segment',
  placeholder = 'Select a segment...',
  contentClassName,
}: SegmentPickerProps) {
  const segments = useMemberViews();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selected = segments.find((segment) => segment.id === value);

  return (
    <>
      <div ref={pickerRef}>
        <Combobox open={open} modal onOpenChange={setOpen}>
          <ComboboxTrigger aria-label={ariaLabel}>
            <ComboboxValue placeholder={!selected}>{selected?.name ?? placeholder}</ComboboxValue>
          </ComboboxTrigger>
          <ComboboxContent className={contentClassName}>
            <SegmentList
              segments={segments}
              selectedId={value}
              showCounts={showCounts}
              dense
              onNewSegment={
                create
                  ? () => {
                      setOpen(false);
                      setCreating(true);
                    }
                  : undefined
              }
              onSelect={(segment) => {
                onChange(segment.id);
                setOpen(false);
              }}
            />
          </ComboboxContent>
        </Combobox>
      </div>
      {create === 'popover' && (
        <SegmentBuilderPopover
          anchorRef={pickerRef}
          open={creating}
          withPin={withPin}
          onCreated={(segment) => onChange(segment.id)}
          onOpenChange={setCreating}
        />
      )}
      {create === 'dialog' && creating && (
        <SegmentBuilderDialog
          withPin={withPin}
          open
          onCreated={(segment) => onChange(segment.id)}
          onOpenChange={setCreating}
        />
      )}
    </>
  );
}
