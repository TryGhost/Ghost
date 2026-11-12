import { Button, Popover, PopoverAnchor, PopoverContent } from '@tryghost/shade/components';
import {
  type CustomFieldErrors,
  type CustomFieldValues,
  hasChanged,
  newFieldErrors,
  newValues,
} from '@/shared/member-custom-fields/custom-field-values';
import {
  CustomFieldForm,
  NameField,
  TypeField,
} from '@/shared/member-custom-fields/custom-field-form';
import { ListField } from '@/shared/member-custom-fields/list-settings';
import type { CreateAttempt } from '@/shared/member-custom-fields/use-custom-field-create-attempt';
import { matchShape, type SetSettings } from '@tryghost/metafield-types/structure';
import { type RefObject, useState } from 'react';
import type {
  CreatableMemberCustomFieldTypes,
  MemberCustomFieldUserType,
} from '@tryghost/admin-x-framework/api/member-custom-fields';

/**
 * What the place a field is made from knows about a list made there, such as an import column's
 * answers: the settings a list starts from and whether the field starts out as one, or why a list
 * can't be made there at all.
 */
export type ListSuggestion =
  | { readonly kind: 'list'; readonly settings: SetSettings; readonly startAsList: boolean }
  | { readonly kind: 'refused'; readonly reason: string };

interface CreateCustomFieldPopoverProps {
  open: boolean;
  // What the popover hangs from: the picker, or the import column's field button.
  anchorRef: RefObject<HTMLElement>;
  // Where the name starts: an import's column header, or what was typed into a search.
  initialName: string;
  // What this place knows about a list made here, such as the options an import column already
  // holds. Asked once, as the popover opens.
  suggestList?: () => ListSuggestion;
  // The types this place can use, of those the site can create a field with; one pins it.
  types: CreatableMemberCustomFieldTypes;
  // The request in flight and what came back of it. Owned by the place, which runs the create:
  // this asks for a field and shows what it is told, and knows nothing about how either happens.
  attempt: CreateAttempt;
  // The form's values, which the place both creates the field from and files a refusal against.
  onSubmit: (values: CustomFieldValues) => void;
  // Editing answers the last refusal: it was about what was there before. Not called once a
  // failure can't be retried, since no edit answers a ceiling or a permission.
  onEdit: () => void;
  onCancel: () => void;
  testId: string;
}

const isListType = (type: MemberCustomFieldUserType) =>
  matchShape<boolean>(type.id, { scalar: () => false, record: () => false, set: () => true });

/**
 * Where a field is made from anywhere outside Settings: a popover under the control it is for,
 * with Settings' form and buttons of its own. A field made in passing starts staff-only, and is
 * opened to members in Settings. A place that knows what a list made there will hold, such as an
 * import column, suggests its settings, so a publisher reviews what is already there rather than
 * typing it out again. It can also start the field out as a list, or say why a list can't be made
 * there, which the form shows under the type as soon as List is chosen.
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
  suggestList,
  types,
  attempt,
  onSubmit,
  onEdit,
  onCancel,
  testId,
}: CreateCustomFieldPopoverProps) {
  const isSaving = attempt.state === 'saving';
  const refusedErrors = attempt.state === 'refused' ? attempt.errors : {};
  const saveError = attempt.state === 'failed' ? attempt.message : null;
  const canRetry = attempt.state === 'failed' ? attempt.canRetry : true;
  const [suggestion] = useState(() => suggestList?.());
  // What a list made here starts from, whenever List is chosen.
  const suggestedList = suggestion?.kind === 'list' ? suggestion.settings : undefined;
  const [start] = useState<CustomFieldValues>(() => {
    const startType =
      (suggestion?.kind === 'list' && suggestion.startAsList && types.find(isListType)) || types[0];
    return newValues(startType.id, initialName, suggestedList);
  });
  const [values, setValues] = useState(start);
  // The values' own problems, found on Save. A refusal from the server comes in with the attempt.
  const [errors, setErrors] = useState<CustomFieldErrors>({});
  const isDirty = hasChanged(values, start);

  const change = (update: (current: CustomFieldValues) => CustomFieldValues) => {
    if (canRetry) {
      onEdit();
    }
    setValues(update);
  };

  // Under the type, as soon as List is chosen somewhere a list can't be made.
  const typeProblem = suggestion?.kind === 'refused' && values.list ? suggestion.reason : undefined;

  const submit = () => {
    const found = newFieldErrors(values);
    setErrors(found);
    if (typeProblem || Object.values(found).some(Boolean)) {
      return;
    }
    onSubmit(values);
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
          className="flex flex-col gap-5"
          data-testid={testId}
          onKeyDown={(event) => {
            // Enter that confirms what an input method is composing isn't saving the form: the
            // composed text isn't in the input yet.
            if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
              return;
            }
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
            className="gap-5"
            idPrefix={testId}
            listStart={suggestedList}
            state={{
              values,
              // A refusal lasts until the next edit, which forgets it, so it can stand over them.
              errors: { ...errors, ...refusedErrors },
              saving: isSaving,
              update: change,
              setErrors,
            }}
          >
            <NameField />
            <TypeField problem={typeProblem} types={types} />
            <ListField />
          </CustomFieldForm>
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
