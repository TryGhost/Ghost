import type { Added, Batch, Deleted, Edited } from '../../lib/change-events';
import type { Metafield } from './models';

/**
 * What happens to custom field definitions. Archiving and restoring are edits of the field's
 * status.
 */
export type MetafieldDefinitionEvent =
  | Added<'MetafieldAdded', Metafield>
  | Edited<'MetafieldRenamed', Metafield>
  | Edited<'MetafieldAccessChanged', Metafield>
  | Edited<'MetafieldArchived', Metafield>
  | Edited<'MetafieldRestored', Metafield>
  | Deleted<'MetafieldDeleted', Metafield>
  | Batch<'MetafieldsReordered', 'edited'>;
