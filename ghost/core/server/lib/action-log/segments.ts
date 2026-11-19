import { z } from 'zod';
import type { OnSegmentUpdated } from '../../services/segments/changes';
import type { ActionLog, ActionRow } from './action-log';

type SettingAction = Extract<ActionRow, { resourceType: 'setting' }>;

const SettingRow = z.object({ id: z.string(), key: z.string(), group: z.string() });

/**
 * Logs the changes the segments service reports. This is the only place that knows how a segment
 * change reads in Admin's History; the service only says what happened.
 *
 * Segments are stored in the setting with `settingKey`, and History has always shown a change
 * to them as an edit of that setting, as a settings save records it. Adding, renaming and
 * deleting a segment all read that way, named after the setting's key.
 */
export function recordSegmentChanges(actionLog: ActionLog, settingKey: string): OnSegmentUpdated {
  return async (trx, context) => {
    const row: unknown = await trx('settings').where('key', settingKey).first('id', 'key', 'group');
    await actionLog.record(trx, context, actionFor(SettingRow.parse(row)));
  };
}

function actionFor(setting: z.output<typeof SettingRow>): SettingAction {
  return {
    resourceType: 'setting',
    event: 'edited',
    resourceId: setting.id,
    primaryName: setting.key,
    context: { key: setting.key, group: setting.group },
  };
}
