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
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import type { LeadMagnetLabelChanges } from './lead-magnets';

type SaveChanges = Pick<LeadMagnetLabelChanges, 'starts' | 'ends'>;
type Outcome = SaveChanges['starts'][number];

type DescriptionProps = {
  changes: SaveChanges;
  // Label slug → name, for the labels added and removed.
  labelNames: Record<string, string>;
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
export const LeadMagnetSaveDescription: React.FC<DescriptionProps> = ({ changes, labelNames }) => {
  const groups = [...groupByLabel(changes.starts, 'Add'), ...groupByLabel(changes.ends, 'Remove')];
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
        {/* A div, so the description keeps its id and text size; its rows can't sit in a <p>. */}
        <AlertDialogDescription asChild>
          <div>
            <LeadMagnetSaveDescription {...description} />
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
