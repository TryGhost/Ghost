import React from 'react';
import { Checkbox } from '@tryghost/shade/components';
import { cn } from '@tryghost/shade/utils';

// A list of checkboxes inside a field's popover.
//
// It replaces Shade's MultiSelectCombobox for the trigger's two multi-selects. That
// component is built for picking from a long searchable set — rows that toggle on
// click without ever showing a box, and a list that reorders as you go. On a fixed
// set of three or four it read as a menu that couldn't decide whether it had been
// answered: nothing on screen said "these are all the options and any number of
// them can be on", which is exactly what a checkbox says.
//
// The popover itself is still Shade's Combobox — the field keeps its look, clicking
// it again closes it, and clicking away closes it. Only the inside changed.
export const CheckboxList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col gap-0.5">{children}</div>
);

export const CheckboxRow: React.FC<{
  checked: boolean;
  label: string;
  // A row that states something rather than offering it — ticked, and not yours to
  // untick. It sits in the list rather than in prose beneath it so that everything
  // ending a run is in one place, whether or not you get a say in it.
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}> = ({ checked, label, disabled = false, onCheckedChange }) => (
  // A label, so the whole row is the target rather than the 16px box.
  <label
    className={cn(
      'flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors',
      disabled ? 'cursor-default' : 'cursor-pointer hover:bg-interactive-hover',
    )}
  >
    <Checkbox
      checked={checked}
      disabled={disabled}
      onCheckedChange={(next) => onCheckedChange(next === true)}
    />
    {/* Only the box dims. The words are still the answer to "what ends a run", and
            greying them would say they matter less than the ones you chose. */}
    <span className="text-sm">{label}</span>
  </label>
);
