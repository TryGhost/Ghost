import type { MetafieldDefinition, TypedSettings } from '@tryghost/metafield-types';
import {
  FIELD_STRUCTURES,
  editableAnswers,
  isFieldType,
  isRecordValue,
  matchField,
  matchShape,
  type FieldType,
  type FieldTypeOfShape,
  type ValueOf,
} from '@tryghost/metafield-types/structure';
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

/** A value as the member holds it, laid out as its field's type keeps one, or undefined if none. */
export type CustomFieldValue = ValueOf<FieldType> | undefined;

/** What a composite holds: a string for any of its parts, and not every part need be filled in. */
export type CompositeValue = ValueOf<FieldTypeOfShape<'record'>>;

/** A composite's parts read by name, whichever parts its type declares. */
export type PartsByName = Readonly<Record<string, string | undefined>>;

/**
 * Narrowed rather than asserted. Which shape a value has follows from its field's type,
 * which the compiler cannot see, so the value itself is asked instead.
 */
export const compositeValue = (value: CustomFieldValue): CompositeValue | undefined =>
  isRecordValue(value) ? value : undefined;

export const scalarValue = (value: CustomFieldValue): string =>
  typeof value === 'string' ? value : '';

export const listValue = (value: CustomFieldValue): string[] => (Array.isArray(value) ? value : []);

/** A part is changed when what the member has differs from what the site holds. */
const changedParts = (
  parts: readonly string[],
  current: PartsByName,
  original: PartsByName,
): string[] => parts.filter((part) => (current[part] ?? '') !== (original[part] ?? ''));

/**
 * What the member changed, in the shape the members API takes: only fields they may
 * write, since naming one they may only read refuses the whole save, and only the parts
 * of a composite they touched, since each part records who last wrote it. A list is sent as its
 * picker shows it, the answers `editableAnswers` gives, whenever those differ from what the site
 * holds. Saving therefore clears an answer the picker can't show, such as one to an option the
 * field no longer offers, though the member never touched the list.
 */
export function changedCustomFields(
  fields: MemberCustomField[],
  values: Record<string, CustomFieldValue>,
  original: Record<string, CustomFieldValue>,
): { custom: Record<string, unknown> } | undefined {
  const custom: Record<string, unknown> = {};

  for (const field of fields.filter((f) => f.access.member === 'write')) {
    const value = values[field.key];
    const was = original[field.key];
    const change = matchField<MemberCustomField, unknown>(field, {
      scalar: () => (scalarValue(value) !== scalarValue(was) ? value : undefined),
      // Only the parts that changed, emptied ones included. Naming the whole field would clear it,
      // and this build only knows the parts it draws.
      record: ({ type }) => {
        const held: PartsByName = compositeValue(value) ?? {};
        const { parts } = FIELD_STRUCTURES[type];
        const changed = changedParts(Object.keys(parts), held, compositeValue(was) ?? {});
        return changed.length === 0
          ? undefined
          : Object.fromEntries(changed.map((part) => [part, held[part] ?? '']));
      },
      // A list is written whole, so a change sends every answer the picker shows.
      set: ({ settings }) => {
        const shown = editableAnswers(settings, listValue(value));
        const held = listValue(was);
        const same = shown.length === held.length && shown.every((option) => held.includes(option));
        return same ? undefined : shown;
      },
    });
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
export function refusedInput(field: MemberCustomField, part: string): string | null {
  return matchShape<string | null>(field.type, {
    scalar: () => (part === '' ? `custom:${field.key}` : null),
    record: ({ parts }) =>
      part !== '' && Object.keys(parts).includes(part) ? `custom:${field.key}:${part}` : null,
    set: () => (part === '' ? `custom:${field.key}` : null),
  });
}
