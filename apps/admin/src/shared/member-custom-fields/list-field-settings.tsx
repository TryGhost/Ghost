import React, { useState } from 'react';
import ListOptionsEditor from '@/shared/member-custom-fields/list-options-editor';
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
  options: string[];
  /** What is typed into the new option input but not yet added. */
  newOption: string;
  multiple: boolean;
}

/** The settings the inputs ask for, with text typed but not yet added saved as an option too. */
const settingsOf = ({ options, newOption, multiple }: ListInputs): SetSettings => {
  const typed = optionText(newOption);
  return {
    options: typed === '' || options.includes(typed) ? options : [...options, typed],
    multiple,
  };
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
  const [inputs, setInputs] = useState<ListInputs>({
    options: start.options,
    newOption: '',
    multiple: start.multiple,
  });

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
        optionErrors={inputs.options.map((_, index) => errors[`options.${index}`])}
        options={inputs.options}
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
