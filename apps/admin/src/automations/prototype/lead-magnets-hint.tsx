// PROTOTYPE ONLY (NY-1750): the hint under the member page's Labels field, saying which label
// automations saving starts or stops for this member, in the style picked in the prototype menu.
// Plain hint text, no icons or bold (design review, 2026-11-10). Don't merge this folder.
import { Stack, Text } from '@tryghost/shade/primitives';
import type { LeadMagnetLabelChanges } from './lead-magnets';
import { useHintStyle } from './settings';

type Automation = { id: string; name: string };

// "A", "A and B", "A, B and C".
const nameList = (automations: Automation[]) => {
  const names = automations.map(({ name }) => name);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
};

export const LeadMagnetLabelsHint: React.FC<{ changes: LeadMagnetLabelChanges }> = ({
  changes,
}) => {
  const style = useHintStyle();
  const { starts, ends } = changes;
  if (style === 'dialog' || (starts.length === 0 && ends.length === 0)) {
    return null;
  }
  if (style === 'sentence') {
    const parts = [
      starts.length > 0 && `start ${nameList(starts)}`,
      ends.length > 0 && `stop ${nameList(ends)}`,
    ].filter(Boolean);
    // Names the kind of thing, in case the hint is read out of context.
    const noun = starts.length + ends.length === 1 ? 'automation' : 'automations';
    return (
      <Text as="p" size="sm" tone="secondary">
        Member will {parts.join(' and ')} {noun}
      </Text>
    );
  }
  return (
    <Stack gap="xs">
      {starts.map(({ id, name }) => (
        <Text key={`start-${id}`} as="p" size="sm" tone="secondary">
          Member will start {name}
        </Text>
      ))}
      {ends.map(({ id, name }) => (
        <Text key={`stop-${id}`} as="p" size="sm" tone="secondary">
          Member will stop {name}
        </Text>
      ))}
    </Stack>
  );
};
