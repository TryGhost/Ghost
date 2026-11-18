// PROTOTYPE ONLY (NY-1750): the member page's Save confirmation, when saving a member's labels
// starts or stops a label automation for them ("Dialog on Save" in the prototype menu). Design
// review (2026-11-10) preferred this to a hint under Labels. The title matches the Save button;
// each row ties a label change to the automations it starts or stops. Don't merge this folder.
import React from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import type { LeadMagnetLabelChanges } from './lead-magnets';
import { LeadMagnetAutomationNames } from './lead-magnets-bulk-patterns';

type SaveChanges = Pick<LeadMagnetLabelChanges, 'starts' | 'ends'>;
type Outcome = SaveChanges['starts'][number];

type DescriptionProps = {
  changes: SaveChanges;
  // Label slug → name, for the labels added and removed.
  labelNames: Record<string, string>;
  // arrows (default): "Add Lead magnet → Starts Free guide delivery". table: a two-column table,
  // Label and Automations, after Peter (2026-11-17) found the arrows too much.
  layout?: 'arrows' | 'table';
};

// One group per label change, with every automation it starts or stops.
const groupByLabel = (outcomes: Outcome[], verb: 'Add' | 'Remove') => {
  const groups = new Map<string, Outcome[]>();
  for (const outcome of outcomes) {
    groups.set(outcome.labelSlug, [...(groups.get(outcome.labelSlug) ?? []), outcome]);
  }
  return [...groups].map(([labelSlug, items]) => ({ verb, labelSlug, items }));
};

// "starts an automation", "starts 2 automations", "stops an automation", or "starts and stops
// automations", matching the Starts and Stops in the rows below.
const summary = ({ starts, ends }: SaveChanges) => {
  if (starts.length > 0 && ends.length > 0) {
    return 'starts and stops automations';
  }
  const count = starts.length || ends.length;
  const verb = starts.length > 0 ? 'starts' : 'stops';
  return count === 1 ? `${verb} an automation` : `${verb} ${formatNumber(count)} automations`;
};

// The dialog's body, also shown on the states page: "Add Lead magnet → Starts Free guide
// delivery", one row per automation, grouped by label. Labels line up in one column so the
// arrows do too.
export const LeadMagnetSaveDescription: React.FC<DescriptionProps> = ({
  changes,
  labelNames,
  layout = 'arrows',
}) => {
  const groups = [...groupByLabel(changes.starts, 'Add'), ...groupByLabel(changes.ends, 'Remove')];
  // One label added: one sentence, since a row would only repeat the intro (2026-11-17).
  if (groups.length === 1 && groups[0].verb === 'Add') {
    const [{ labelSlug, items }] = groups;
    return (
      <p>
        Adding <strong>{labelNames[labelSlug] ?? labelSlug}</strong> also starts{' '}
        <LeadMagnetAutomationNames names={items.map(({ name }) => name)} /> for this member.
      </p>
    );
  }
  if (layout === 'table') {
    // One row per label, its automations one per line.
    return (
      <Stack gap="lg">
        <p>Saving also {summary(changes)} for this member.</p>
        <Table className="text-foreground">
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Automations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map(({ verb, labelSlug, items }) => (
              <TableRow key={`${verb}-${labelSlug}`}>
                <TableCell className="align-top">
                  {verb === 'Add' ? 'Added' : 'Removed'} {labelNames[labelSlug] ?? labelSlug}
                </TableCell>
                <TableCell className="align-top">
                  {items.map(({ id, name }) => (
                    <span key={id} className="block">
                      {verb === 'Add' ? 'Starts' : 'Stops'} {name}
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
      <p>Saving also {summary(changes)} for this member.</p>
      <div className="grid grid-cols-[auto_auto_1fr] items-start gap-x-4 gap-y-3 text-foreground">
        {groups.map(({ verb, labelSlug, items }) => {
          const span = { gridRow: `span ${items.length}` };
          return (
            <React.Fragment key={`${verb}-${labelSlug}`}>
              <span style={span}>
                {verb} <strong>{labelNames[labelSlug] ?? labelSlug}</strong>
              </span>
              {/* One line tall (1lh), so the arrow centres on the first line at any text size. */}
              <span className="flex h-[1lh] items-center" style={span} aria-hidden>
                <LucideIcon.ArrowRight className="size-4 text-muted-foreground" />
              </span>
              {items.map(({ id, name }) => (
                <span key={id} className="col-start-3">
                  {verb === 'Add' ? 'Starts' : 'Stops'} <strong>{name}</strong>
                </span>
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </Stack>
  );
};

export const LeadMagnetSaveDialog: React.FC<
  DescriptionProps & {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
  }
> = ({ open, onOpenChange, onConfirm, ...description }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Save changes?</AlertDialogTitle>
        {/* A div, so the description keeps its id and text size; its rows can't sit in a <p>.
            Removals say nothing (Peter, 2026-11-17). */}
        <AlertDialogDescription asChild>
          <div>
            <LeadMagnetSaveDescription
              changes={{ starts: description.changes.starts, ends: [] }}
              labelNames={description.labelNames}
              layout={description.layout}
            />
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <Button onClick={onConfirm}>Save</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
