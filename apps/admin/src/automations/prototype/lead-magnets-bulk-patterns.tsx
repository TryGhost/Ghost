// PROTOTYPE ONLY (NY-1750): the banner and the confirmation step for adding labels to many members
// at once (bulk add, import), in the real dialogs and on the patterns page. Which one shows, or the
// hint (lead-magnets-bulk-note.tsx), is picked in the prototype menu. Don't merge this folder.
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import { BULK_NOTE_THRESHOLD } from './lead-magnets';
import type { LeadMagnetBulkMatch } from './lead-magnets-bulk';
import { LeadMagnetBannerFrame, LeadMagnetReveal } from './lead-magnets-banner';
import { useHintStyle } from './settings';

type Source = 'bulk' | 'import';

// As on the member page, each line names the label that causes it: "Lead magnet will start the
// Free guide delivery automation when you add it". From three, one count line. From 100k members,
// the last line goes on to say it can take longer, as one paragraph, so a wrapped line doesn't
// leave a ragged block.
export const LeadMagnetBulkBannerText: React.FC<{
  matches: LeadMagnetBulkMatch[];
  source: Source;
  large: boolean;
}> = ({ matches, source, large }) => {
  const bulk = source === 'bulk';
  const caveat =
    large &&
    (bulk
      ? '. Adding this many members at once can take longer to start'
      : '. Large imports can take longer to start');
  if (matches.length >= 3) {
    return (
      <>
        The {formatNumber(matches.length)} labels you picked will start{' '}
        {formatNumber(matches.length)} automations when you {bulk ? 'add them' : 'import'}
        {caveat}
      </>
    );
  }
  return (
    <>
      {matches.map(({ slug, label, automation }, index) => (
        <span key={`${slug}-${automation}`} className="block">
          <span className="font-semibold">{label}</span> will start the{' '}
          <span className="font-semibold">{automation}</span> automation when you{' '}
          {bulk ? 'add it' : 'import'}
          {index === matches.length - 1 && caveat}
        </span>
      ))}
    </>
  );
};

// "the A automation", "the A and B automations", "the A, B and C automations", names in bold.
export const LeadMagnetAutomationNames: React.FC<{ names: string[] }> = ({ names }) => (
  <>
    the{' '}
    {names.map((name, index) => (
      <React.Fragment key={name}>
        {index > 0 && (index === names.length - 1 ? ' and ' : ', ')}
        <strong>{name}</strong>
      </React.Fragment>
    ))}{' '}
    {names.length > 1 ? 'automations' : 'automation'}
  </>
);

const automationCount = (count: number) =>
  count === 1 ? 'an automation' : `${formatNumber(count)} automations`;

// The confirmation step's body: what the action also starts, then "Lead magnet → Starts Free guide
// delivery", one row per label and automation, as in the member page's Save dialog. No member
// counts, since not everyone labelled starts. From 100k members (a placeholder), a sentence on speed.
// With one label, just a sentence. `layout="table"` tries the rows as a two-column table, Label
// and Automations, instead of arrows (Peter, 2026-11-17).
export const LeadMagnetBulkConfirmText: React.FC<{
  matches: LeadMagnetBulkMatch[];
  source: Source;
  large: boolean;
  layout?: 'arrows' | 'table';
}> = ({ matches, source, large, layout = 'arrows' }) => {
  const bulk = source === 'bulk';
  const labelCount = new Set(matches.map(({ slug }) => slug)).size;
  const intro = bulk
    ? `Adding ${labelCount === 1 ? 'this label' : 'these labels'} also starts ${automationCount(matches.length)} for these members.`
    : `Importing also starts ${automationCount(matches.length)} for these members.`;
  // From 100k members, a sentence on speed, in the same paragraph so it isn't a third block.
  const caveat =
    large &&
    (bulk
      ? ' With this many members, it can take longer to start.'
      : ' Large imports can take longer to start.');
  // One label: one sentence, since a row would only repeat it (2026-11-17).
  if (labelCount === 1) {
    const label = <strong>{matches[0].label}</strong>;
    const names = <LeadMagnetAutomationNames names={matches.map(({ automation }) => automation)} />;
    return (
      <p>
        {bulk ? (
          <>
            Adding {label} also starts {names} for these members.
          </>
        ) : (
          <>
            Importing also starts {names} for members labeled {label}.
          </>
        )}
        {caveat}
      </p>
    );
  }
  if (layout === 'table') {
    // One row per label, its automations one per line.
    const byLabel = new Map<string, LeadMagnetBulkMatch[]>();
    for (const match of matches) {
      byLabel.set(match.slug, [...(byLabel.get(match.slug) ?? []), match]);
    }
    return (
      <Stack gap="lg">
        <p>
          {intro}
          {caveat}
        </p>
        <Table className="text-foreground">
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Automations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...byLabel].map(([slug, items]) => (
              <TableRow key={slug}>
                <TableCell className="align-top">
                  {bulk && 'Added '}
                  <strong>{items[0].label}</strong>
                </TableCell>
                <TableCell className="align-top">
                  {items.map(({ automation }) => (
                    <span key={automation} className="block">
                      Starts <strong>{automation}</strong>
                    </span>
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Stack>
    );
  }
  return (
    <Stack gap="lg">
      <p>
        {intro}
        {caveat}
      </p>
      <div className="grid grid-cols-[auto_auto_1fr] items-start gap-x-4 gap-y-3 text-foreground">
        {matches.map(({ slug, label, automation }) => (
          <React.Fragment key={`${slug}-${automation}`}>
            <span>
              {bulk && 'Add '}
              <strong>{label}</strong>
            </span>
            {/* One line tall (1lh), so the arrow centres on the first line. */}
            <span className="flex h-[1lh] items-center" aria-hidden>
              <LucideIcon.ArrowRight className="size-4 text-muted-foreground" />
            </span>
            <span>
              Starts <strong>{automation}</strong>
            </span>
          </React.Fragment>
        ))}
      </div>
    </Stack>
  );
};

// The real dialogs' confirmation step, with the caveat from 100k members.
export const LeadMagnetBulkConfirm: React.FC<{
  matches: LeadMagnetBulkMatch[];
  memberCount: number;
  source: Source;
}> = ({ matches, memberCount, source }) => (
  <LeadMagnetBulkConfirmText
    large={memberCount >= BULK_NOTE_THRESHOLD}
    matches={matches}
    source={source}
  />
);

// The banner at the top of the dialog, when the prototype menu picks banners. In a parent spaced
// by gap-5, or with `ownSpacing`, its own 20px above.
export const LeadMagnetBulkBanner: React.FC<{
  matches: LeadMagnetBulkMatch[];
  memberCount: number;
  source: Source;
  ownSpacing?: boolean;
}> = ({ matches, memberCount, source, ownSpacing = false }) =>
  useHintStyle() === 'banner' ? (
    <LeadMagnetReveal from="top" open={matches.length > 0} ownSpacing={ownSpacing}>
      <LeadMagnetBannerFrame>
        <LeadMagnetBulkBannerText
          large={memberCount >= BULK_NOTE_THRESHOLD}
          matches={matches}
          source={source}
        />
      </LeadMagnetBannerFrame>
    </LeadMagnetReveal>
  ) : null;
