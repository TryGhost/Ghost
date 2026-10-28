import { Button } from '@tryghost/shade/components';
import {
  type CustomFieldDraft,
  customFieldErrors,
  draftOf,
} from '@/shared/member-custom-fields/custom-field-draft';
import { CustomFieldForm } from '@/shared/member-custom-fields/custom-field-form';
import {
  cleanListOptions,
  holdsSeveralAnswers,
  optionsFromCells,
} from '@/shared/member-custom-fields/list-options';

import { useState } from 'react';
import type {
  MemberCustomField,
  NewMemberCustomField,
} from '@tryghost/admin-x-framework/api/member-custom-fields';

interface CreateCustomFieldFormProps {
  // Where the name starts: an import's column header, or what was typed into a search.
  initialName: string;
  // Answers already held somewhere, such as an import column's cells, which a list field
  // takes its options from.
  cells?: string[];
  // The types this place can use; one pins it.
  types?: MemberCustomField['type'][];
  // The request in flight and what came back of it. Owned by the place, which runs the
  // create: this asks for a field and shows what it is told, and knows nothing about how
  // either happens.
  isSaving: boolean;
  // On the name input, for a refusal the publisher can fix by typing.
  nameError: string | null;
  // Below the form, for one they cannot.
  saveError: string | null;
  // False once a refusal cannot be argued with — a site at its field ceiling — so the
  // button stops inviting the same doomed request.
  canRetry: boolean;
  onSubmit: (field: NewMemberCustomField) => void;
  // Editing answers the last refusal: it was about what was there before.
  onEdit: () => void;
  onCancel: () => void;
}

/**
 * A field created without leaving what the publisher was doing: the same form Settings
 * uses, with its own buttons. Given cells, a list starts from the answers they hold, so a
 * publisher reviews what is already there rather than typing it out again.
 *
 * Holds only what is being typed. Whether a name is acceptable is the server's answer — it
 * owns the rule and the sentence for breaking it, and a copy here would be a second opinion
 * that could disagree.
 */
export function CreateCustomFieldForm({
  initialName,
  cells = [],
  types,
  isSaving,
  nameError,
  saveError,
  canRetry,
  onSubmit,
  onEdit,
  onCancel,
}: CreateCustomFieldFormProps) {
  const [draft, setDraft] = useState<CustomFieldDraft>(() => {
    // Cells with commas read as several answers each.
    const multiple = holdsSeveralAnswers(cells);
    return {
      ...draftOf(),
      name: initialName,
      type: types?.[0] ?? draftOf().type,
      options: optionsFromCells(cells, multiple),
      multiple,
    };
  });
  // Bumped when switching to several answers or back suggests the options again.
  const [suggestion, setSuggestion] = useState(0);
  // Whether the options are still the ones suggested from the cells. Once the publisher has
  // touched them they are theirs, and switching answers no longer replaces them.
  const [optionsSuggested, setOptionsSuggested] = useState(true);
  // The draft's own problems, found on Save; a refusal from the server comes in as nameError.
  const [errors, setErrors] = useState<{ name?: string; options?: string }>({});

  const change = (next: Partial<CustomFieldDraft>) => {
    if (next.name !== undefined) {
      onEdit();
    }
    if (next.options !== undefined) {
      setOptionsSuggested(false);
    }
    if (optionsSuggested && next.multiple !== undefined && next.multiple !== draft.multiple) {
      const multiple = next.multiple;
      setDraft((current) => ({ ...current, ...next, options: optionsFromCells(cells, multiple) }));
      setSuggestion((count) => count + 1);
      return;
    }
    setDraft((current) => ({ ...current, ...next }));
  };

  const submit = () => {
    const isList = draft.type === 'list';
    const found = customFieldErrors(draft);
    setErrors(found);
    if (found.name || found.options) {
      return;
    }
    onSubmit({
      name: draft.name.trim(),
      type: draft.type,
      access: { member: draft.access },
      ...(isList ? { options: cleanListOptions(draft.options), multiple: draft.multiple } : {}),
    });
  };

  return (
    <div
      className="space-y-5"
      data-testid="create-custom-field"
      // Left to travel, Escape reaches the import dialog and closes the whole thing from
      // inside a form the publisher was only trying to back out of.
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          // Swallowed but not acted on mid-save, matching the Cancel button beside it:
          // backing out of a create already in flight would leave its answer nowhere.
          if (!isSaving) {
            onCancel();
          }
          return;
        }
        // Enter submits, as it would in a form — there is no form element here because
        // this sits inside the import dialog's own, and nesting one is invalid. Not when a
        // control inside has used it, as the options editor does to add one.
        if (event.key === 'Enter' && !event.defaultPrevented && !isSaving && canRetry) {
          event.preventDefault();
          submit();
        }
      }}
    >
      <CustomFieldForm
        draft={draft}
        errors={{ name: errors.name ?? nameError ?? undefined, options: errors.options }}
        idPrefix="create-custom-field"
        optionsVersion={suggestion}
        types={types}
        compact
        onChange={change}
        onClearError={(key) => setErrors((current) => ({ ...current, [key]: undefined }))}
      />

      <div className="flex items-center justify-end gap-2">
        <Button disabled={isSaving} size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={isSaving || !canRetry} size="sm" onClick={submit}>
          {isSaving ? 'Saving' : 'Save'}
        </Button>
      </div>

      {saveError && (
        <p className="text-sm text-destructive" role="alert">
          {saveError}
        </p>
      )}
    </div>
  );
}
