import React, { useState } from 'react';
import ListOptionsEditor from '@/shared/member-custom-fields/list-options-editor';
import { type OptionRow, optionRow } from '@/shared/member-custom-fields/list-option-row';
import { REPEATED_OPTION } from '@/shared/member-custom-fields/custom-field-draft';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  Switch,
} from '@tryghost/shade/components';
import { SHAPE_SETTINGS } from '@tryghost/metafield-types';
import { optionText, type SetSettings } from '@tryghost/metafield-types/structure';

interface ListInputs {
  options: OptionRow[];
  /** What is typed into the new option input but not yet added. */
  newOption: string;
  multiple: boolean;
}

/** The settings the inputs ask for, with text typed but not yet added saved as an option too. */
const settingsOf = ({ options, newOption, multiple }: ListInputs): SetSettings => {
  const texts = options.map((row) => optionText(row.text));
  const typed = optionText(newOption);
  return {
    options: typed === '' || texts.includes(typed) ? texts : [...texts, typed],
    multiple,
  };
};

/**
 * Each row's problem, by its position. A repeat is marked on the later of two rows with the same
 * text, which can be a saved row whose text can't change, so it is moved to the row with that text
 * that can be changed.
 */
const rowErrors = (
  options: readonly OptionRow[],
  errors: Readonly<Record<string, string | undefined>>,
): Array<string | undefined> => {
  const found = options.map((_, index) => errors[`options.${index}`]);
  options.forEach((row, index) => {
    if (!row.saved || found[index] !== REPEATED_OPTION) {
      return;
    }
    const text = optionText(row.text);
    const editable = options.findIndex(
      (other, at) => !other.saved && !found[at] && optionText(other.text) === text,
    );
    if (editable !== -1) {
      found[editable] = REPEATED_OPTION;
      found[index] = undefined;
    }
  });
  return found;
};

/**
 * What a list field is set up with: the options it offers, in order, and whether a member can pick
 * more than one. The inputs keep their own state, starting from the settings a field already has,
 * and report the settings they would save whenever they change.
 */
const ListFieldSettings: React.FC<{
  /** The field's settings as saved, for a list being edited. */
  saved?: SetSettings;
  /**
   * What the inputs start from, when it isn't what is saved: a new list's defaults, or settings
   * suggested for it, such as the options an import column holds.
   */
  initial?: SetSettings;
  /**
   * Problems with the settings, by where they are within them: '' for the settings as a whole,
   * `options` for the options as a whole, `options.2` for the third option, and `multiple` for
   * the switch.
   */
  errors?: Readonly<Record<string, string | undefined>>;
  disabled?: boolean;
  // Prefixes the inputs' ids, as the form's other inputs are.
  idPrefix: string;
  onChange: (settings: SetSettings) => void;
}> = ({ saved, initial, errors = {}, disabled, idPrefix, onChange }) => {
  const start = initial ?? saved ?? SHAPE_SETTINGS.set.defaults;
  const [inputs, setInputs] = useState<ListInputs>(() => ({
    // An option the field is saved with keeps its text, as the field keeps its type.
    options: start.options.map((text) => optionRow(text, saved?.options.includes(text))),
    newOption: '',
    multiple: start.multiple,
  }));

  const update = (changes: Partial<ListInputs>) => {
    const next = { ...inputs, ...changes };
    setInputs(next);
    onChange(settingsOf(next));
  };

  return (
    <>
      <ListOptionsEditor
        disabled={disabled}
        error={errors[''] ?? errors.options}
        idPrefix={idPrefix}
        newOption={inputs.newOption}
        // Text typed but not yet added is saved as the last option, so a problem one past the
        // options added is about it.
        newOptionError={errors[`options.${inputs.options.length}`]}
        optionErrors={rowErrors(inputs.options, errors)}
        options={inputs.options}
        savedOptions={saved?.options}
        onChange={({ options, newOption }) => update({ options, newOption })}
      />
      <Field data-disabled={disabled || undefined} orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor={`${idPrefix}-multiple`}>Allow multiple answers</FieldLabel>
          <FieldDescription>
            {inputs.multiple
              ? 'Members can choose more than one option.'
              : 'Members choose one option.'}
            {saved?.multiple && !inputs.multiple && (
              <> Members who chose several keep them until they next answer.</>
            )}
          </FieldDescription>
          {errors.multiple && <FieldError>{errors.multiple}</FieldError>}
        </FieldContent>
        <Switch
          checked={inputs.multiple}
          disabled={disabled}
          id={`${idPrefix}-multiple`}
          onCheckedChange={(multiple) => update({ multiple })}
        />
      </Field>
    </>
  );
};

export default ListFieldSettings;
