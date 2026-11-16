// PROTOTYPE ONLY (NY-1750): the note under the label field when adding labels to many members at
// once (bulk add, import). Peter's sketch, simplified in design review (2026-11-10): plain hint
// text, no icon or bold. From 1,000 members, a second, general sentence sets expectations on speed;
// it gives no count, since not every member labelled will start (some already have the label or
// have been through it), and the automations docs give the detail. Nothing is blocked. Don't merge
// this folder.
import { Stack, Text } from '@tryghost/shade/primitives';
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

// The same note under the member page's Labels field, in place of the Save dialog (Peter,
// 2026-11-16): one sentence per added label naming what it starts, then one for the automations a
// removed label takes this member out of, each on its own line. Unlike bulk add, it can be exact, since we know this
// member's runs.
// "A", "A and B", "A, B and C".
const nameList = (names: string[]) =>
  names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];

export const LeadMagnetMemberNoteText: React.FC<{
  starts: Match[];
  // Automations this member is in, whose label is being removed.
  removals: string[];
  memberName?: string;
}> = ({ starts, removals, memberName }) => {
  const firstName = memberName?.trim().split(/\s+/)[0];
  // Grouped by label, so one label starting two automations stays one sentence.
  const byLabel = new Map<string, string[]>();
  for (const { labelName, automationName } of starts) {
    byLabel.set(labelName, [...(byLabel.get(labelName) ?? []), automationName]);
  }
  const sentences = [...byLabel].map(
    ([labelName, names]) =>
      `${labelName} starts the ${nameList(names)} ${names.length > 1 ? 'automations' : 'automation'}`,
  );
  if (removals.length > 0) {
    const several = removals.length > 1;
    sentences.push(
      `${firstName ?? 'This member'} will be removed from the ${nameList(removals)} ${several ? 'automations' : 'automation'}`,
    );
  }
  if (sentences.length === 0) {
    return null;
  }
  // One line each, with no final period, as for other hints.
  return (
    <Stack gap="xs">
      {sentences.map((sentence) => (
        <Text key={sentence} as="p" size="sm" tone="secondary">
          {sentence}
        </Text>
      ))}
    </Stack>
  );
};
