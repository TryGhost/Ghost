import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { AutomationStatus } from './automations-repository';
import { limitService } from '../limits';

/**
 * There can be a limit to the number of enabled automations.
 *
 * We lock a stable value to avoid race conditions where too many automations
 * can get enabled.
 */
export async function lockAutomationLimit(
  trx: Knex.Transaction,
  status: AutomationStatus | 'legacy',
): Promise<void> {
  switch (status) {
    case 'active':
    case 'legacy':
      break;
    case 'inactive':
      return;
    default: {
      const _exhaustive: never = status;
      throw new errors.InternalServerError({
        message: `Unknown automation status: ${_exhaustive}`,
      });
    }
  }

  if (!limitService.isLimited('limitAutomations')) {
    return;
  }

  const site = await trx('settings').select('id').where('key', 'site_uuid').forUpdate().first();
  if (!site) {
    throw new errors.InternalServerError({ message: 'Cannot lock the automation plan limit.' });
  }
}
