import { Fragment } from 'react';
import { Grid, Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import type { LabelAutomationMatch } from '@/automations/hooks/use-label-automations';

/** Label-to-automation content, shared independently of each flow's dialog state. */
export function LabelAutomationSummary({
  matches,
  large,
  memberCount,
}: {
  matches: LabelAutomationMatch[];
  large: boolean;
  memberCount: number;
}) {
  if (!matches.length) {
    return null;
  }
  const count = new Set(matches.flatMap(({ automations }) => automations.map(({ id }) => id))).size;
  const caveat = large ? ' With this many members, it can take longer to start.' : '';
  const target = memberCount === 1 ? 'this member' : 'these members';

  if (matches.length === 1) {
    const { label, automations } = matches[0];
    return (
      <p>
        Adding <strong>{label.name}</strong> also starts the{' '}
        {automations.map(({ id, name }, index) => (
          <Fragment key={id}>
            {index > 0 && (index === automations.length - 1 ? ' and ' : ', ')}
            <strong>{name}</strong>
          </Fragment>
        ))}{' '}
        {automations.length === 1 ? 'automation' : 'automations'} for {target}.{caveat}
      </p>
    );
  }

  return (
    <Stack gap="lg">
      <p>
        Adding these labels also starts {formatNumber(count)}{' '}
        {count === 1 ? 'automation' : 'automations'} for {target}.{caveat}
      </p>
      <Grid align="start" className="grid-cols-[minmax(0,1fr)_auto_minmax(0,2fr)]" gap="md">
        {matches.map(({ label, automations }) => (
          <Fragment key={label.id}>
            <span className="break-words">
              Add <strong>{label.name}</strong>
            </span>
            <Inline align="center" as="span" className="h-[1lh]" aria-hidden>
              <LucideIcon.ArrowRight className="size-4 text-muted-foreground" />
            </Inline>
            <Stack className="min-w-0 break-words" gap="sm">
              {automations.map(({ id, name }) => (
                <span key={id}>
                  Starts <strong>{name}</strong>
                </span>
              ))}
            </Stack>
          </Fragment>
        ))}
      </Grid>
    </Stack>
  );
}
