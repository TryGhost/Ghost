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
  LoadingIndicator,
} from '@tryghost/shade/components';
import { formatNumber } from '@tryghost/shade/utils';

// PHASE 2's lifecycle confirms, to the messaging spec (Figma: Automations —
// Zach, "Event / Action / Dialog / Toast"). Their own file rather than edits to
// shared/lifecycle-dialogs and shared/archive-dialog, which other lanes still use.
//
// The rules the spec settles:
// - Where members are mid-flow, the dialog says how many, and the confirm turns
//   red — Turn off, and Archiving a live automation, exit them. Leave without
//   saving is the other red one: work is lost. Everything else is the black
//   primary.
// - Where nobody would be affected, the copy says less: Update drops the count,
//   Archive drops the exit sentence, and Turn off skips its dialog entirely (the
//   callers handle that — see inProgressCount there).

// "42 members", "1 member".
const membersInProgress = (count: number) =>
  `${formatNumber(count)} ${count === 1 ? 'member' : 'members'} currently in progress`;

const ConfirmButton: React.FC<{
  pending?: boolean;
  pendingLabel: string;
  destructive?: boolean;
  children: React.ReactNode;
  onConfirm: () => void;
}> = ({ pending = false, pendingLabel, destructive = false, children, onConfirm }) =>
  pending ? (
    <Button variant={destructive ? 'destructive' : 'default'} disabled>
      <LoadingIndicator color="light" size="sm" />
      <span className="sr-only">{pendingLabel}</span>
    </Button>
  ) : (
    <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>
      {children}
    </Button>
  );

interface ConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const PublishAutomationDialog: React.FC<ConfirmProps & { pending?: boolean }> = ({
  open,
  pending = false,
  onOpenChange,
  onConfirm,
}) => (
  <AlertDialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Publish automation?</AlertDialogTitle>
        <AlertDialogDescription>
          Once published, your automation goes live. Any member who meets the trigger will be
          enrolled automatically.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
        <ConfirmButton pending={pending} pendingLabel="Publishing..." onConfirm={onConfirm}>
          Publish
        </ConfirmButton>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// Only raised with members in progress — with none, turning off happens without
// a dialog.
export const TurnOffAutomationDialog: React.FC<ConfirmProps & { inProgressCount: number }> = ({
  open,
  inProgressCount,
  onOpenChange,
  onConfirm,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Turn off automation?</AlertDialogTitle>
        <AlertDialogDescription>
          {membersInProgress(inProgressCount)} will be exited immediately. Members will not be able
          to enter this automation.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <ConfirmButton pendingLabel="Turning off..." destructive onConfirm={onConfirm}>
          Turn off
        </ConfirmButton>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const UpdateAutomationDialog: React.FC<
  ConfirmProps & { inProgressCount: number; pending?: boolean }
> = ({ open, inProgressCount, pending = false, onOpenChange, onConfirm }) => (
  <AlertDialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Update automation?</AlertDialogTitle>
        <AlertDialogDescription>
          {inProgressCount > 0
            ? `Your updates will be applied immediately to ${membersInProgress(inProgressCount)} and to any members who enter the automation.`
            : 'Your updates will be applied immediately for any members who enter the automation.'}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
        <ConfirmButton pending={pending} pendingLabel="Updating..." onConfirm={onConfirm}>
          Update
        </ConfirmButton>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// inProgressCount is only non-zero for a LIVE automation with members mid-flow —
// the one case archiving exits anyone, and the one that goes red.
export const ArchiveAutomationDialog: React.FC<ConfirmProps & { inProgressCount: number }> = ({
  open,
  inProgressCount,
  onOpenChange,
  onConfirm,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Archive automation?</AlertDialogTitle>
        <AlertDialogDescription>
          {inProgressCount > 0
            ? `${membersInProgress(inProgressCount)} will be exited immediately. Automation settings and data are stored. You can unarchive automations at any time.`
            : 'Automation configuration and data are stored. You can unarchive automations at any time.'}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <ConfirmButton
          destructive={inProgressCount > 0}
          pendingLabel="Archiving..."
          onConfirm={onConfirm}
        >
          Archive
        </ConfirmButton>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
