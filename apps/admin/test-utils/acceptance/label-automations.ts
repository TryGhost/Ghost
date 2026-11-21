import type { Automation } from '@tryghost/test-data';
import type { Label } from '@tryghost/admin-x-framework/api/labels';
import { fakeAutomations } from './resources';
import { fakeAdminEndpoint } from './worker';

/** Declares label-trigger details alongside the browse summaries used by the app. */
export function fakeLabelAutomations(
  references: { automation: Automation; label: Pick<Label, 'id' | 'name'> }[],
) {
  fakeAutomations(references.map(({ automation }) => automation));
  for (const { automation, label } of references) {
    fakeAdminEndpoint('GET', `/automations/${automation.id}/`, {
      automations: [
        { ...automation, trigger_rules: [{ trigger_type: 'label_added', label_id: label.id }] },
      ],
    });
    fakeAdminEndpoint('GET', `/labels/${label.id}/`, { labels: [label] });
  }
}
