// PROTOTYPE ONLY (NY-1750): the note under the label field when adding labels to many members at
// once (bulk add, import). As in the Linear example (2026-11-17), after Peter's review: a muted zap
// (the Automations icon) and the label and automation names in medium weight, so it isn't missed in
// light gray. From 100,000 members (a placeholder), a second, general sentence sets expectations on speed; it gives
// no count, since not every member labelled will start (some already have the label or have been
// through it), and the automations docs give the detail. Nothing is blocked. Don't merge this
// folder.
import React from 'react';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { BULK_NOTE_THRESHOLD, useLeadMagnetLabelAutomations } from './lead-magnets';
import { useHintStyle } from './settings';

type Match = { labelName: string; automationName: string };

// A name in the note: medium weight, in the foreground colour.
export const LeadMagnetHintName: React.FC<React.PropsWithChildren> = ({ children }) => (
  <span className="font-medium text-foreground">{children}</span>
);

// The note's frame: a muted zap, then muted text. Also used by the bulk remove note.
export const LeadMagnetHintLine: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Inline align="start" gap="sm">
    {/* One line tall (1lh), so the icon centres on the first line. */}
    <span className="flex h-[1lh] shrink-0 items-center text-sm text-muted-foreground" aria-hidden>
      <LucideIcon.Zap className="size-3" />
    </span>
    <Text as="p" size="sm" tone="secondary">
      {children}
    </Text>
  </Inline>
);

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
  // No final period, as for other hints.
  return (
    <LeadMagnetHintLine>
      {matches.map(({ labelName, automationName }, index) => (
        <React.Fragment key={`${labelName}-${automationName}`}>
          {index > 0 && '. '}
          <LeadMagnetHintName>{labelName}</LeadMagnetHintName> starts the{' '}
          <LeadMagnetHintName>{automationName}</LeadMagnetHintName> automation
        </React.Fragment>
      ))}
      {memberCount >= BULK_NOTE_THRESHOLD &&
        (source === 'import'
          ? '. Large imports can take longer to start'
          : '. Adding this many members at once can take longer to start')}
    </LeadMagnetHintLine>
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
  // Only when the prototype menu picks hints.
  if (useHintStyle() !== 'hint') {
    return null;
  }
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
