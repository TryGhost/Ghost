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
import { LucideIcon } from '@tryghost/shade/utils';
import type { LeadMagnetLabelChanges } from './lead-magnets';

type SaveChanges = Pick<LeadMagnetLabelChanges, 'starts' | 'ends'>;
type Outcome = SaveChanges['starts'][number];

type DescriptionProps = {
  changes: SaveChanges;
  // The member's name as typed; the first word is used, or "this member" without one.
  memberName?: string;
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

// The dialog's body, also shown on the states page: "Add Lead magnet → Starts Free guide
// delivery", one row per automation, grouped by label. Labels line up in one column so the
// arrows do too.
export const LeadMagnetSaveDescription: React.FC<DescriptionProps> = ({
  changes,
  memberName,
  labelNames,
}) => {
  const firstName = memberName?.trim().split(/\s+/)[0];
  const possessive = firstName ? `${firstName}'s` : "this member's";
  const groups = [...groupByLabel(changes.starts, 'Add'), ...groupByLabel(changes.ends, 'Remove')];
  return (
    <Stack gap="lg">
      <p>Saving also updates {possessive} automations.</p>
      <div className="grid grid-cols-[auto_auto_1fr] items-start gap-x-4 gap-y-2 text-foreground">
        {groups.map(({ verb, labelSlug, items }, index) => {
          const span = { gridRow: `span ${items.length}` };
          return (
            <React.Fragment key={`${verb}-${labelSlug}`}>
              {index > 0 && <div className="col-span-3 my-2 border-t border-border-default" />}
              <span style={span}>
                {verb} <strong>{labelNames[labelSlug] ?? labelSlug}</strong>
              </span>
              {/* One line tall (1lh), so the arrow centres on the first line at any text size. */}
              <span className="flex h-[1lh] items-center" style={span} aria-hidden>
                <LucideIcon.ArrowRight className="size-4 text-muted-foreground" />
              </span>
              {items.map(({ id, name, allowsReentry }) => (
                <span key={id} className="col-start-3">
                  {verb === 'Add' ? 'Starts' : 'Stops'} <strong>{name}</strong>
                  {/* Follows the automation's re-entry setting, once it has one. */}
                  {verb === 'Remove' && !allowsReentry && (
                    <span className="ms-2">(no re-entry)</span>
                  )}
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
