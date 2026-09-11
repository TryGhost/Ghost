import { filterNamesKey } from '@/shared/filters';
import { useCustomFieldDefinitionsIncludingArchived } from '@/shared/member-custom-fields/use-definitions';
import { useBrowseNewsletters } from '@tryghost/admin-x-framework/api/newsletters';
import type { CustomFieldDefinition } from '@/members/custom-fields/filter-fields';
import type { NewsletterDefinition } from '@/members/newsletter-filter-fields';

const NEWSLETTERS_PREFIX = 'newsletters';

const NO_NEWSLETTERS: readonly NewsletterDefinition[] = [];
const NO_CUSTOM_FIELDS: readonly CustomFieldDefinition[] = [];

export interface MemberFilterSources {
  newsletters?: readonly NewsletterDefinition[];
  customFields?: readonly CustomFieldDefinition[];
}

/**
 * The site's newsletters and its custom field definitions. The members page needs both
 * to read a filter accurately: which newsletters exist decides what a
 * `newsletters.<slug>` clause means, and a custom field's definition decides how its
 * values compare.
 *
 * `undefined` means the answer has not arrived and the caller may wait for it. An empty
 * array means no answer is coming and the caller must not wait: newsletters are empty
 * when the request failed or the current filter names none, and custom fields are empty
 * when the request failed.
 *
 * Waiting is optional either way. A filter is still readable without these lists, just
 * with less accurate labels and value types.
 */
export function useMemberFilterSources(filterParam: string | undefined): MemberFilterSources {
  const wantsNewsletters = filterNamesKey(filterParam, NEWSLETTERS_PREFIX);

  const { data: newslettersData, isError: newslettersFailed } = useBrowseNewsletters({
    searchParams: { limit: '100' },
    enabled: wantsNewsletters,
  });
  // Requested on every members page, not only when the current filter already names a
  // custom field. Picking a custom field in the filter bar puts it into the URL on the
  // first keystroke; if the definitions were still unrequested at that moment, the new
  // filter would be interpreted by the catch-all "any custom field" entry in
  // member-fields.ts, which treats every value as text. The filter bar's picker requests
  // the same definitions, so this shares that cached request rather than adding one.
  const { data: customFieldsData, isError: customFieldsFailed } =
    useCustomFieldDefinitionsIncludingArchived();

  return {
    newsletters:
      !wantsNewsletters || newslettersFailed ? NO_NEWSLETTERS : newslettersData?.newsletters,
    customFields: customFieldsFailed ? NO_CUSTOM_FIELDS : customFieldsData,
  };
}
