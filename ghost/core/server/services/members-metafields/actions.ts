import type { ActionKind } from '../../lib/action-log/action-log';

/**
 * Changes to custom field definitions. A field's timeline reads added -> edited -> archived ->
 * restored, and a permanent delete (only from the archived state) ends it with deleted.
 * Archiving, restoring and reordering are edits named for what they did.
 */
export const customFieldActions = {
  resourceType: 'member_custom_field',
  table: 'members_metafields',
  actionNames: { archived: 'edited', restored: 'edited', reordered: 'edited' },
} as const satisfies ActionKind;
