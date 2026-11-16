// PROTOTYPE ONLY (NY-1750): the hint under the member page's Labels field, saying which label
// automations saving starts or stops for this member, in the style picked in the prototype menu.
// Plain hint text, no icons or bold (design review, 2026-11-10). Don't merge this folder.
import { Stack, Text } from '@tryghost/shade/primitives';
import type { LeadMagnetLabelChanges } from './lead-magnets';
import { useHintStyle } from './settings';
import { LeadMagnetSaveSummary } from './lead-magnets-summary';

export const LeadMagnetLabelsHint: React.FC<{ changes: LeadMagnetLabelChanges }> = ({
  changes,
}) => {
  const style = useHintStyle();
  const { starts, ends } = changes;
  if ((style !== 'lines' && style !== 'sentence') || (starts.length === 0 && ends.length === 0)) {
    return null;
  }
  if (style === 'sentence') {
    // The banner's sentence, as a plain hint.
    return (
      <Text as="p" size="sm" tone="secondary">
        <LeadMagnetSaveSummary ends={ends} starts={starts} />
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
