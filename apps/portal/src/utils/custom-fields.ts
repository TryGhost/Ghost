import type { FieldType, MemberAccess, MetafieldDefinition } from '@tryghost/metafield-types';
import { isFieldType, isRecordValue, matchShape } from '@tryghost/metafield-types/structure';
import { isPreviewMode } from './check-mode';
import { hasCustomFieldsEnabled } from './helpers';

/**
 * A field the publisher has opened to members, as the members API lists it: Ghost's definition
 * without what only says where and when it is stored. The key and type are plain strings, because
 * Portal also runs beside newer Ghost sites, which can send a type this build doesn't know.
 */
export type MemberCustomField = Omit<
  MetafieldDefinition,
  'namespace' | 'key' | 'type' | 'status' | 'created_at' | 'updated_at'
> & {
  key: string;
  type: string;
};

/**
 * Requires every property of `T`, optional ones included, so a reader that leaves one out fails to
 * compile.
 */
type EveryProperty<T> = { [K in keyof T]-?: T[K] | undefined };

/**
 * The levels at which a member is shown a field. Listed here rather than imported, because
 * importing from the package's main entry would bundle zod into Portal.
 */
const SHOWN_TO_MEMBERS = ['read', 'write'] as const satisfies readonly MemberAccess[];

const isShownToMembers = (level: unknown): level is (typeof SHOWN_TO_MEMBERS)[number] =>
  SHOWN_TO_MEMBERS.some((shown) => shown === level);

/**
 * A field as the members API lists it, or null for one that can't be drawn. Every property is
 * checked, not only enough to recognise a field: a name that isn't text would be rendered as a
 * React child and take the page down.
 */
function readMemberCustomField(raw: unknown): MemberCustomField | null {
  if (!isRecordValue(raw)) {
    return null;
  }
  const { key, name, type, access } = raw;
  const { member } = isRecordValue(access) ? access : { member: undefined };
  if (
    typeof key !== 'string' ||
    key.length === 0 ||
    typeof name !== 'string' ||
    typeof type !== 'string' ||
    !isShownToMembers(member)
  ) {
    return null;
  }
  const field = { key, name, type, access: { member } } satisfies EveryProperty<MemberCustomField>;
  return field;
}

export function readMemberCustomFields(listed: unknown[]): MemberCustomField[] {
  return listed.flatMap((raw) => {
    const field = readMemberCustomField(raw);
    return field ? [field] : [];
  });
}

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

export type DrawableCustomField = Omit<MemberCustomField, 'type'> & { type: FieldType };

/**
 * The field, or null when its type is one this build doesn't know. A site can offer a type added
 * after this bundle shipped, and there is nothing sensible to draw for one.
 */
function drawable(field: MemberCustomField): DrawableCustomField | null {
  const { type } = field;
  return isFieldType(type) ? { ...field, type } : null;
}

export function drawableCustomFields(
  fields: MemberCustomField[] | null | undefined,
): DrawableCustomField[] {
  if (!Array.isArray(fields)) {
    return [];
  }
  return fields.flatMap((field) => drawable(field) ?? []);
}

/** What a composite holds: one string per part, and not every part need be filled in. */
export type CompositeValue = Record<string, string | undefined>;

/** A value as the member holds it: one string, or one per part of a composite. */
export type CustomFieldValue = string | CompositeValue | undefined;

/**
 * Narrowed rather than asserted. Which shape a value has follows from its field's type,
 * which the compiler cannot see, so the value itself is asked instead.
 */
export const compositeValue = (value: CustomFieldValue): CompositeValue | undefined =>
  isRecordValue(value) ? value : undefined;

export const scalarValue = (value: CustomFieldValue): string =>
  typeof value === 'string' ? value : '';

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
  fields: DrawableCustomField[],
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
    });
    if (change !== undefined) {
      custom[field.key] = change;
    }
  }

  return Object.keys(custom).length > 0 ? { custom } : undefined;
}

export function withChange(
  field: DrawableCustomField,
  held: CustomFieldValue,
  part: string | null,
  value: string,
): CustomFieldValue {
  return matchShape<CustomFieldValue>(field.type, {
    scalar: () => value,
    record: () => (part === null ? held : { ...compositeValue(held), [part]: value }),
  });
}

/**
 * The name of the input a refusal belongs on, or null when no single input holds what was refused.
 * That covers a refusal of a whole record (the field was archived or closed to members while the
 * page was open), of a part the field doesn't declare, and of a field this build can't draw.
 * Marking an input that isn't on the page would hide the refusal, so the caller shows these in the
 * notification instead.
 */
export function refusedInput(field: MemberCustomField, part: string): string | null {
  const drawn = drawable(field);
  if (!drawn) {
    return null;
  }
  return matchShape<string | null>(drawn.type, {
    scalar: () => (part === '' ? `custom:${drawn.key}` : null),
    record: ({ parts }) =>
      part !== '' && Object.keys(parts).includes(part) ? `custom:${drawn.key}:${part}` : null,
  });
}
