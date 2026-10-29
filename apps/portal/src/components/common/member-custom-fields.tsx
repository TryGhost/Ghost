import React from 'react';
import {
  FIELD_STRUCTURES,
  editableAnswers,
  inOptionOrder,
  matchField,
  matchLeaf,
  type FieldTypeOfShape,
  type Leaf,
  type ListSource,
  type PartsOf,
  type SetSettings,
  type TextSize,
} from '@tryghost/metafield-types/structure';

import ChoicePicker, { ChoicePickerStyles } from './choice-picker';
import InputForm from './input-form';
import { countryOptions } from '../../utils/countries';
import { hasMode } from '../../utils/check-mode';
import { isCookiesDisabled } from '../../utils/helpers';
import { t } from '../../utils/i18n';
import { compositeValue, listValue, scalarValue } from '../../utils/custom-fields';
import type { CustomFieldValue, MemberCustomField } from '../../utils/custom-fields';

export const MemberCustomFieldsStyles =
  `
    .gh-portal-custom-field-errors {
        list-style: none;
        margin: 4px 0 0;
        padding: 0;
    }

    .gh-portal-custom-field-errors li {
        color: var(--red);
        font-size: 1.3rem;
        letter-spacing: 0.35px;
        line-height: 1.6em;
        margin: 0;
    }
` + ChoicePickerStyles;

type RecordFieldType = FieldTypeOfShape<'record'>;

/** How each list a choice picks from is offered to a member, given the key they hold. */
const LIST_OPTIONS: {
  [F in ListSource]: (held?: string) => { value: string; label: string }[];
} = {
  countries: (held) => countryOptions(held),
};

const TEXT_INPUT: { [S in TextSize]: 'text' | 'textarea' } = {
  line: 'text',
  code: 'text',
  long: 'textarea',
};

interface LeafInput {
  type: 'text' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
}

const leafInput = (leaf: Leaf, held: string | undefined): LeafInput =>
  matchLeaf<LeafInput>(leaf, {
    text: ({ size }) => ({ type: TEXT_INPUT[size] }),
    choice: ({ from }) => ({ type: 'select', options: LIST_OPTIONS[from](held) }),
  });

/**
 * How each record type is laid out for a member: a label for every part, and the rows the parts
 * are drawn in. Labels are typed against the parts the catalog declares, so a part added there
 * fails to compile here until it has one.
 */
const RECORD_FORMS: {
  [T in RecordFieldType]: {
    labels: () => Record<PartsOf<T>, string>;
    rows: readonly (readonly PartsOf<T>[])[];
  };
} = {
  address: {
    labels: () => ({
      line1: t('Address line 1'),
      line2: t('Address line 2'),
      city: t('City'),
      state: t('State'),
      postal_code: t('Postal code'),
      country: t('Country'),
    }),
    rows: [['line1'], ['line2'], ['city', 'state'], ['postal_code', 'country']],
  },
};

