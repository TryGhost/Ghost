// PROTOTYPE ONLY (NY-1750): the note under the label field when adding labels to many members at
// once (bulk add, import). Peter's sketch, simplified in design review (2026-11-10): plain hint
// text, no icon or bold. From 1,000 members, a second, general sentence sets expectations on speed;
// it gives no count, since not every member labelled will start (some already have the label or
// have been through it), and the automations docs give the detail. Nothing is blocked. Don't merge
// this folder.
import { Text } from '@tryghost/shade/primitives';
import { BULK_NOTE_THRESHOLD, useLeadMagnetLabelAutomations } from './lead-magnets';

type Match = { labelName: string; automationName: string };

// The note itself, for the real fields below and the states page.
type Source = 'bulk' | 'import';

export const LeadMagnetBulkNoteText: React.FC<{
  matches: Match[];
  memberCount: number;
  source: Source;
}> = ({ matches, memberCount, source }) => {
  if (matches.length === 0) {
    return null;
  }
  const sentences = matches.map(
    ({ labelName, automationName }) => `${labelName} starts the ${automationName} automation`,
  );
  if (memberCount >= BULK_NOTE_THRESHOLD) {
    sentences.push(
      source === 'import'
        ? 'Large imports can take longer to start'
        : 'Adding this many members at once can take longer to start',
    );
  }
  // No final period, as for other hints.
  return (
    <Text as="p" size="sm" tone="secondary">
      {sentences.join('. ')}
    </Text>
  );
};

// Under a real label field: the active label automations the selected labels start.
export const LeadMagnetBulkNote: React.FC<{
  labels: { slug: string; name: string }[];
  selectedSlugs: string[];
  memberCount: number;
  source: Source;
}> = ({ labels, selectedSlugs, memberCount, source }) => {
  const automations = useLeadMagnetLabelAutomations(selectedSlugs);
  const matches = automations.map(({ labelSlug, name }) => ({
    labelName: labels.find((label) => label.slug === labelSlug)?.name ?? labelSlug,
    automationName: name,
  }));
  return <LeadMagnetBulkNoteText matches={matches} memberCount={memberCount} source={source} />;
};
