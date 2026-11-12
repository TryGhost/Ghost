import type { ActionChange, ActionRow } from '../../lib/action-log/action-log';
import type { MemberAccess } from './access';
import type { customFieldActions } from './actions';

export type FieldAction = ActionRow<typeof customFieldActions>;

// What each command on a field logs. Archiving and restoring are named, and their event comes
// from the kind's declaration.
const COMMANDS = {
  create: { event: 'added' },
  rename: { event: 'edited' },
  changeAccess: { event: 'edited' },
  changeSettings: { event: 'edited' },
  archive: { actionName: 'archived' },
  restore: { actionName: 'restored' },
  delete: { event: 'deleted' },
} as const satisfies Record<string, ActionChange<typeof customFieldActions>>;

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
    ...COMMANDS[verb],
    resourceId: field.id,
    primaryName: field.name,
    context: { key: field.key, ...change },
  };
}

/** A reorder names no field: it carries the count and the word the feed reads it by. */
export function reorderAction(count: number): FieldAction {
  return {
    resourceId: null,
    actionName: 'reordered',
    count,
  };
}
