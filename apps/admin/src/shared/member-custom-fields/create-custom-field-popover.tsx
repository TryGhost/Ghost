import { Button, Popover, PopoverAnchor, PopoverContent } from '@tryghost/shade/components';
import {
  type CustomFieldDraft,
  type CustomFieldDraftErrors,
  customFieldDraftErrors,
  isSettingsProblem,
  newCustomField,
  newDraft,
} from '@/shared/member-custom-fields/custom-field-draft';
import { CustomFieldForm } from '@/shared/member-custom-fields/custom-field-form';
import { dequal } from 'dequal';
import { matchField, matchShape, type SetSettings } from '@tryghost/metafield-types/structure';
import { type RefObject, useState } from 'react';
import type {
  MemberCustomFieldUserType,
  NewMemberCustomField,
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
  // Editing answers the last refusal: it was about what was there before. Not called once
  // canRetry is false, since no edit answers a ceiling or a permission.
  onEdit: () => void;
  onCancel: () => void;
  testId: string;
}

/**
 * A draft that has just become a list, starting from the settings `suggestion` gives, or any other
 * draft as it is.
 */
const suggestedFrom = (
  suggestion: ListSuggestion | undefined,
  draft: CustomFieldDraft,
): CustomFieldDraft =>
  matchField<CustomFieldDraft, CustomFieldDraft>(draft, {
    scalar: () => draft,
    record: () => draft,
    set: (list) =>
      suggestion?.kind === 'list' ? { ...list, settings: suggestion.settings } : list,
  });

const isList = (draft: CustomFieldDraft) =>
  matchField<CustomFieldDraft, boolean>(draft, {
    scalar: () => false,
    record: () => false,
    set: () => true,
  });

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
  isSaving,
  nameError,
  saveError,
  canRetry,
  onSubmit,
  onEdit,
  onCancel,
  testId,
}: CreateCustomFieldPopoverProps) {
  const [suggestion] = useState(() => suggestList?.());
  const [initial] = useState<CustomFieldDraft>(() => {
    const startType =
      (suggestion?.kind === 'list' && suggestion.startAsList && types.find(isListType)) || types[0];
    return suggestedFrom(suggestion, { ...newDraft(startType.id), name: initialName });
  });
  const [draft, setDraft] = useState(initial);
  // The draft's own problems, found on Save. A refusal from the server comes in as nameError.
  const [errors, setErrors] = useState<CustomFieldDraftErrors>({});
  const isDirty = !dequal(draft, initial);

  // Only a change of type suggests settings, so editing a suggested list keeps what was edited.
  const change = (update: (current: CustomFieldDraft) => CustomFieldDraft) => {
    if (canRetry) {
      onEdit();
    }
    setDraft((current) => {
      const next = update(current);
      return next.type === current.type ? next : suggestedFrom(suggestion, next);
    });
  };

  // Under the type, as soon as List is chosen somewhere a list can't be made.
  const typeProblem =
    suggestion?.kind === 'refused' && isList(draft) ? suggestion.reason : undefined;

  const submit = () => {
    const found = customFieldDraftErrors(draft);
    setErrors(found);
    if (typeProblem || Object.values(found).some(Boolean)) {
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
            draft={draft}
            errors={{ ...errors, name: errors.name ?? nameError ?? undefined, type: typeProblem }}
            idPrefix={testId}
            saving={isSaving}
            types={types}
            compact
            onChange={change}
            onClearErrors={(which) =>
              setErrors((current) =>
                Object.fromEntries(
                  Object.entries(current).filter(([property]) =>
                    which === 'name' ? property !== 'name' : !isSettingsProblem(property),
                  ),
                ),
              )
            }
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
