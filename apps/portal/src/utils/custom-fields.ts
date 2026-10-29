import type { MetafieldDefinition, TypedSettings } from '@tryghost/metafield-types';
import { isRecordValue, matchShape } from '@tryghost/metafield-types/structure';
import { isPreviewMode } from './check-mode';
import { hasCustomFieldsEnabled } from './helpers';

/**
 * A field the publisher has opened to members, as the members API lists it: Ghost's definition
 * without what only says where and when it is stored. Read as the site's own Ghost sends it.
 */
export type MemberCustomField = Pick<MetafieldDefinition, 'name' | 'access'> & {
  key: string;
} & TypedSettings;

interface AskFor {
  api: { member: { customFields: () => Promise<MemberCustomField[]> } };
  site: { labs?: { membersCustomFields?: boolean } } | null;
  member: unknown;
}

/**
 * The custom fields the publisher has opened to members, asked for once, beside the
 * member they belong to.
 *
 * Always a list. Nothing to ask for — the feature off, nobody signed in, a preview — and
 * a site that cannot answer come to the same thing here: no fields to draw. Every way in
 * is a page load, so there is no later moment at which the answer would differ.
 */
export async function fetchMemberCustomFields({
  api,
  site,
  member,
}: AskFor): Promise<MemberCustomField[]> {
  if (!hasCustomFieldsEnabled({ site }) || !member || isPreviewMode()) {
    return [];
  }

  try {
    return await api.member.customFields();
  } catch (err) {
    return [];
  }
}

/** What a composite holds: one string per part, and not every part need be filled in. */
export type CompositeValue = Record<string, string | undefined>;

/** A value as the member holds it: one string, one per part of a composite, or a list's options. */
export type CustomFieldValue = string | CompositeValue | string[] | undefined;

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
  current: CompositeValue | undefined,
  original: CompositeValue | undefined,
): string[] => parts.filter((part) => (current?.[part] ?? '') !== (original?.[part] ?? ''));

/**
 * What the member changed, in the shape the members API takes: only fields they may
 * write, since naming one they may only read refuses the whole save, and only the parts
 * of a composite they touched, since each part records who last wrote it.
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
    const change = matchShape<unknown>(field.type, {
      scalar: () => (scalarValue(value) !== scalarValue(was) ? value : undefined),
      // Only the parts that changed, emptied ones included. Naming the whole field would clear it,
      // and this build only knows the parts it draws.
      record: ({ parts }) => {
        const held = compositeValue(value);
        const changed = changedParts(Object.keys(parts), held, compositeValue(was));
        return changed.length === 0
          ? undefined
          : Object.fromEntries(changed.map((part) => [part, held?.[part] ?? '']));
      },
      // A list is written whole, so any change sends every option picked.
      set: () => {
        const picked = listValue(value);
        const held = listValue(was);
        const same =
          picked.length === held.length && picked.every((option) => held.includes(option));
        return same ? undefined : picked;
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
