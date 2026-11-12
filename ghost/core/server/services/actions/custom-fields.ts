import { isDeepStrictEqual } from 'node:util';
import type {
  CustomFieldChange,
  CustomFieldReactions,
} from '../members-metafields/changes';
import type { Metafield } from '../members-metafields/models';
import type { Action, ActionEvents, ActionLog } from './action-log';

/**
 * Logs changes to custom field definitions as staff actions. This is the only place that knows
 * how a custom field change reads in Admin's History; the definitions service only says what
 * happened.
 */
export function customFieldActions(actionLog: ActionLog): CustomFieldReactions {
  return {
    async onCustomFieldUpdated(trx, context, change) {
      for (const action of actionsFor(change)) {
        await actionLog.write(trx, context, action);
      }
    },
  };
}

// A field's timeline reads added -> edited -> archived -> restored, and a permanent delete (only
// from the archived state) ends it with deleted.
function actionsFor(change: CustomFieldChange): Action[] {
  switch (change.type) {
    // Each field added has a timeline of its own to start, so each gets its own action.
    case 'CustomFieldsAdded':
      return change.changes.map(({ next }) => fieldAction('added', next));
    case 'CustomFieldEdited':
      return editActions(change.previous, change.next);
    case 'CustomFieldDeleted':
      return [fieldAction('deleted', change.previous)];
    // A reorder names no field: it carries the count and the word History reads it by.
    case 'CustomFieldsReordered':
      return [
        {
          resourceType: 'member_custom_field',
          event: 'edited',
          resourceId: null,
          context: { action_name: 'reordered', count: change.next.length },
        },
      ];
  }
}

/**
 * The actions for one edit of a field: one for each thing about the field that the edit changed,
 * found by comparing the field before with the field after. An edit that changed nothing has no
 * action.
 */
function editActions(previous: Metafield, next: Metafield): Action[] {
  const actions: Action[] = [];
  if (previous.name !== next.name) {
    actions.push(fieldAction('edited', next, { previous_name: previous.name }));
  }
  if (!isDeepStrictEqual(previous.settings, next.settings)) {
    actions.push(fieldAction('edited', next));
  }
  if (previous.access.member !== next.access.member) {
    actions.push(
      fieldAction('edited', next, {
        member_access: next.access.member,
        previous_member_access: previous.access.member,
      }),
    );
  }
  // Stored with events of their own, which History reads as "archived" and "restored".
  if (previous.status !== next.status) {
    actions.push(fieldAction(next.status === 'archived' ? 'archived' : 'restored', next));
  }
  return actions;
}

/**
 * The action for a change to one field. Its name is stored with it so History reads as a label,
 * not a bare key, which keeps the timeline legible after a permanent delete, when the field
 * itself is gone. `key` is stored alongside because the key is how a field is addressed
 * publicly: its id never leaves the API. The namespace goes unrecorded, as staff only ever
 * change fields in `custom`.
 *
 * The resource is the field's id. That column holds 24 characters, and a key minted from a
 * publisher-chosen name is bounded by the far wider key column, so only the id fits every field.
 */
function fieldAction(
  event: ActionEvents['member_custom_field'],
  field: { id: string; key: string; name: string },
  details: Record<string, unknown> = {},
): Action {
  return {
    resourceType: 'member_custom_field',
    event,
    resourceId: field.id,
    context: { primary_name: field.name, key: field.key, ...details },
  };
}
