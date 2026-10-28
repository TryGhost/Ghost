import { CreateCustomFieldForm } from './create-custom-field-form';
import { Popover, PopoverAnchor, PopoverContent } from '@tryghost/shade/components';
import type { ComponentProps, RefObject } from 'react';

type CreateCustomFieldPopoverProps = ComponentProps<typeof CreateCustomFieldForm> & {
  open: boolean;
  // What the popover hangs from: the picker, or the import column's field button.
  anchorRef: RefObject<HTMLElement | null>;
};

/**
 * Where a field is made from anywhere outside Settings: a popover under the control it was
 * opened from, with the same form as Settings. Opens leftward from the control, which sits
 * in the right-hand column wherever it is used, and is as tall as the room below or above
 * allows, with the form scrolling inside it once a list's options run long.
 */
export function CreateCustomFieldPopover({
  open,
  anchorRef,
  ...form
}: CreateCustomFieldPopoverProps) {
  return (
    // Modal, as the pickers it opens from are: what is behind it holds still while it is
    // open, so it can't be scrolled away from the row it belongs to.
    <Popover
      open={open}
      modal
      onOpenChange={(next) => {
        // Not mid-save: backing out of a create in flight would leave its answer nowhere.
        if (!next && !form.isSaving) {
          form.onCancel();
        }
      }}
    >
      <PopoverAnchor virtualRef={anchorRef as RefObject<HTMLElement>} />
      {/* Above Settings modals (z-[1000]). Select menus open at z-[9999], so the type menu
          still opens over it. */}
      <PopoverContent
        // No visible title: it opens from "Add custom field", which already says what it is.
        // Named for screen readers.
        align="end"
        aria-label="New custom field"
        className="z-[1002] max-h-(--radix-popover-content-available-height) w-[360px] max-w-[calc(100vw-32px)] overflow-y-auto"
        collisionPadding={16}
        sideOffset={8}
        // Back to the control it hangs from, the column's button or the picker's. Radix
        // would look for a trigger, and this popover only has an anchor. Focus that has
        // fallen back to the page or to the modal around the control goes back to it, but
        // a layer opened as this one closed, such as the picker a composite reopens, keeps
        // its own.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const anchor = anchorRef.current;
          const layer = document.activeElement?.closest('[role="dialog"]');
          if (layer && anchor && !layer.contains(anchor)) {
            return;
          }
          const control = anchor?.matches('button') ? anchor : anchor?.querySelector('button');
          control?.focus();
        }}
        // Opened as another popover closes, which hands focus back to its own trigger. That
        // is not the publisher leaving the form, so only a click outside, Escape or Cancel
        // closes it.
        onFocusOutside={(event) => event.preventDefault()}
      >
        <CreateCustomFieldForm {...form} />
      </PopoverContent>
    </Popover>
  );
}
