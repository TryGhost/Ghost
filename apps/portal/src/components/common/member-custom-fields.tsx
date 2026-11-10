import React from 'react';
import {
  FIELD_STRUCTURES,
  editableAnswers,
  inOptionOrder,
  matchField,
  matchLeaf,
  type FieldOfShape,
  type FieldShape,
  type FieldTypeOfShape,
  type Leaf,
  type ListSource,
  type PartsOf,
  type ShapeOf,
  type TextFormat,
} from '@tryghost/metafield-types/structure';
import type { ShapeText } from '@tryghost/metafield-types/shapes';

import InputForm from './input-form';
import ListPicker from './list-picker';
import { countryOptions, countryOptionsAmong } from '../../utils/countries';
import { hasMode } from '../../utils/check-mode';
import { isCookiesDisabled } from '../../utils/helpers';
import { t } from '../../utils/i18n';
import { compositeValue, listValue, scalarValue } from '../../utils/custom-fields';
import type { CustomFieldValue, FieldInput, PartsByName } from '../../utils/custom-fields';

export const MemberCustomFieldsStyles = `
    /* A field's reasons sit right under its inputs, which give up their own gap to the next
       field so the gap comes after the reasons instead. */
    .gh-portal-custom-field {
        margin-bottom: 16px;
    }

    .gh-portal-custom-field .gh-portal-input,
    .gh-portal-custom-field .gh-portal-input-group {
        margin-bottom: 0;
    }

    .gh-portal-custom-field-errors {
        list-style: none;
        margin: 6px 0 0;
        padding: 0;
    }

    .gh-portal-custom-field-errors li {
        color: var(--red);
        font-size: 1.3rem;
        letter-spacing: 0.35px;
        line-height: 1.6em;
        margin: 0;
    }
`;

type RecordFieldType = FieldTypeOfShape<'record'>;

/**
 * How each list a choice picks from is offered to a member, given the key they hold, and the
 * countries they may choose from when fewer than all. What they hold is offered too, so they see
 * it and can pick away from it, unless they may only choose from some countries: then only those
 * are offered, so they can't pick one that would be refused.
 */
const LIST_OPTIONS: {
  [F in ListSource]: (
    held: string | undefined,
    within: readonly string[] | undefined,
  ) => { value: string; label: string }[];
} = {
  countries: (held, within) => (within ? countryOptionsAmong(within) : countryOptions(held)),
};

/**
 * The input each text format is typed into. A phone number gets a phone input, so phones show a
 * number keypad, and asks to be filled in with the member's own number.
 */
const TEXT_INPUT: { [F in TextFormat]: TextInput } = {
  line: { type: 'text' },
  code: { type: 'text' },
  long: { type: 'textarea' },
  phone: { type: 'tel', autoComplete: 'tel' },
};

interface TextInput {
  type: 'text' | 'textarea' | 'tel';
  autoComplete?: string;
}

type LeafInput = TextInput | { type: 'select'; options: { value: string; label: string }[] };

