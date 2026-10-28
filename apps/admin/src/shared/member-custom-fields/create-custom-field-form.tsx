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
  // False once a refusal cannot be argued with, such as a site at its field ceiling, so the
  // button stops inviting the same doomed request.
  canRetry: boolean;
  onSubmit: (field: NewMemberCustomField) => void;
  // Editing answers the last refusal: it was about what was there before.
  onEdit: () => void;
  onCancel: () => void;
  testId?: string;
}

/**
 * A field created without leaving what the publisher was doing: the same form Settings
 * uses, with its own buttons, shown in the create popover. Given cells, a list starts from
 * the answers they hold, so a publisher reviews what is already there rather than typing it
 * out again.
 *
 * Checks only what a draft can tell about itself, an empty name or a list's options, with
 * the same `customFieldErrors` Settings uses. Whether a name is already taken is the
 * server's answer, and comes back as `nameError`.
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
  testId = 'create-custom-field',
}: CreateCustomFieldFormProps) {
  const [draft, setDraft] = useState<CustomFieldDraft>(() => {
    const type = types?.[0] ?? draftOf().type;
    // A list's options come from the cells, read only once the field is a list: an import
    // column can hold thousands of rows, and most fields made from one are not lists.
    const multiple = type === 'list' && holdsSeveralAnswers(cells);
    return {
      ...draftOf(),
      name: initialName,
      type,
      options: type === 'list' ? optionsFromCells(cells, multiple) : [],
      multiple,
    };
  });
  // Bumped whenever the options are suggested again, since the editor keeps its own rows.
  const [suggestion, setSuggestion] = useState(0);
  // Whether the options are still the ones suggested from the cells. Once the publisher has
  // touched them they are theirs, and nothing replaces them.
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
    // Becoming a list, or switching between one and several answers, suggests the options
    // from the cells again: cells with commas read as several answers each.
    const becomesList = next.type === 'list' && draft.type !== 'list';
    const switchesAnswers = next.multiple !== undefined && next.multiple !== draft.multiple;
    if (optionsSuggested && (becomesList || switchesAnswers)) {
      const multiple = next.multiple ?? holdsSeveralAnswers(cells);
      setDraft((current) => ({
        ...current,
        ...next,
        multiple,
        options: optionsFromCells(cells, multiple),
      }));
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
    // Not a form element: Admin's element styles colour every label inside a form, which
    // would set these apart from the same labels in Settings. Enter in a text input submits
    // as it would in a form, unless the input has used it, as the options editor does to
    // add one. The type menu, the switch and the buttons keep Enter for themselves. Escape
    // is the popover's, which closes it unless a save is in flight.
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
