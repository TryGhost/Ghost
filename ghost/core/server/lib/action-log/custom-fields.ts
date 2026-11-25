import { isDeepStrictEqual } from 'node:util';
import type { MemberAccess } from '../../services/members-metafields/callers';
import type {
  DefinitionChange,
  OnDefinitionUpdated,
} from '../../services/members-metafields/metafields/changes';
import type { Definition } from '../../services/members-metafields/metafields/models';
import type { ActionLog, ActionRow } from './action-log';

type FieldAction = Extract<ActionRow, { resourceType: 'member_custom_field' }>;

/**
 * Logs the changes the members' definitions service reports, as custom field actions, whichever
 * namespace the definition is in. This is the only place that knows how a change to a member's
 * definition reads in Admin's History; the service only says what happened.
 */
export function recordMemberDefinitionChanges(actionLog: ActionLog): OnDefinitionUpdated {
  return async (trx, context, change) => {
    for (const action of actionsFor(change)) {
      await actionLog.record(trx, context, action);
    }
  };
}

// A field's timeline reads added -> edited -> archived -> restored, and a permanent delete (only
// from the archived state) ends it with deleted.
function actionsFor(change: DefinitionChange): FieldAction[] {
  switch (change.type) {
    // Each field added has a timeline of its own to start, so each gets its own action.
    case 'DefinitionsAdded':
      return change.changes.map(({ next }) => fieldAction('added', next));
    case 'DefinitionEdited':
      return editActions(change.previous, change.next);
    case 'DefinitionDeleted':
      return [fieldAction('deleted', change.previous)];
    // A reorder names no field: it carries the count and the word History reads it by, and the
    // namespace whose fields were put in order.
    case 'DefinitionsReordered':
      return [
        {
          resourceType: 'member_custom_field',
          event: 'edited',
          resourceId: null,
          actionName: 'reordered',
          count: change.next.length,
          context: { namespace: change.namespace },
        },
      ];
  }
}

/** What changing one property of a field logs: its actions, or nothing by decision. */
type EditOf = ((previous: Definition, next: Definition) => FieldAction[]) | typeof NOT_LOGGED;

const NOT_LOGGED = 'not logged';

/**
 * What an edit logs for each property of a field. Every property has an entry, so a property
 * added to a field does not compile until someone decides here whether changing it is logged.
 *
 * The entries are in the order their actions are logged for one edit.
 */
const EDITS: { [Property in keyof Definition]: EditOf } = {
  name: (previous, next) =>
    previous.name === next.name
      ? []
      : [fieldAction('edited', next, { previous_name: previous.name })],
  settings: (previous, next) =>
    isDeepStrictEqual(previous.settings, next.settings) ? [] : [fieldAction('edited', next)],
  access: (previous, next) =>
    previous.access.member === next.access.member
      ? []
      : [
          fieldAction('edited', next, {
            member_access: next.access.member,
            previous_member_access: previous.access.member,
          }),
        ],
  // Stored with events of their own, which History reads as "archived" and "restored".
  status: (previous, next) =>
    previous.status === next.status
      ? []
      : [fieldAction(next.status === 'archived' ? 'archived' : 'restored', next)],
  // Set when the field is added and never changed by an edit.
  id: NOT_LOGGED,
  namespace: NOT_LOGGED,
  key: NOT_LOGGED,
  type: NOT_LOGGED,
  createdAt: NOT_LOGGED,
  // Changes with every edit, and says nothing an action's own time does not.
  updatedAt: NOT_LOGGED,
};

/**
 * The actions for one edit of a field: one for each thing about the field that the edit changed,
 * found by comparing the field before with the field after. An edit that changed nothing has no
 * action.
 */
function editActions(previous: Definition, next: Definition): FieldAction[] {
  return Object.values(EDITS).flatMap((edit) => (edit === NOT_LOGGED ? [] : edit(previous, next)));
}

/**
 * The action for a change to one field. Its name keeps the timeline legible after a hard
 * delete, when the row itself is gone, and its namespace and key ride alongside because together
 * they are how a field is addressed publicly: its id never leaves the API.
 *
 * The resource is the field's id: that column holds 24 characters, and a key minted from a
 * publisher-chosen name is bounded by the far wider key column, so only the id fits every field.
 */
function fieldAction(
  event: FieldAction['event'],
  field: Pick<Definition, 'id' | 'name' | 'namespace' | 'key'>,
  change: {
    previous_name?: string;
    member_access?: MemberAccess;
    previous_member_access?: MemberAccess;
  } = {},
): FieldAction {
  return {
    resourceType: 'member_custom_field',
    event,
    resourceId: field.id,
    primaryName: field.name,
    context: { namespace: field.namespace, key: field.key, ...change },
  };
}