const leafInput = (
  leaf: Leaf,
  held: string | undefined,
  within?: readonly string[] | undefined,
): LeafInput =>
  matchLeaf<LeafInput>(leaf, {
    text: ({ format }) => TEXT_INPUT[format],
    choice: ({ from }) => ({ type: 'select', options: LIST_OPTIONS[from](held, within) }),
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

/** What a field of shape `S` is drawn from. */
interface FieldProps<S extends FieldShape> {
  field: FieldOfShape<S, FieldInput>;
  value: CustomFieldValue;
  /** What the site refused, keyed by the name of the input that holds it. */
  errors: Record<string, string | undefined>;
  /** What the field's inputs hold once a member changes one, each leaf as its text. */
  onChange: (text: ShapeText[S]) => void;
  onKeyDown?: ((event: React.KeyboardEvent) => void) | undefined;
}

/**
 * Why the site refused what a field's inputs hold, under the inputs. Beside the label, where Portal
 * puts a short reason such as a missing name, a reason long enough to say how to put it right has
 * no room.
 */
function FieldErrors({ id, messages }: { id: string; messages: string[] }) {
  if (messages.length === 0) {
    return null;
  }
  return (
    <ul className="gh-portal-custom-field-errors" id={id}>
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}

/** A field that holds one value: one input. */
function ScalarField({ field, value, errors, onChange, onKeyDown }: FieldProps<'scalar'>) {
  const name = `custom:${field.key}`;
  const held = scalarValue(value);
  const error = errors[name];
  const errorsId = `custom-${field.key}-errors`;
  return (
    <>
      <InputForm
        fields={[
          {
            ...leafInput(FIELD_STRUCTURES[field.type].leaf, held || undefined),
            value: held,
            label: field.name,
            name,
            invalid: Boolean(error),
            describedBy: error ? errorsId : undefined,
            readOnly: field.readOnly,
          },
        ]}
        onChange={(event: { target: { value: string } }) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <FieldErrors id={errorsId} messages={error ? [error] : []} />
    </>
  );
}

interface RecordRowProps {
  parts: readonly string[];
  input: (part: string) => Record<string, unknown>;
  onChange: (part: string | null, value: string) => void;
  onKeyDown?: ((event: React.KeyboardEvent) => void) | undefined;
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
function RecordField({ field, value, errors, onChange, onKeyDown }: FieldProps<'record'>) {
  const { type } = field;
  const held: PartsByName = compositeValue(value) ?? {};
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
  const { readOnly } = field;
  const labelId = `custom-${field.key}-label`;
  const errorsId = `custom-${field.key}-errors`;
  const nameOf = (part: string) => `custom:${field.key}:${part}`;

  const input = (part: string) => {
    const leaf = leaves[part];
    return {
      ...(leaf ? leafInput(leaf, held[part], field.countries) : { type: 'text' }),
      value: held[part] ?? '',
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
              part !== null && onChange({ ...compositeValue(value), [part]: changed })
            }
            onKeyDown={onKeyDown}
          />
        ))}
      </div>
      <FieldErrors
        id={errorsId}
        messages={refused.map(({ part, message }) => `${labels[part]}: ${message}`)}
      />
    </section>
  );
}

/**
 * A list, drawn with ListPicker. A member who may change the field edits the answers
 * `editableAnswers` gives, which saving sends, so an answer the picker leaves out is cleared when
 * the member saves. One who may only read the field sees the answers `inOptionOrder` gives, as
 * chips.
 */
function ListField({ field, value, errors, onChange }: FieldProps<'set'>) {
  const { settings } = field;
  const name = `custom:${field.key}`;
  const held = listValue(value);
  const { readOnly } = field;
  const picked = readOnly ? inOptionOrder(settings, held) : editableAnswers(settings, held);
  const error = errors[name];
  const id = `input-${name}`;
  const labelId = `${id}-label`;
  const errorsId = `custom-${field.key}-errors`;
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
      </div>
      <ListPicker
        describedBy={error ? errorsId : undefined}
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
        onChange={onChange}
      />
      <FieldErrors id={errorsId} messages={error ? [error] : []} />
    </section>
  );
}

/** Reports what a field's inputs hold once a member changes one, each leaf as its text. */
type CustomFieldChange = <F extends FieldInput>(
  field: F,
  text: ShapeText[ShapeOf<F['type']>],
) => void;

interface DrawnFieldProps {
  field: FieldInput;
  value: CustomFieldValue;
  errors: Record<string, string | undefined>;
  onChange: CustomFieldChange;
  onKeyDown?: ((event: React.KeyboardEvent) => void) | undefined;
}

/** A field drawn from the blocks its type is composed of, its reasons under its inputs. */
function DrawnField({ field, onChange, ...drawn }: DrawnFieldProps) {
  return (
    <div className="gh-portal-custom-field">
      {matchField<FieldInput, React.ReactElement>(field, {
        scalar: (scalar) => (
          <ScalarField {...drawn} field={scalar} onChange={(value) => onChange(scalar, value)} />
        ),
        record: (record) => (
          <RecordField {...drawn} field={record} onChange={(value) => onChange(record, value)} />
        ),
        set: (list) => (
          <ListField {...drawn} field={list} onChange={(value) => onChange(list, value)} />
        ),
      })}
    </div>
  );
}

interface MemberCustomFieldsProps {
  fields: FieldInput[];
  values: Record<string, CustomFieldValue>;
  errors: Record<string, string | undefined>;
  onChange: CustomFieldChange;
  onKeyDown?: ((event: React.KeyboardEvent) => void) | undefined;
}

/** Custom fields as a member fills them in, each read-only where they may only see it. */
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
