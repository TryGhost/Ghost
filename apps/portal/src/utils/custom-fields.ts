import { FIELD_TYPE_IDS, subFieldsOf, type FieldType } from '@tryghost/metafield-types/structure';
import { isPreviewMode } from './check-mode';
import { hasCustomFieldsEnabled } from './helpers';

/** A field the publisher has opened to members, as the members API describes it. */
export interface MemberCustomField {
  key: string;
  name: string;
  type: string;
  access: { member: string };
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

/**
 * A field this build can draw. The site may offer a type added after this bundle
 * shipped, and there is nothing sensible to render for one, so it is left out rather
 * than guessed at.
 */
const DRAWABLE_TYPES = new Set<string>(FIELD_TYPE_IDS);

export type DrawableCustomField = Omit<MemberCustomField, 'type'> & { type: FieldType };

export function drawableCustomFields(
  fields: MemberCustomField[] | null | undefined,
): DrawableCustomField[] {
  if (!Array.isArray(fields)) {
    return [];
  }
  return fields.filter((field): field is DrawableCustomField => DRAWABLE_TYPES.has(field.type));
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
  typeof value === 'object' && value !== null ? value : undefined;

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
    const parts = subFieldsOf(field.type);

    if (!parts) {
      if (scalarValue(value) !== scalarValue(original[field.key])) {
        custom[field.key] = value;
      }
      continue;
    }

    const held = compositeValue(value);
    const was = compositeValue(original[field.key]);
    const changed = changedParts(parts, held, was);
    if (changed.length === 0) {
      continue;
    }

    // The parts that changed, emptied ones included, and never the field itself: naming
    // the field clears it whole, and a build only knows the parts it draws.
    custom[field.key] = Object.fromEntries(changed.map((part) => [part, held?.[part] ?? '']));
  }

  return Object.keys(custom).length > 0 ? { custom } : undefined;
}
