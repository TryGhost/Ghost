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
