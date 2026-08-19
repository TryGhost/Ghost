import {CUSTOM_FIELDS_PREFIX} from '@/members/member-fields';
import {filterNamesKey} from '@/shared/filters';
import {useBrowseMemberCustomFieldsIncludingArchived} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useFeatureFlag} from '@tryghost/admin-x-framework/hooks';
import type {CustomFieldDefinition} from '@/members/custom-fields/filter-fields';
import type {NewsletterDefinition} from '@/members/newsletter-filter-fields';

const NO_NEWSLETTERS: readonly NewsletterDefinition[] = [];
const NO_CUSTOM_FIELDS: readonly CustomFieldDefinition[] = [];

export interface MemberFilterSources {
    newsletters?: readonly NewsletterDefinition[];
    customFields?: readonly CustomFieldDefinition[];
}

/**
 * The site's own newsletters and custom fields, for whoever is reading a filter.
 *
 * "Not here yet" and "not coming at all" are different answers, and the difference is the whole
 * point of this: the page waits for the first, and must never wait for the second or it waits
 * for good. Undefined is still loading. An empty list means there is nothing to load — the
 * feature is off, the request failed, or this filter never mentioned one.
 *
 * Not waiting is safe. A filter still reads without these; it is just read less precisely.
 */
export function useMemberFilterSources(filterParam: string | undefined): MemberFilterSources {
    const customFieldsEnabled = useFeatureFlag('membersCustomFields');
    const wantsCustomFields = customFieldsEnabled && filterNamesKey(filterParam, CUSTOM_FIELDS_PREFIX);

    const {data: newslettersData, isError: newslettersFailed} = useBrowseNewsletters({searchParams: {limit: '100'}});
    const {data: customFieldsData, isError: customFieldsFailed} = useBrowseMemberCustomFieldsIncludingArchived({
        enabled: wantsCustomFields
    });

    return {
        newsletters: newslettersFailed ? NO_NEWSLETTERS : newslettersData?.newsletters,
        customFields: !wantsCustomFields || customFieldsFailed
            ? NO_CUSTOM_FIELDS
            : customFieldsData?.members_custom_fields
    };
}
