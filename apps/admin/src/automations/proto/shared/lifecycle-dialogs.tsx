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

// The lifecycle confirms — publishing an automation, turning one off, and
// pushing edits to one that's live. Moved out of phase-2's detail screen when
// the LIST grew Publish/Turn off in its row menus: the same act raised from two
// screens has to ask with the same words, and two copies of a dialog is how the
// words drift. Shared the way archive-dialog already is.
//
// Structure and weight come from the shipped editor (plain AlertDialog,
// non-destructive confirm, same shape of sentence); the vocabulary is the
// proto's, and deliberately narrower than what's shipped.
//
// Publish is the word throughout, matching the shipping editor, where Publish is
// what takes a stopped automation live — the button and the dialog it opens have
// to say the same thing.

// The confirm button, with production's own in-flight treatment: the label is
// replaced by a spinner and kept for screen readers, and both controls go inert so
// the dialog can't be dismissed or double-fired mid-request. Callers with no
// request to wait on pass pending={false} and get a plain button.
const ConfirmButton: React.FC<{
  pending: boolean;
  pendingLabel: string;
  children: React.ReactNode;
  onConfirm: () => void;
}> = ({ pending, pendingLabel, children, onConfirm }) =>
  pending ? (
    <Button disabled>
      <LoadingIndicator color="light" size="sm" />
      <span className="sr-only">{pendingLabel}</span>
    </Button>
  ) : (
    <Button onClick={onConfirm}>{children}</Button>
  );

export const TurnOnAutomationDialog: React.FC<{
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}> = ({ open, pending, onOpenChange, onConfirm }) => (
  <AlertDialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Publish automation?</AlertDialogTitle>
        <AlertDialogDescription>
          Your automation will start running. Any member who meets the trigger will be enrolled
          automatically.
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

export const TurnOffAutomationDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}> = ({ open, onOpenChange, onConfirm }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Turn off automation?</AlertDialogTitle>
        <AlertDialogDescription>
          Your automation will no longer run, and any members currently in progress will be removed.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <Button onClick={onConfirm}>Turn off</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// Publishing to an automation that's ON confirms — but only confirms. What happens to
// members already mid-flow is a real question the team still has to settle, and
// offering a choice here would imply we'd answered it. A plain "are you sure"
// marks the moment as deliberate without encoding a decision that doesn't exist
// yet; options go back in when there's something to encode.
export const PublishChangesDialog: React.FC<{
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}> = ({ open, pending, onOpenChange, onConfirm }) => (
  <AlertDialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Publish changes</AlertDialogTitle>
        <AlertDialogDescription>
          This automation is on — these changes will take effect immediately.
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
