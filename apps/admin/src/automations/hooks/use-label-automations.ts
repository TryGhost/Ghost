import type { Label } from '@tryghost/admin-x-framework/api/labels';
import {
  useActiveLabelAutomations,
  type ActiveLabelAutomation,
} from './use-active-label-automations';

export interface LabelAutomationMatch {
  label: Pick<Label, 'id' | 'name'>;
  automations: { id: string; name: string }[];
}

export function matchLabelAutomations({
  labels,
  automations,
}: {
  labels: Pick<Label, 'id' | 'name'>[];
  automations: ActiveLabelAutomation[];
}): LabelAutomationMatch[] {
  return labels.flatMap((label) => {
    const matching = automations
      .filter(({ labelIds }) => labelIds.includes(label.id))
      .map(({ id, name }) => ({ id, name }));
    return matching.length ? [{ label, automations: matching }] : [];
  });
}

/** Matches labels by ID; callers own confirmation and submission. */
export function useLabelAutomations({
  labels,
  enabled,
}: {
  labels: Pick<Label, 'id' | 'name'>[];
  enabled: boolean;
}) {
  const lookup = useActiveLabelAutomations({ enabled: enabled && labels.length > 0 });
  return { ...lookup, matches: matchLabelAutomations({ labels, automations: lookup.data }) };
}
