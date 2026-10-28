import { CreateCustomFieldPopover } from './create-custom-field-popover';
import { CreateCustomFieldSheet } from './create-custom-field-sheet';
import type { ComponentProps } from 'react';

// POC: which surface the field panel uses, to compare the two. Every place that creates a
// field outside Settings goes through this, so one switch changes them all.
const CREATE_FIELD_PANEL: 'sheet' | 'popover' = 'popover';

/** Where a field is made from anywhere outside Settings: a sheet, or a popover under the control. */
export function CreateCustomFieldPanel({
  anchorRef,
  ...props
}: ComponentProps<typeof CreateCustomFieldPopover>) {
  if (CREATE_FIELD_PANEL === 'popover') {
    return <CreateCustomFieldPopover anchorRef={anchorRef} {...props} />;
  }
  return <CreateCustomFieldSheet {...props} />;
}
