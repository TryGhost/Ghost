import { CreateCustomFieldForm } from './create-custom-field-form';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
} from '@tryghost/shade/components';
import type { ComponentProps } from 'react';

type CreateCustomFieldSheetProps = ComponentProps<typeof CreateCustomFieldForm> & {
  open: boolean;
};

/**
 * A new custom field, made in a sheet beside whatever the publisher was doing: mapping an
 * import column, or choosing where checkout saves what it collects. The same form and the
 * same place every time, with room for a list's options however many there are.
 */
export function CreateCustomFieldSheet({ open, ...form }: CreateCustomFieldSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        // Not mid-save: backing out of a create in flight would leave its answer nowhere.
        if (!next && !form.isSaving) {
          form.onCancel();
        }
      }}
    >
      {/* Settings modals sit at z-[1000], and the sheet opens from inside one, so it and its
          overlay go above them; the sheet's own overlay would dim only what is beneath the
          modal. Select menus open at z-[9999], above both. */}
      <SheetPortal>
        <SheetOverlay className="z-[1001]" />
      </SheetPortal>
      <SheetContent
        aria-describedby={undefined}
        className="z-[1002] w-full overflow-y-auto px-6 sm:max-w-[480px]"
      >
        <SheetHeader className="mb-6">
          <SheetTitle>New custom field</SheetTitle>
        </SheetHeader>
        {/* Mounted with each opening and kept through the closing slide, which the sheet
            ends by unmounting it, so it leaves showing what it held. */}
        <CreateCustomFieldForm {...form} />
      </SheetContent>
    </Sheet>
  );
}
