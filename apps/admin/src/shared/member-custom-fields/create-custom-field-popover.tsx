import { Button, Popover, PopoverAnchor, PopoverContent } from '@tryghost/shade/components';
import {
  type CustomFieldDraft,
  type CustomFieldDraftErrors,
  customFieldDraftErrors,
  newCustomField,
  newDraft,
} from '@/shared/member-custom-fields/custom-field-draft';
import { CustomFieldForm } from '@/shared/member-custom-fields/custom-field-form';
import { dequal } from 'dequal';
import { type RefObject, useState } from 'react';
import type {
  MemberCustomFieldUserType,
  NewMemberCustomField,
} from '@tryghost/admin-x-framework/api/member-custom-fields';

interface CreateCustomFieldPopoverProps {
  open: boolean;
  // What the popover hangs from: the picker, or the import column's field button.
  anchorRef: RefObject<HTMLElement>;
  // Where the name starts: an import's column header, or what was typed into a search.
  initialName: string;
  // The types this place can use; one pins it.
  types: MemberCustomFieldUserType[];
  // The request in flight and what came back of it. Owned by the place, which runs the create:
  // this asks for a field and shows what it is told, and knows nothing about how either happens.
  isSaving: boolean;
  // On the name input, for a refusal the publisher can fix by typing.
  nameError: string | null;
  // Below the form, for one they cannot.
  saveError: string | null;
  // False once a refusal cannot be argued with, such as a site at its field ceiling, so the
  // button stops inviting the same doomed request.
  canRetry: boolean;
  onSubmit: (field: NewMemberCustomField) => void;
  // Editing answers the last refusal: it was about what was there before.
  onEdit: () => void;
  onCancel: () => void;
  testId: string;
}

/**
 * Where a field is made from anywhere outside Settings: a popover under the control it is for,
 * with Settings' form and buttons of its own. A field made in passing starts staff-only, and is
 * opened to members in Settings.
 *
 * Opens leftward from the control, which sits in the right-hand column wherever it is used, and is
 * as tall as the room below or above allows, with the form scrolling inside it once a list's
 * options run long. A form that has been changed refuses a stray click or Escape: Cancel is the
 * one way to throw it away.
 */
export function CreateCustomFieldPopover({
  open,
  anchorRef,
  initialName,
  types,
  isSaving,
  nameError,
  saveError,
  canRetry,
  onSubmit,
  onEdit,
  onCancel,
  testId,
}: CreateCustomFieldPopoverProps) {
  const [initial] = useState<CustomFieldDraft>(() => ({
    ...newDraft(types[0].id),
    name: initialName,
  }));
  const [draft, setDraft] = useState(initial);
  // The draft's own problems, found on Save. A refusal from the server comes in as nameError.
  const [errors, setErrors] = useState<CustomFieldDraftErrors>({});
  const isDirty = !dequal(draft, initial);

  const change = (update: (current: CustomFieldDraft) => CustomFieldDraft) => {
    onEdit();
    setDraft(update);
  };

  const submit = () => {
    const found = customFieldDraftErrors(draft);
    setErrors(found);
    if (found.name || found.settings) {
      return;
    }
    onSubmit(newCustomField(draft));
  };

  // Kept while it is changed or saving: a click outside or Escape would throw the form away, and
  // backing out of a create in flight would leave its answer nowhere.
  const keepOpen = isDirty || isSaving;

  return (
    // Modal, as the pickers it opens from are: what is behind it holds still while it is open,
    // so it can't be scrolled away from the row it belongs to.
    <Popover
      open={open}
      modal
      onOpenChange={(next) => {
        if (!next && !isSaving) {
          onCancel();
        }
      }}
    >
      <PopoverAnchor virtualRef={anchorRef} />
      {/* Above Settings modals (z-[1000]). Select menus open at z-[9999], so the type menu
          still opens over it. No visible title: it opens from "Add custom field", which
          already says what it is. */}
      <PopoverContent
        align="end"
        aria-label="New custom field"
        className="z-[1002] max-h-(--radix-popover-content-available-height) w-[360px] max-w-[calc(100vw-32px)] overflow-y-auto"
        collisionPadding={16}
        sideOffset={8}
        // Back to the control it hangs from. Radix would look for a trigger, and this popover
        // only has an anchor. Focus that has fallen back to the page or to the modal around
        // the control goes back to it, but a layer opened as this one closed, such as the
        // picker a composite reopens, keeps its own.
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
        // An Escape it keeps goes no further, or a Settings modal around it would close instead.
        onEscapeKeyDown={(event) => {
          if (keepOpen) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        // Opened as a picker closes, which hands focus back to its own trigger. That is not
        // the publisher leaving the form.
        onFocusOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => {
          if (keepOpen) {
            event.preventDefault();
          }
        }}
      >
        {/* Not a form element: this can sit inside a dialog's own form, and nesting one is
            invalid. Enter in a text input saves as it would in a form, unless the input has
            used it, as the options editor does to add one; the type menu, the switch and the
            buttons keep Enter for themselves. */}
        <div
          className="space-y-5"
          data-testid={testId}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              event.target instanceof HTMLInputElement &&
              !event.defaultPrevented &&
              !isSaving &&
              canRetry
            ) {
              event.preventDefault();
              submit();
            }
          }}
        >
          <CustomFieldForm
            disabled={isSaving}
            draft={draft}
            errors={{ name: errors.name ?? nameError ?? undefined, settings: errors.settings }}
            idPrefix={testId}
            types={types}
            compact
            onChange={change}
            onClearError={(key) => setErrors((current) => ({ ...current, [key]: undefined }))}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              disabled={isSaving}
              size="sm"
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button disabled={isSaving || !canRetry} size="sm" type="button" onClick={submit}>
              {isSaving ? 'Saving' : 'Save'}
            </Button>
          </div>
          {saveError && (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
