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
 */
export const useCustomFieldDefinitions: typeof useBrowseMemberCustomFields = (options) =>
  useBrowseMemberCustomFields({ ...options, defaultErrorHandler: false });

/** As above, and also lists fields the publisher has archived. */
export const useCustomFieldDefinitionsIncludingArchived: typeof useBrowseMemberCustomFieldsIncludingArchived =
  (options) =>
    useBrowseMemberCustomFieldsIncludingArchived({ ...options, defaultErrorHandler: false });