interface FieldProps {
  field: MemberCustomField;
  value: CustomFieldValue;
  /** What the site refused, keyed by the name of the input that holds it. */
  errors: Record<string, string | undefined>;
  /** The field's whole value once a member changes it, in the shape its type keeps. */
  onChange: (field: MemberCustomField, value: CustomFieldValue) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/** A field that holds one value: one input, carrying its own reason. */
function ScalarField({
  field,
  value,
  errors,
  onChange,
  onKeyDown,
  leaf,
}: FieldProps & { leaf: Leaf }) {
  const name = `custom:${field.key}`;
  const held = scalarValue(value);
  return (
    <InputForm
      fields={[
        {
          ...leafInput(leaf, held || undefined),
          value: held,
          label: field.name,
          name,
          errorMessage: errors[name] ?? '',
          readOnly: field.access.member !== 'write',
        },
      ]}
      onChange={(event: { target: { value: string } }) => onChange(field, event.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

interface RecordRowProps {
  parts: readonly string[];
  input: (part: string) => Record<string, unknown>;
  onChange: (part: string | null, value: string) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * One row of a record. Declared here rather than inside the field: a component made afresh on
 * every render is a new type each time, so React would replace the row's inputs on every
 * keystroke and take the member's focus with them.
 */
function RecordRow({ parts, input, onChange, onKeyDown }: RecordRowProps) {
  return (
    <div className="gh-portal-input-group-row">
      <InputForm
        fields={parts.map(input)}
        onChange={(event: { target: { value: string } }, changed: { part?: string }) =>
          onChange(changed.part ?? null, event.target.value)
        }
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

/**
 * A record: several inputs drawn as one field, their borders merged so the group reads as a single
 * thing. A part its rows leave out is drawn on a row of its own at the end, so no part a member can
 * hold is left without an input.
 *
 * A refused part is marked but says nothing beside itself. The reasons are listed under the whole
 * field, in the order the parts are shown, each naming the part it belongs to, so the group keeps
 * its shape however many parts are wrong.
 */
function RecordField({
  field,
  value,
  errors,
  onChange,
  onKeyDown,
  type,
}: FieldProps & { type: RecordFieldType }) {
  const held = compositeValue(value);
  const labels: Record<string, string> = RECORD_FORMS[type].labels();
  const leaves: Record<string, Leaf | undefined> = FIELD_STRUCTURES[type].parts;
  const laidOut: readonly (readonly string[])[] = RECORD_FORMS[type].rows;
  const placed = laidOut.flat();
  const rowsOfParts = [
    ...laidOut,
    ...Object.keys(leaves)
      .filter((part) => !placed.includes(part))
      .map((part) => [part]),
  ];
  const readOnly = field.access.member !== 'write';
  const labelId = `custom-${field.key}-label`;
  const errorsId = `custom-${field.key}-errors`;
  const nameOf = (part: string) => `custom:${field.key}:${part}`;

  const input = (part: string) => {
    const leaf = leaves[part];
    return {
      ...(leaf ? leafInput(leaf, held?.[part]) : { type: 'text' }),
      value: held?.[part] ?? '',
      // The part's label is read by assistive tech and shown as the placeholder; the
      // field's own name labels the group.
      label: labels[part],
      hideLabel: true,
      placeholder: labels[part],
      name: nameOf(part),
      invalid: Boolean(errors[nameOf(part)]),
      // A refused part is read out with the reasons listed under the field, since its own
      // reason is not printed beside it.
      describedBy: errors[nameOf(part)] ? errorsId : undefined,
      readOnly,
      part,
    };
  };

  const refused = rowsOfParts.flat().flatMap((part) => {
    const message = errors[nameOf(part)];
    return message ? [{ part, message }] : [];
  });

  return (
    <section aria-labelledby={labelId} role="group">
      <div className="gh-portal-input-label" id={labelId}>
        {field.name}
      </div>
      <div className="gh-portal-input-group">
        {rowsOfParts.map((parts) => (
          <RecordRow
            key={parts.join(':')}
            input={input}
            parts={parts}
            onChange={(part, changed) =>
              part !== null && onChange(field, { ...held, [part]: changed })
            }
            onKeyDown={onKeyDown}
          />
        ))}
      </div>
      {refused.length > 0 && (
        <ul className="gh-portal-custom-field-errors" id={errorsId}>
          {refused.map(({ part, message }) => (
            <li key={part}>{`${labels[part]}: ${message}`}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * A list: one option or several, picked from a list that opens under the field. Only the options
 * the field offers now are drawn, so an answer to one it no longer offers is replaced by the
 * member's next. A field that has gone from several answers to one reads as unanswered while the
 * member holds several, and nothing is sent for it until they pick one. A member who may only
 * read the field sees every answer they hold that it still offers.
 */
function ListField({
  field,
  value,
  errors,
  onChange,
  settings,
}: FieldProps & { settings: SetSettings }) {
  const name = `custom:${field.key}`;
  const held = listValue(value);
  const readOnly = field.access.member !== 'write';
  // A member who may only read the field sees every answer it still offers; one who may change it
  // starts from what a form edits.
  const picked = readOnly ? inOptionOrder(settings, held) : editableAnswers(settings, held);
  const error = errors[name];
  const id = `input-${name}`;
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  return (
    <section className="gh-portal-input-section">
      <div className="gh-portal-input-labelcontainer">
        {readOnly ? (
          <div className="gh-portal-input-label" id={labelId}>
            {field.name}
          </div>
        ) : (
          <label className="gh-portal-input-label" htmlFor={id} id={labelId}>
            {field.name}
          </label>
        )}
        {error && <p id={errorId}>{error}</p>}
      </div>
      <ChoicePicker
        describedBy={error ? errorId : undefined}
        disabled={hasMode(['preview']) || isCookiesDisabled()}
        id={id}
        invalid={Boolean(error)}
        label={field.name}
        labelId={labelId}
        multiple={settings.multiple}
        options={settings.options}
        placeholder={t('Choose an option')}
        readOnly={readOnly}
        value={picked}
        onChange={(next) => onChange(field, next)}
      />
    </section>
  );
}

interface MemberCustomFieldsProps {
  fields: MemberCustomField[];
  values: Record<string, CustomFieldValue>;
  errors: Record<string, string | undefined>;
  /** The field's whole value once a member changes it, in the shape its type keeps. */
  onChange: (field: MemberCustomField, value: CustomFieldValue) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/** A field drawn from the blocks its type is composed of. */
function DrawnField(props: FieldProps) {
  return matchField<MemberCustomField, React.ReactElement>(props.field, {
    scalar: ({ type }) => <ScalarField {...props} leaf={FIELD_STRUCTURES[type].leaf} />,
    record: ({ type }) => <RecordField {...props} type={type} />,
    set: ({ settings }) => <ListField {...props} settings={settings} />,
  });
}

/** The fields a publisher has opened to members, as the member fills them in. */
export default function MemberCustomFields({
  fields,
  values,
  errors,
  onChange,
  onKeyDown,
}: MemberCustomFieldsProps) {
  return (
    <>
      {fields.map((field) => (
        <DrawnField
          key={field.key}
          errors={errors}
          field={field}
          value={values[field.key]}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      ))}
    </>
  );
}
