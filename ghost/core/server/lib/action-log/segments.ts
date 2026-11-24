import type { OnSegmentUpdated } from '../../services/segments/changes';
import type { ActionLog } from './action-log';

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
    const segment = change.verb === 'deleted' ? change.previous : change.next;
    await actionLog.record(trx, context, {
      resourceType: 'segment',
      event: change.verb,
      resourceId: segment.id,
      primaryName: segment.name,
    });
  };
}
