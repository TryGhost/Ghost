// PROTOTYPE ONLY (NY-1750): what the member page's banner and one-sentence hint both say about
// the label automations saving starts and stops for this member. Each line names the label that
// causes it, as the Save dialog and the bulk hint do: "VIP will start the Welcome VIPs automation
// when you save". Names always come with "automation(s)", so a name like "VIP welcome" isn't
// mistaken for something else. Don't merge this folder.
import React from 'react';
import type { LeadMagnetLabelChanges } from './lead-magnets';

type Outcome = LeadMagnetLabelChanges['starts'][number];

// From this many label changes at once, the lines become one count.
const SUMMARY_FROM = 3;

// The banner's names are semibold; the hint's medium, in the foreground colour, as the bulk hint's.
type EmphasisStyle = boolean | 'medium';
const Emphasis: React.FC<React.PropsWithChildren<{ on: EmphasisStyle }>> = ({ on, children }) =>
  on === 'medium' ? (
    <span className="font-medium text-foreground">{children}</span>
  ) : on ? (
    <span className="font-semibold">{children}</span>
  ) : (
    <>{children}</>
  );

// "the A automation", "the A and B automations", "the A, B and C automations".
const Automations: React.FC<{ outcomes: Outcome[]; emphasis: EmphasisStyle }> = ({
  outcomes,
  emphasis,
}) => (
  <>
    the{' '}
    {outcomes.map(({ id, name }, index) => (
      <React.Fragment key={id}>
        {index > 0 && (index === outcomes.length - 1 ? ' and ' : ', ')}
        <Emphasis on={emphasis}>{name}</Emphasis>
      </React.Fragment>
    ))}{' '}
    {outcomes.length > 1 ? 'automations' : 'automation'}
  </>
);

// Outcomes grouped by the label that causes them, in order.
const byLabel = (outcomes: Outcome[]) => {
  const groups = new Map<string, Outcome[]>();
  for (const outcome of outcomes) {
    groups.set(outcome.labelSlug, [...(groups.get(outcome.labelSlug) ?? []), outcome]);
  }
  return [...groups];
};

const plural = (count: number, noun: string) => (count === 1 ? `1 ${noun}` : `${count} ${noun}s`);

// One line per label change:
// "VIP will start the Welcome VIPs automation when you save",
// "Removing Trial will stop the Trial nurture automation when you save".
// From three label changes, one line: "The 3 labels you added will start 3 automations when you
// save", or with removals, "Your 3 label changes will start 2 automations and stop 1 when you save".
export const LeadMagnetSaveSummary: React.FC<
  Pick<LeadMagnetLabelChanges, 'starts' | 'ends'> & {
    // Label slug → name.
    labelNames: Record<string, string>;
    emphasis?: EmphasisStyle;
  }
> = ({ starts, ends, labelNames, emphasis = false }) => {
  const added = byLabel(starts);
  const removed = byLabel(ends);
  const changes = added.length + removed.length;
  if (changes >= SUMMARY_FROM) {
    const parts = [
      starts.length > 0 && `start ${plural(starts.length, 'automation')}`,
      ends.length > 0 &&
        `stop ${starts.length > 0 ? ends.length : plural(ends.length, 'automation')}`,
    ].filter(Boolean);
    const subject =
      removed.length === 0 ? `The ${changes} labels you added` : `Your ${changes} label changes`;
    return (
      <>
        {subject} will {parts.join(' and ')} when you save
      </>
    );
  }
  const label = (slug: string) => <Emphasis on={emphasis}>{labelNames[slug] ?? slug}</Emphasis>;
  return (
    <>
      {added.map(([slug, outcomes]) => (
        <span key={`add-${slug}`} className="block">
          {label(slug)} will start <Automations emphasis={emphasis} outcomes={outcomes} /> when you
          save
        </span>
      ))}
      {removed.map(([slug, outcomes]) => (
        <span key={`remove-${slug}`} className="block">
          Removing {label(slug)} will stop <Automations emphasis={emphasis} outcomes={outcomes} />{' '}
          when you save
        </span>
      ))}
    </>
  );
};
