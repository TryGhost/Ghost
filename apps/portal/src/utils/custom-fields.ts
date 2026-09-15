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
 * The custom fields the publisher has opened to members.
 *
 * `null` means there was nothing to ask for — the site has the feature off, or nobody is
 * signed in — and leaves the app's `customFields` untouched, so a member who signs in
 * later still gets a first attempt. Anything else is an answer, an empty list included:
 * a site that cannot answer shows no fields, the same as one with none, and neither is
 * worth asking about twice.
 */
export async function fetchMemberCustomFields({
  api,
  site,
  member,
}: AskFor): Promise<MemberCustomField[] | null> {
  if (!hasCustomFieldsEnabled({ site }) || !member || isPreviewMode()) {
    return null;
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
export type DrawableCustomField = Omit<MemberCustomField, 'type'> & { type: FieldType };

export function drawableCustomFields(
  fields: MemberCustomField[] | null | undefined,
): DrawableCustomField[] {
  return (fields ?? []).filter((field): field is DrawableCustomField =>
    (FIELD_TYPE_IDS as readonly string[]).includes(field.type),
  );
}

/** A value as the member holds it: one string, or one per part of a composite. */
export type CustomFieldValue = string | Record<string, string | undefined> | undefined;

/** A part is changed when what the member has differs from what the site holds. */
const changedParts = (
  parts: readonly string[],
  current: Record<string, string | undefined> | undefined,
  original: Record<string, string | undefined> | undefined,
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
      if ((value ?? '') !== (original[field.key] ?? '')) {
        custom[field.key] = value;
      }
      continue;
    }

    const held = value as Record<string, string | undefined> | undefined;
    const was = original[field.key] as Record<string, string | undefined> | undefined;
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
