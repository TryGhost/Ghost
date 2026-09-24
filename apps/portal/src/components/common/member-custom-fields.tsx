import React from 'react';
import type { Address } from '@tryghost/metafield-types';
import { FIELD_PARTS } from '@tryghost/metafield-types/structure';
import type { FieldType } from '@tryghost/metafield-types/structure';

import InputForm from './input-form';
import { countryOptions } from '../../utils/countries';
import { t } from '../../utils/i18n';
import { compositeValue, scalarValue } from '../../utils/custom-fields';
import type { CustomFieldValue, DrawableCustomField } from '../../utils/custom-fields';

export const MemberCustomFieldsStyles = `
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
`;

/** Every part is named, and the compiler says so: a part added to the type wants one. */
const addressLabels = (): Record<keyof Address, string> => ({
  line1: t('Address line 1'),
  line2: t('Address line 2'),
  city: t('City'),
  state: t('State'),
  postal_code: t('Postal code'),
  country: t('Country'),
});

interface FieldProps {
  field: DrawableCustomField;
  value: CustomFieldValue;
  /** What the site refused, keyed by the name of the input that holds it. */
  errors: Record<string, string | undefined>;
  onChange: (field: DrawableCustomField, part: string | null, value: string) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/** A field that holds a single thing: one input, carrying its own reason. */
function ScalarField({ field, value, errors, onChange, onKeyDown }: FieldProps) {
  const name = `custom:${field.key}`;
  return (
    <InputForm
      fields={[
        {
          type: field.type === 'long_text' ? 'textarea' : 'text',
          value: scalarValue(value),
          label: field.name,
          name,
          errorMessage: errors[name] ?? '',
          readOnly: field.access.member !== 'write',
        },
      ]}
      onChange={(event: { target: { value: string } }) => onChange(field, null, event.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

interface AddressRowProps {
  parts: (keyof Address)[];
  input: (part: keyof Address) => Record<string, unknown>;
  onChange: (part: string | null, value: string) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * One row of an address. Declared here rather than inside the field: a component made
 * afresh on every render is a new type each time, so React would replace the row's
 * inputs on every keystroke and take the member's focus with them.
 */
function AddressRow({ parts, input, onChange, onKeyDown }: AddressRowProps) {
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
 * An address: several inputs drawn as one field, their borders merged so the group reads
 * as a single thing.
 *
 * A refused part is marked but says nothing beside itself. The reasons are listed under
 * the whole field, in the order the parts are shown, each naming the part it belongs to,
 * so the group keeps its shape however many parts are wrong.
 */
function AddressField({ field, value, errors, onChange, onKeyDown }: FieldProps) {
  const held = compositeValue(value);
  const labels = addressLabels();
  const readOnly = field.access.member !== 'write';
  const labelId = `custom-${field.key}-label`;
  const errorsId = `custom-${field.key}-errors`;
  const nameOf = (part: keyof Address) => `custom:${field.key}:${part}`;

  const input = (part: keyof Address) => {
    const isCountry = FIELD_PARTS.address[part] === 'country_code';
    return {
      type: isCountry ? 'select' : 'text',
      options: isCountry ? countryOptions(held?.[part]) : undefined,
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

  const rowProps = {
    input,
    onChange: (part: string | null, changed: string) => onChange(field, part, changed),
    onKeyDown,
  };

  // The form, written out. Nothing else states how an address is laid out, and the
  // reasons below read their order from these same rows, so the order a member sees and
  // the order they are listed in cannot come apart.
  const rows: React.ReactElement<AddressRowProps>[] = [
    <AddressRow {...rowProps} key="line1" parts={['line1']} />,
    <AddressRow {...rowProps} key="line2" parts={['line2']} />,
    <AddressRow {...rowProps} key="city" parts={['city', 'state']} />,
    <AddressRow {...rowProps} key="postal_code" parts={['postal_code', 'country']} />,
  ];

  const refused = rows
    .flatMap((row) => row.props.parts)
    .flatMap((part) => {
      const message = errors[nameOf(part)];
      return message ? [{ part, message }] : [];
    });

  return (
    <section aria-labelledby={labelId} role="group">
      <div className="gh-portal-input-label" id={labelId}>
        {field.name}
      </div>
      <div className="gh-portal-input-group">{rows}</div>
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

interface MemberCustomFieldsProps {
  fields: DrawableCustomField[];
  values: Record<string, CustomFieldValue>;
  errors: Record<string, string | undefined>;
  onChange: (field: DrawableCustomField, part: string | null, value: string) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Which component draws which type. Stated as a whole rather than as a fallback, so a
 * type added to the catalog stops this compiling until something here knows how to draw
 * it, instead of being rendered as whatever the last branch happened to be.
 */
const DRAWN_BY = {
  address: AddressField,
  short_text: ScalarField,
  long_text: ScalarField,
} satisfies Record<FieldType, React.ComponentType<FieldProps>>;

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
      {fields.map((field) => {
        const Field = DRAWN_BY[field.type];
        return (
          <Field
            key={field.key}
            errors={errors}
            field={field}
            value={values[field.key]}
            onChange={onChange}
            onKeyDown={onKeyDown}
          />
        );
      })}
    </>
  );
}
