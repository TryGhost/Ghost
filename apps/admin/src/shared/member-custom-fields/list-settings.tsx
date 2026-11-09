import {
  FixedOptionText,
  ListOptionsEditor,
} from '@/shared/member-custom-fields/list-options-editor';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Switch,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { useCustomFieldForm } from '@/shared/member-custom-fields/custom-field-form-context';
import { withMultiple } from '@/shared/member-custom-fields/list-inputs';

function MultipleField({
  checked,
  savedMultiple = false,
  error,
  disabled,
  onChange,
}: {
  checked: boolean;
  /** Whether the field is saved taking several answers, which members keep once it stops. */
  savedMultiple?: boolean;
  error?: string;
  disabled?: boolean;
  onChange?: (multiple: boolean) => void;
}) {
  const { idPrefix } = useCustomFieldForm();
  return (
    <Field data-disabled={disabled || undefined} orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={`${idPrefix}-multiple`}>Allow multiple answers</FieldLabel>
        <FieldDescription>
          {checked ? 'Members can choose more than one option.' : 'Members choose one option.'}
          {savedMultiple && !checked && (
            <> Members who chose several keep them until they next answer.</>
          )}
        </FieldDescription>
        {error && <FieldError>{error}</FieldError>}
      </FieldContent>
      <Switch
        checked={checked}
        disabled={disabled}
        id={`${idPrefix}-multiple`}
        onCheckedChange={onChange}
      />
    </Field>
  );
}

/**
 * What a list field is set up with: the options it offers, in order, and whether a member can pick
 * more than one. Draws nothing for a field that isn't a list.
 */
export function ListField() {
  const { values, errors, idPrefix, changeList } = useCustomFieldForm();
  const { list } = values;
  if (!list) {
    return null;
  }
  return (
    <>
      <ListOptionsEditor
        errors={errors}
        idPrefix={idPrefix}
        list={list}
        onChange={changeList}
      />
      <MultipleField
        checked={list.multiple}
        error={errors.multiple}
        savedMultiple={list.saved?.multiple}
        onChange={(multiple) => changeList((current) => withMultiple(current, multiple))}
      />
    </>
  );
}

/**
 * An archived list's settings, shown as they are saved with nothing to change them, as an archived
 * field is in the list of fields. Draws nothing for a field that isn't a list.
 */
export function ArchivedListField() {
  const { list } = useCustomFieldForm().values;
  if (!list) {
    return null;
  }
  return (
    <>
      <FieldSet>
        <FieldLegend variant="label">Options</FieldLegend>
        <Stack gap="sm">
          {list.options.map((option) => (
            <FixedOptionText key={option.id} text={option.text} />
          ))}
        </Stack>
      </FieldSet>
      <MultipleField checked={list.multiple} disabled />
    </>
  );
}
