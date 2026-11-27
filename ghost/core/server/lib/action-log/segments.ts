import type { OnSegmentUpdated, SegmentChange } from '../../services/segments/changes';
import type { Segment } from '../../services/segments/models';
import type { ActionLog, ActionRow } from './action-log';

type SegmentAction = Extract<ActionRow, { resourceType: 'segment' }>;

/**
 * Logs the changes the segments service reports, each as an action on the segment: added,
 * edited or deleted. The segment's name is stored with the action, so History still names a
 * segment that has since been deleted. This is the only place that knows how a segment change
 * reads in Admin's History; the service only says what happened.
 *
 * A change made while segments were stored in the `shared_views` setting was logged as an edit
 * of that setting. Those entries stay as they are.
 */
export function recordSegmentChanges(actionLog: ActionLog): OnSegmentUpdated {
  return async (trx, context, change) => {
    for (const action of actionsFor(change)) {
      await actionLog.record(trx, context, action);
    }
  };
}

function actionsFor(change: SegmentChange): SegmentAction[] {
  switch (change.type) {
    case 'SegmentAdded':
      return [segmentAction('added', change.next)];
    case 'SegmentEdited':
      return editActions(change.previous, change.next);
    case 'SegmentDeleted':
      return [segmentAction('deleted', change.previous)];
  }
}

/** What changing one property of a segment logs: its actions, or nothing by decision. */
type EditOf = ((previous: Segment, next: Segment) => SegmentAction[]) | typeof NOT_LOGGED;

const NOT_LOGGED = 'not logged';

/**
 * What an edit logs for each property of a segment, in the order its actions are logged. Every
 * property has an entry, so a property added to a segment does not compile until someone decides
 * here whether changing it is logged.
 *
 * History shows consecutive actions on one segment with the same event and action name as one
 * entry, so a change of filter has an action name of its own, which keeps it apart from a rename.
 */
const EDITS: { [Property in keyof Segment]: EditOf } = {
  name: (previous, next) =>
    previous.name === next.name
      ? []
      : [segmentAction('edited', next, { context: { previous_name: previous.name } })],
  filter: (previous, next) =>
    previous.filter === next.filter
      ? []
      : [segmentAction('edited', next, { actionName: 'conditions_changed' })],
  // Set when the segment is added and never changed by an edit.
  id: NOT_LOGGED,
  slug: NOT_LOGGED,
  created_at: NOT_LOGGED,
  // Changes with every edit, and says nothing an action's own time does not.
  updated_at: NOT_LOGGED,
};

/** The actions for one edit of a segment: one for each property the edit changed. */
function editActions(previous: Segment, next: Segment): SegmentAction[] {
  return Object.values(EDITS).flatMap((edit) => (edit === NOT_LOGGED ? [] : edit(previous, next)));
}

function segmentAction(
  event: SegmentAction['event'],
  segment: Segment,
  extra: Pick<SegmentAction, 'actionName' | 'context'> = {},
): SegmentAction {
  return {
    resourceType: 'segment',
    event,
    resourceId: segment.id,
    primaryName: segment.name,
    ...extra,
  };
}
