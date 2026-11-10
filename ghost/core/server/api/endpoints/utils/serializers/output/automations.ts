import type { Frame } from '@tryghost/api-framework';
import type { ReadonlyDeep } from 'type-fest';
import type { Automation } from '../../../../../services/automations/automations-repository';
import { rulesToLegacyTrigger } from '../../../../../services/automations/trigger-compatibility';

/**
 * Augment the automation with legacy trigger data.
 *
 * We'll remove this soon as part of NY-1746.
 */
function serializeAutomation(
  automation: ReadonlyDeep<Automation>,
  _apiConfig: unknown,
  frame: Frame,
) {
  frame.response = {
    automations: [{ ...automation, ...rulesToLegacyTrigger(automation.trigger_rules) }],
  };
}

export { serializeAutomation as add, serializeAutomation as edit, serializeAutomation as read };
