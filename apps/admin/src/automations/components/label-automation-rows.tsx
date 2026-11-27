import { Fragment } from 'react';
import { Grid, Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import type { LabelAutomationMatch } from '@/automations/hooks/use-label-automations';

interface LabelAutomationNamesProps {
  automations: LabelAutomationMatch['automations'];
}

export function LabelAutomationNames({ automations }: LabelAutomationNamesProps) {
  return (
    <>
      the{' '}
      {automations.map(({ id, name }, index) => (
        <Fragment key={id}>
          {index > 0 && (index === automations.length - 1 ? ' and ' : ', ')}
          <strong>{name}</strong>
        </Fragment>
      ))}{' '}
      {automations.length === 1 ? 'automation' : 'automations'}
    </>
  );
}

interface LabelAutomationRowsProps {
  matches: LabelAutomationMatch[];
  showAddPrefix: boolean;
}

export function LabelAutomationRows({ matches, showAddPrefix }: LabelAutomationRowsProps) {
  return (
    <Grid align="start" className="grid-cols-[minmax(0,1fr)_auto_minmax(0,2fr)]" gap="md">
      {matches.map(({ label, automations }) => (
        <Fragment key={label.id}>
          <span className="break-words">
            {showAddPrefix && 'Add '}
            <strong>{label.name}</strong>
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
  );
}
