import type { Knex } from 'knex';
import type { RequestContext } from '../../lib/actor';
import type { Added, Batch, Deleted, Edited } from '../../lib/changes';
import type { Metafield } from './models';

/**
 * A change a command made to the custom field definitions, in the service's own terms. Each
 * command makes one change, however much of a field it touched.
 */
export type CustomFieldChange =
  /** Fields were added together, by one request. `changes` holds each, in the order given. */
  | Batch<'CustomFieldsAdded', Added<'CustomFieldAdded', Metafield>>
  /**
   * A field was edited, from the field as it was to the field as it is now. One edit can rename
   * the field, change its type's settings, change what members may do with it, and archive or
   * restore it. Comparing `previous` with `next` says which, and an edit that changed nothing
   * has the two equal.
   */
  | Edited<'CustomFieldEdited', Metafield>
  /** The field was deleted for good, along with every member's value for it. */
  | Deleted<'CustomFieldDeleted', Metafield>
  /** The fields were put in a new order. Each list is every field, in the order it had. */
  | Edited<'CustomFieldsReordered', Metafield[]>;

/**
 * What the custom field definitions service tells about each change it makes. The service's
 * root supplies it, and the service knows nothing about who is told or what they do with a
 * change.
 *
 * `onCustomFieldUpdated` is called inside the command's transaction, after the change is
 * written. What it writes through `trx` is saved with the change, and if it throws, the command
 * fails and the change is rolled back.
 */
export interface CustomFieldReactions {
  onCustomFieldUpdated(
    trx: Knex.Transaction,
    context: RequestContext,
    change: CustomFieldChange,
  ): Promise<void>;
}
