// PROTOTYPE ONLY (NY-1750): the one sentence the member page's banner and one-sentence hint share,
// saying what saving starts and stops for this member. Names always come with "automation(s)", so
// a name like "VIP welcome" isn't mistaken for something else. Don't merge this folder.
import React from 'react';
import type { LeadMagnetLabelChanges } from './lead-magnets';

type Automation = { id: string; name: string };

// The banner emphasises the names; the hint stays plain.
const Emphasis: React.FC<React.PropsWithChildren<{ on: boolean }>> = ({ on, children }) =>
  on ? <span className="font-semibold">{children}</span> : <>{children}</>;

// "A", "A and B", "A, B and C".
const Names: React.FC<{ automations: Automation[]; emphasis: boolean }> = ({
  automations,
  emphasis,
}) => (
  <>
    {automations.map(({ id, name }, index) => (
      <React.Fragment key={id}>
        {index > 0 && (index === automations.length - 1 ? ' and ' : ', ')}
        <Emphasis on={emphasis}>{name}</Emphasis>
      </React.Fragment>
    ))}
  </>
);

// "Saving will start the A automation for this member",
// "Saving will stop the A and B automations for this member",
// "Saving will start A and stop B automations for this member" (one trailing "automations" covers
// both names, which reads more lightly than "the A automation and … the B automation").
export const LeadMagnetSaveSummary: React.FC<
  Pick<LeadMagnetLabelChanges, 'starts' | 'ends'> & { emphasis?: boolean }
> = ({ starts, ends, emphasis = false }) => {
  if (starts.length > 0 && ends.length > 0) {
    return (
      <>
        Saving will start <Names automations={starts} emphasis={emphasis} />
        {starts.length > 1 ? ', and ' : ' and '}stop{' '}
        <Names automations={ends} emphasis={emphasis} /> automations for this member
      </>
    );
  }
  const automations = starts.length > 0 ? starts : ends;
  return (
    <>
      Saving will {starts.length > 0 ? 'start' : 'stop'} the{' '}
      <Names automations={automations} emphasis={emphasis} />{' '}
      {automations.length > 1 ? 'automations' : 'automation'} for this member
    </>
  );
};
