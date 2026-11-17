import { Added, Batch, Deleted, Edited, type OnUpdated } from '../../../lib/changes';
import type { Definition } from '../metafields/models';

/** A field was added, as one of the fields a request added together. */
export class CustomFieldAdded extends Added('CustomFieldAdded')<Definition> {}

/** Fields were added together, by one request. `changes` holds each, in the order given. */
export class CustomFieldsAdded extends Batch('CustomFieldsAdded')<CustomFieldAdded> {}

/**
 * A field was edited, from the field as it was to the field as it is now. One edit can rename
 * the field, change its type's settings, change what members may do with it, and archive or
 * restore it. Comparing `previous` with `next` says which. An edit that changes nothing is not
 * reported.
 */
export class CustomFieldEdited extends Edited('CustomFieldEdited')<Definition> {}

/** The field was deleted for good, along with every member's value for it. */
export class CustomFieldDeleted extends Deleted('CustomFieldDeleted')<Definition> {}

/** The fields were put in a new order. Each list is every field, in the order it had. */
export class CustomFieldsReordered extends Edited('CustomFieldsReordered')<Definition[]> {}

/**
 * A change a command made to the custom field definitions, in the service's own terms. Each
 * command makes one change, however much of a field it touched.
 */
export type CustomFieldChange =
  | CustomFieldsAdded
  | CustomFieldEdited
  | CustomFieldDeleted
  | CustomFieldsReordered;

/** The function the custom field definitions service calls with each change it makes. */
export type OnCustomFieldUpdated = OnUpdated<CustomFieldChange>;
