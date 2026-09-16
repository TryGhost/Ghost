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
