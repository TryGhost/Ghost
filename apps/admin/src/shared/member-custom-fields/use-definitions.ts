import {
  useBrowseMemberCustomFields,
  useBrowseMemberCustomFieldsIncludingArchived,
} from '@tryghost/admin-x-framework/api/member-custom-fields';

/**
 * The site's custom field definitions, for screens that display or offer them.
 *
 * These never raise an error to the user. Admin and Ghost's server deploy separately, so
 * Admin may be running against a server old enough not to have this endpoint. Every screen
 * using these degrades quietly when the list cannot be fetched: the filter bar offers no
 * custom fields, the member page shows no custom fields section, a filtered column falls
 * back to an unnamed header, and the import dialog maps onto Ghost's built-in member
 * fields alone. None of that is what the publisher came to the screen to do.
 *
 * A failed fetch is held for the life of the cache entry rather than retried whenever
 * another consumer mounts. A retry in flight reports neither data nor an error, so every
 * consumer would watch the definitions vanish and return on each mount. On the members
 * page that swing rebuilt the field catalog, rewrote the URL, remounted the filter bar and
 * retried again, without end. One attempt per visit settles it.
 */
const quietlyDegrading = { defaultErrorHandler: false, retryOnMount: false } as const;

export const useCustomFieldDefinitions: typeof useBrowseMemberCustomFields = (options) =>
  useBrowseMemberCustomFields({ ...options, ...quietlyDegrading });

/** As above, and also lists fields the publisher has archived. */
export const useCustomFieldDefinitionsIncludingArchived: typeof useBrowseMemberCustomFieldsIncludingArchived =
  (options) => useBrowseMemberCustomFieldsIncludingArchived({ ...options, ...quietlyDegrading });
