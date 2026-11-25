import { useMemberViews } from '@/members/hooks/use-member-views';
import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import {
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  Command,
  CommandCheck,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import { useRef, useState } from 'react';
import { SegmentBuilderPopover } from './segment-builder';

function SegmentCount({ filter }: { filter: string }) {
  const { count } = useMembersCount(filter);

  if (count === null) {
    return null;
  }

  return (
    <Text as="span" className="tabular-nums" tone="secondary">
      {formatNumber(count)}
    </Text>
  );
}

interface SegmentPickerProps {
  /** The id of the segment chosen, if one is. */
  value?: string;
  onChange: (segmentId: string) => void;
  /** Names the control for assistive technology, when no visible label is tied to it. */
  ariaLabel?: string;
  placeholder?: string;
  /** Classes for the list, such as those a canvas needs to leave its scrolling alone. */
  contentClassName?: string;
}

/**
 * A single-select picker over segments, with creation in place: for any screen that needs a
 * segment chosen, such as an automation's trigger. It lists every segment with how many members
 * it has, and ends with the green "New segment" row, as the custom field picker ends with "Add
 * custom field". That row opens the segment builder as a popover hung from the picker, and the
 * segment made there becomes the one chosen.
 */
export function SegmentPicker({
  value,
  onChange,
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
            <Command>
              <CommandInput aria-label="Search segments" placeholder="Search segments..." />
              <CommandList>
                {segments.length > 0 && (
                  <CommandGroup className="p-0">
                    {segments.map((segment) => (
                      <CommandItem
                        key={segment.id}
                        value={segment.name}
                        onSelect={() => {
                          onChange(segment.id);
                          setOpen(false);
                        }}
                      >
                        <Text as="span" className="truncate">
                          {segment.name}
                        </Text>
                        <SegmentCount filter={segment.filter} />
                        {segment.id === value && <CommandCheck />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {/* A row of the list, as the custom field picker draws "Add custom field": the
                    arrow keys reach it, and when a search matches nothing it is the row left. */}
                <CommandGroup className="p-0" forceMount>
                  <CommandItem
                    className="font-semibold text-green"
                    value="__new-segment__"
                    forceMount
                    onSelect={() => {
                      setOpen(false);
                      setCreating(true);
                    }}
                  >
                    <LucideIcon.Plus className="size-4" />
                    <span>New segment</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </ComboboxContent>
        </Combobox>
      </div>
      <SegmentBuilderPopover
        align="center"
        anchorRef={pickerRef}
        open={creating}
        onCreated={(segment) => onChange(segment.id)}
        onOpenChange={setCreating}
      />
    </>
  );
}
