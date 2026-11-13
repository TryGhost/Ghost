import type { FieldWrite, MetafieldDefinition, TypedSettings } from '@tryghost/metafield-types';
import { isFieldType, matchShape, type FieldShape } from '@tryghost/metafield-types/structure';
import {
  formTextOf,
  formWrite,
  heldTextOf,
  shaped,
  type ShapeText,
} from '@tryghost/metafield-types/shapes';
import { isPreviewMode } from './check-mode';

/**
 * A field the publisher has opened to members, as the members API lists it: Ghost's definition
 * without what only says where and when it is stored. The type is a plain string, because a site
 * newer than this build can list a field of a type this build doesn't know.
 */
export type ListedCustomField = Pick<MetafieldDefinition, 'name' | 'access'> & {
  key: string;
  type: string;
  settings?: unknown;
};

/** A listed field of a type this build knows, with the settings that type takes. */
export type MemberCustomField = Omit<ListedCustomField, 'type' | 'settings'> & TypedSettings;

/**
 * Something a form asks a member for: the name its inputs are labelled with, the kind of answer it
 * takes, and whether the member may change it or only see it.
 */
export type FieldInput = Pick<MemberCustomField, 'key' | 'name'> &
  TypedSettings & {
    readOnly: boolean;
    /** The countries a member may choose from, when fewer than every country. */
    countries?: readonly string[] | undefined;
  };

/** A field the publisher opened to members, as a form asks for it: theirs to change if they may write it. */
export function fieldInput(field: MemberCustomField): FieldInput {
  return { ...field, readOnly: field.access.member !== 'write' };
}

/**
 * Whether a listed field is of a type this build knows. Only the type is checked: the rest is read
 * as the site's own Ghost sends it, which lists a field with the settings its type takes.
 */
function isMemberCustomField(field: ListedCustomField): field is MemberCustomField {
  return isFieldType(field.type);
}

interface AskFor {
  api: { member: { customFields: () => Promise<ListedCustomField[]> } };
  member: unknown;
}

/**
 * The custom fields the publisher has opened to members, asked for once, beside the
 * member they belong to.
 *
 * Always a list. Nothing to ask for — nobody signed in, a preview — and
 * a site that cannot answer come to the same thing here: no fields to draw. Every way in
 * is a page load, so there is no later moment at which the answer would differ.
 *
 * A field of a type this build doesn't know is left out, with a warning in the console, since
 * there is nothing sensible to draw for it.
 */
export async function fetchMemberCustomFields({
  api,
  member,
}: AskFor): Promise<MemberCustomField[]> {
  if (!member || isPreviewMode()) {
    return [];
  }

  try {
    const listed = await api.member.customFields();
    return listed.flatMap((field) => {
      if (isMemberCustomField(field)) {
        return [field];
      }
      // eslint-disable-next-line no-console
      console.warn('[Portal] Left out a custom field of a type this build does not know:', {
        key: field.key,
        type: field.type,
      });
      return [];
    });
  } catch (err) {
    return [];
  }
}

/**
 * What a field's inputs hold, each leaf as text, which is all an input can hold. Made from what
 * the member holds by `customFieldTexts`, and read back as a value by `changedCustomFields`, so
 * an input never sees a held value of any other kind.
 */
export type CustomFieldValue = ShapeText[FieldShape] | undefined;

/** A composite's parts read by name, whichever parts its type declares. */
export type PartsByName = Readonly<Record<string, string | undefined>>;

/**
 * What each field's inputs start from: what its form can show of what the member holds, for a
 * field they may write, and everything they hold, for one they may only see.
 */
export function customFieldTexts(
  fields: FieldInput[],
  held: Record<string, unknown>,
): Record<string, CustomFieldValue> {
  return Object.fromEntries(
    fields.map((field) => {
      const textOf = field.readOnly ? heldTextOf : formTextOf;
      return [field.key, textOf(shaped(field), held[field.key])];
    }),
  );
}

/**
 * Narrowed rather than asserted. Which shape a field's text has follows from its field's type,
 * which the compiler cannot see through the map of every field's text, so the text is asked.
 */
export const compositeValue = (value: CustomFieldValue): ShapeText['record'] | undefined =>
  typeof value === 'object' && !Array.isArray(value) ? value : undefined;

export const scalarValue = (value: CustomFieldValue): string =>
  typeof value === 'string' ? value : '';

export const listValue = (value: CustomFieldValue): string[] => (Array.isArray(value) ? value : []);

/**
 * What the member changed, in the shape the members API takes: only fields they may
 * write, since naming one they may only read refuses the whole save, and for each the write its
 * shape gives from what the site holds to what the form shows. That sends only the parts of a
 * composite they touched, since each part records who last wrote it, and a list as its picker
 * shows it, whenever that differs from what the site holds. Saving therefore clears an answer the
 * picker can't show, such as one to an option the field no longer offers, though the member never
 * touched the list.
 */
export function changedCustomFields(
  fields: FieldInput[],
  values: Record<string, CustomFieldValue>,
  original: Record<string, unknown>,
): { custom: Record<string, FieldWrite | null> } | undefined {
  const custom: Record<string, FieldWrite | null> = {};

  for (const field of fields.filter((f) => !f.readOnly)) {
    const change = formWrite(shaped(field), values[field.key], original[field.key]);
    if (change !== undefined) {
      custom[field.key] = change;
    }
  }

  return Object.keys(custom).length > 0 ? { custom } : undefined;
}

/**
 * The name of the input a refusal belongs on, or null when no single input holds what was refused.
 * That covers a refusal of a whole record (the field was archived or closed to members while the
 * page was open) and of a part the field doesn't declare.
 * Marking an input that isn't on the page would hide the refusal, so the caller shows these in the
 * notification instead.
 */
export function refusedInput(
  field: Pick<FieldInput, 'key'> & TypedSettings,
  part: string,
): string | null {
  return matchShape<string | null>(field.type, {
    scalar: () => (part === '' ? `custom:${field.key}` : null),
    record: ({ parts }) =>
      part !== '' && Object.keys(parts).includes(part) ? `custom:${field.key}:${part}` : null,
    set: () => (part === '' ? `custom:${field.key}` : null),
  });
}
