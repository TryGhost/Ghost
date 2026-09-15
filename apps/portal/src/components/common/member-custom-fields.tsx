import React from 'react';
import { subFieldsOf } from '@tryghost/metafield-types/structure';

import InputForm from './input-form';
import { customFieldPartLabel } from '../../utils/helpers';
import type { CustomFieldValue, DrawableCustomField } from '../../utils/custom-fields';

/**
 * How an address is laid out: the short parts share a row, as Stripe's checkout does.
 * Presentation only; which parts exist, and the order they are shown in, comes from
 * the field type. A part this layout does not name gets a row of its own, so a part
 * added to the type is still there to fill in.
 */
const ADDRESS_ROWS = [['line1'], ['line2'], ['city', 'state'], ['postal_code', 'country']];

interface FieldInput {
  type: string;
  value: string;
  label: string;
  name: string;
  readOnly: boolean;
  hideLabel?: boolean;
  placeholder?: string;
  errorMessage: string;
  part?: string;
}

function addressRows(inputs: FieldInput[]): FieldInput[][] {
  const named = ADDRESS_ROWS.flat();
  const rows = ADDRESS_ROWS.map((parts) =>
    inputs.filter((input) => input.part && parts.includes(input.part)),
  );
  inputs
    .filter((input) => !input.part || !named.includes(input.part))
    .forEach((input) => rows.push([input]));
  return rows.filter((row) => row.length > 0);
}

/** One input for a field that holds a single thing, one per part for a composite. */
function inputsFor(
  field: DrawableCustomField,
  value: CustomFieldValue,
  errors: Record<string, string | undefined>,
): FieldInput[] {
  const readOnly = field.access.member !== 'write';
  const parts = subFieldsOf(field.type);

  if (!parts) {
    const name = `custom:${field.key}`;
    return [
      {
        type: field.type === 'long_text' ? 'textarea' : 'text',
        value: (value as string | undefined) ?? '',
        label: field.name,
        name,
        errorMessage: errors[name] ?? '',
        readOnly,
      },
    ];
  }

  const held = value as Record<string, string | undefined> | undefined;
  return parts.map((part) => {
    const label = customFieldPartLabel(part);
    const name = `custom:${field.key}:${part}`;
    return {
      type: 'text',
      value: held?.[part] ?? '',
      // The part's label is read by assistive tech and shown as the placeholder; the
      // field's own name labels the group.
      label,
      hideLabel: true,
      placeholder: label,
      name,
      errorMessage: errors[name] ?? '',
      readOnly,
      part,
    };
  });
}

interface MemberCustomFieldsProps {
  fields: DrawableCustomField[];
  values: Record<string, CustomFieldValue>;
  /** What the site refused, keyed by input name. */
  errors: Record<string, string | undefined>;
  onChange: (field: DrawableCustomField, part: string | null, value: string) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * The fields a publisher has opened to members, as the member fills them in.
 *
 * A field that holds one thing is one input. A composite is several under one name, laid
 * out as rows with their borders merged so the group reads as a single field, the way an
 * address is filled in at a checkout.
 */
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
        const inputs = inputsFor(field, values[field.key], errors);
        const handleChange = (event: { target: { value: string } }, input: FieldInput) =>
          onChange(field, input.part ?? null, event.target.value);

        if (!subFieldsOf(field.type)) {
          return (
            <InputForm
              key={field.key}
              fields={inputs}
              onChange={handleChange}
              onKeyDown={onKeyDown}
            />
          );
        }

        const labelId = `custom-${field.key}-label`;
        return (
          <section key={field.key} aria-labelledby={labelId} role="group">
            <div className="gh-portal-input-label" id={labelId}>
              {field.name}
            </div>
            <div className="gh-portal-input-group">
              {addressRows(inputs).map((row) => (
                <div key={row[0]!.part ?? row[0]!.name} className="gh-portal-input-group-row">
                  <InputForm fields={row} onChange={handleChange} onKeyDown={onKeyDown} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
