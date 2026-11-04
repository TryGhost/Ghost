import type { ActionRow } from '../../lib/action-log/action-log';
import type { MemberAccess } from './access';

type FieldAction = Extract<ActionRow, { resourceType: 'member_custom_field' }>;

// Field-definition changes map to activity-feed events. A field's timeline reads
// added -> edited -> archived -> restored, and a permanent delete (only from the
// archived state) ends it with deleted.
const COMMANDS = {
  create: 'added',
  rename: 'edited',
  changeAccess: 'edited',
  changeSettings: 'edited',
  archive: 'archived',
  restore: 'restored',
  delete: 'deleted',
} as const satisfies Record<string, FieldAction['event']>;

export type MetafieldVerb = keyof typeof COMMANDS;

/**
 * The action for a change to one field. Its name keeps the timeline legible after a hard
 * delete, when the row itself is gone, and `key` rides alongside because the key is how a field
 * is addressed publicly: its id never leaves the API. The namespace goes unrecorded, as staff
 * only ever change fields in `custom`.
 *
 * The resource is the field's id: that column holds 24 characters, and a key minted from a
 * publisher-chosen name is bounded by the far wider key column, so only the id fits every field.
 */
export function fieldAction(
  verb: keyof typeof COMMANDS,
  field: { id: string; name: string; key: string },
  change: {
    previous_name?: string;
    member_access?: MemberAccess;
    previous_member_access?: MemberAccess;
  } = {},
): FieldAction {
  return {
    resourceType: 'member_custom_field',
    event: COMMANDS[verb],
    resourceId: field.id,
    primaryName: field.name,
    context: { key: field.key, ...change },
  };
}

/** A reorder names no field: it carries the count and the word the feed reads it by. */
export function reorderAction(count: number): FieldAction {
  return {
    resourceType: 'member_custom_field',
    event: 'edited',
    resourceId: null,
    actionName: 'reordered',
    count,
  };
}
