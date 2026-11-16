import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  CALLING_CODES,
  hasOnlyPhoneCharacters,
  holdNumber,
  phoneCountryOptions,
  pickCountry,
  shownCountry,
  startPhoneEntry,
  typeNumber,
  type PhoneEntry,
} from '@tryghost/metafield-types/phone';

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

    /* A phone number's country and number, side by side as one input. */
    .gh-portal-phone-input {
        display: flex;
        flex: 1;
        min-width: 0;
    }

    /* The country, shown as its calling code, takes only the room it needs. */
    .gh-portal-input-group-row .gh-portal-input-section.gh-portal-phone-country {
        flex: 0 0 auto;
    }

    .gh-portal-phone-country .gh-portal-listpicker-trigger {
        flex: 0 0 auto;
        min-width: 0;
    }

    /* Lifted while in use, above the number even when the number is focused or refused, which
       lifts it too, so the country's border shows whole against the number's. */
    .gh-portal-phone-country .gh-portal-listpicker-field:focus-within,
    .gh-portal-phone-country .gh-portal-listpicker.is-open .gh-portal-listpicker-field {
        z-index: 2;
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
 * The input each text format is typed into: an input of that type, or for a phone number a phone
 * input beside a choice of the country it is from, so a member can write it as they would at home.
 */
const TEXT_INPUT: { [F in TextFormat]: TextInput } = {
  line: { type: 'text' },
  code: { type: 'text' },
  long: { type: 'textarea' },
  phone: { type: 'phone' },
};

interface TextInput {
  type: 'text' | 'textarea' | 'phone';
}

type LeafInput = TextInput | { type: 'select'; options: { value: string; label: string }[] };

/** A leaf's input as a field draws it: what it holds, what it's called, and how it reads out. */
type DrawnLeaf = LeafInput & {
  value: string;
  label: string;
  name: string;
  hideLabel?: boolean;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string | undefined;
  readOnly?: boolean;
};

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
 * A field's error messages, shown under its inputs. Portal puts short errors such as a missing
 * name beside the label, but there is no room there for a message long enough to say how to fix
 * the input. The wrapper is a polite live region that stays mounted while the field is shown, so
 * a screen reader announces an error that appears while focus is in the input, such as one shown
 * while typing.
 */
function FieldErrors({ id, messages }: { id: string; messages: string[] }) {
  return (
    <div aria-live="polite">
      {messages.length > 0 && (
        <ul className="gh-portal-custom-field-errors" id={id}>
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A phone number, written beside the country it is from, as Stripe Checkout asks for one: the
 * country as its calling code, picked from a list of every country that can be searched by name or
 * by code, and the number. The list opens across the whole input. A member writes the number as
 * they would at home and the country's code goes in front, or writes it with its code, and the
 * country shown follows. The site keeps it in one international form.
 */
function PhoneInput({
  value,
  readOnly,
  onChange,
  onKeyDown,
  ...input
}: Omit<DrawnLeaf, 'type'> & {
  onChange: (text: string) => void;
  onKeyDown?: ((event: React.KeyboardEvent) => void) | undefined;
}) {
  const disabled = hasMode(['preview']) || isCookiesDisabled();
  const options = useMemo(() => phoneCountryOptions(countryOptions()), []);
  const phoneRef = useRef<HTMLDivElement>(null);
  const [entry, setEntry] = useState(() =>
    startPhoneEntry(
      value,
      navigator.languages ?? [],
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ),
  );
  // What this input last sent. A value that differs came from the site, such as the number it
  // kept after a save, and replaces what was typed.
  const sent = useRef(value);
  useEffect(() => {
    if (value !== sent.current) {
      sent.current = value;
      setEntry((current) => holdNumber(current, value));
    }
  }, [value]);

  const country = shownCountry(entry.typed, entry.picked);
  const send = (next: { entry: PhoneEntry; number: string }) => {
    setEntry(next.entry);
    sent.current = next.number;
    onChange(next.number);
  };

  return (
    <div ref={phoneRef} className="gh-portal-phone-input">
      <div className="gh-portal-input-section gh-portal-phone-country">
        <ListPicker
          alignTo={phoneRef}
          // The code alone: an emoji flag shows as two letters in Chrome and Edge on Windows.
          answerText={(code) => `+${CALLING_CODES[code]}`}
          clearable={false}
          // A number is refused as a whole, and its country is often what puts it right.
          describedBy={input.describedBy}
          disabled={disabled}
          id={`input-${input.name}-country`}
          invalid={Boolean(input.invalid)}
          label={t('Country code')}
          multiple={false}
          options={options}
          placeholder="+"
          readOnly={readOnly ?? false}
          value={country ? [country] : []}
          // The country shown, picked again, changes nothing, as a select's own option doesn't.
          onChange={([to]) => {
            if (to && to !== country) {
              send(pickCountry(entry, to));
            }
          }}
        />
      </div>
      <InputForm
        fields={[{ ...input, type: 'tel', autoComplete: 'tel', value: entry.typed, readOnly }]}
        onChange={(event: { target: { value: string } }) =>
          send(typeNumber(entry, event.target.value))
        }
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

/**
 * A leaf's input, beside any others of its row: a phone number as its country and its number, and
 * anything else as one input. Declared here rather than inside a field: a component made afresh on
 * every render is a new type each time, so React would replace the inputs on every keystroke and
 * take the member's focus with them.
 */
function LeafInputs({
  leaf,
  onChange,
  onKeyDown,
}: {
  leaf: DrawnLeaf;
  onChange: (text: string) => void;
  onKeyDown?: ((event: React.KeyboardEvent) => void) | undefined;
}) {
  if (leaf.type === 'phone') {
    return <PhoneInput {...leaf} onChange={onChange} onKeyDown={onKeyDown} />;
  }
  return (
    <InputForm
      fields={[leaf]}
      onChange={(event: { target: { value: string } }) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

/** A field that holds one value: one input, or a phone number's country and number. */
function ScalarField({ field, value, errors, onChange, onKeyDown }: FieldProps<'scalar'>) {
  const name = `custom:${field.key}`;
  const held = scalarValue(value);
  const input = leafInput(FIELD_STRUCTURES[field.type].leaf, held || undefined);
  // A phone number is validated while typing only for invalid characters, such as a letter, which
  // needs no knowledge of any country's numbers. Whether the number itself is valid is left to
  // the server. An error about the current input takes precedence over the server's error about
  // the last value sent.
  const mistyped =
    input.type === 'phone' && !hasOnlyPhoneCharacters(held)
      ? t('Enter the phone number using only digits, spaces and symbols like + - ( ).')
      : undefined;
  const error = mistyped ?? errors[name];
  const errorsId = `custom-${field.key}-errors`;
  const leaf: DrawnLeaf = {
    ...input,
    value: held,
    label: field.name,
    name,
    invalid: Boolean(error),
    describedBy: error ? errorsId : undefined,
    readOnly: field.readOnly,
  };
  return (
    <>
      {leaf.type === 'phone' ? (
        // A phone number's country and number are one input to the eye, under the field's label.
        <section className="gh-portal-input-section">
          <div className="gh-portal-input-labelcontainer">
            <label className="gh-portal-input-label" htmlFor={`input-${name}`}>
              {field.name}
            </label>
          </div>
          <div className="gh-portal-input-group">
            <div className="gh-portal-input-group-row">
              <LeafInputs
                leaf={{ ...leaf, hideLabel: true }}
                onChange={onChange}
                onKeyDown={onKeyDown}
              />
            </div>
          </div>
        </section>
      ) : (
        <LeafInputs leaf={leaf} onChange={onChange} onKeyDown={onKeyDown} />
      )}
      <FieldErrors id={errorsId} messages={error ? [error] : []} />
    </>
  );
}

interface RecordRowProps {
  parts: readonly string[];
  input: (part: string) => DrawnLeaf;
  onChange: (part: string, value: string) => void;
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
      {parts.map((part) => (
        <LeafInputs
          key={part}
          leaf={input(part)}
          onChange={(text) => onChange(part, text)}
          onKeyDown={onKeyDown}
        />
      ))}
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
  // Every part a type declares has a label; a part this build has none for goes by its name.
  const labelOf = (part: string) => labels[part] ?? part;

  const input = (part: string): DrawnLeaf => {
    const leaf = leaves[part];
    const label = labelOf(part);
    return {
      ...(leaf ? leafInput(leaf, held[part], field.countries) : { type: 'text' }),
      value: held[part] ?? '',
      // The part's label is read by assistive tech and shown as the placeholder; the
      // field's own name labels the group.
      label,
      hideLabel: true,
      placeholder: label,
      name: nameOf(part),
      invalid: Boolean(errors[nameOf(part)]),
      // A refused part is read out with the reasons listed under the field, since its own
      // reason is not printed beside it.
      describedBy: errors[nameOf(part)] ? errorsId : undefined,
      readOnly,
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
            onChange={(part, changed) => onChange({ ...compositeValue(value), [part]: changed })}
            onKeyDown={onKeyDown}
          />
        ))}
      </div>
      <FieldErrors
        id={errorsId}
        messages={refused.map(({ part, message }) => `${labelOf(part)}: ${message}`)}
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
        options={settings.options.map((option) => ({ value: option, label: option }))}
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
