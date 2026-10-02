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
  <div className="flex flex-col">{children}</div>
);

export const CheckboxRow: React.FC<{
  checked: boolean;
  label: string;
  // A row another row owns. The tiers under "Any paid tier" are ticked — "any" does
  // include them — and inert, because the choice above them is what decides them.
  //
  // This used to carry the trigger's automatic exits, which were ticked and not yours
  // to untick for a different reason: they stated a fact rather than offering a
  // choice. Those are a sentence now, and the reason the label's treatment changed
  // with them — see below.
  disabled?: boolean;
  // Dimmed but still yours to untick — an archived tier that's in the
  // selection. Different fact from disabled: disabled says another control owns
  // this row; muted says the row's subject has gone quiet. The label dims the
  // same amount either way so the two read as one visual language.
  muted?: boolean;
  onCheckedChange: (checked: boolean) => void;
}> = ({ checked, label, disabled = false, muted = false, onCheckedChange }) => (
  // A label, so the whole row is the target rather than the 16px box.
  <label
    // Row metrics from Shade's SelectItem — rounded-xs, py-1.5 px-2 — so a row here
    // is the same object as a row in any select rather than a size of its own.
    className={cn(
      'flex items-center gap-2.5 rounded-xs px-2 py-1.5 transition-colors',
      disabled ? 'cursor-default' : 'cursor-pointer hover:bg-interactive-hover',
    )}
  >
    <Checkbox
      checked={checked}
      disabled={disabled}
      onCheckedChange={(next) => onCheckedChange(next === true)}
    />
    {/* The label dims with the box. It used to stay at full strength, because the
            only disabled rows were the automatic exits: their words were part of the
            answer to "what ends a run", and greying them would have said they counted
            for less than the ones you'd picked. A row that's inert because another row
            owns it is the opposite case — the dimming is the thing saying so, and half
            a dimmed row reads as a rendering fault.

            opacity-50 rather than a muted colour, matching what inputSurface('self')
            already applies to the box beside it, so the two halves dim by the same
            amount. On the span rather than the row for that reason: on the row it would
            compound with the box's own and take it to 25%. */}
    <span className={cn('text-control', (disabled || muted) && 'opacity-50')}>{label}</span>
  </label>
);
