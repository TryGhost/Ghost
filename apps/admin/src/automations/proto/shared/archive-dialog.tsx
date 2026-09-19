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

/**
 * The confirm shown before archiving an automation, raised from every screen that
 * offers the action — the list's row menus and each lane's detail screen.
 *
 * WHY IT EXISTS, given that archiving is reversible and the toast already carries an
 * undo. Two reasons, and the second is the one that decided it:
 *
 *   1. You can archive a LIVE automation, and that turns it off. Members currently
 *      in progress are removed, which is the same consequence Turn off warns about
 *      and is not something to discover from a toast.
 *
 *   2. Nobody knows what "archive" does the first time they press it. The word sits
 *      where Delete used to, and a publisher who suspects it might destroy their run
 *      history has no way to find out except by doing it. The reassurance is the
 *      point of the dialog, not the friction — which is why it's shown for a stopped
 *      automation too, where there is no consequence at all to warn about.
 *
 * Undo stays in the toast regardless. This says restoring is possible; the toast
 * makes it one press, which is what makes the promise credible.
 *
 * Not destructive-coloured, and the verb is plain. Red would say the opposite of
 * everything the description says.
 */
export const ArchiveAutomationDialog: React.FC<{
  open: boolean;
  /** Named in the title, so there's no doubt which row the menu belonged to. */
  name: string;
  /** Live automations get the extra sentence, and it leads. */
  live: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}> = ({ open, name, live, onOpenChange, onConfirm }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Archive “{name}”?</AlertDialogTitle>
        <AlertDialogDescription>
          {/* Consequence first, reassurance second — in that order because the
                        consequence is the part that might change your mind, and a reader who
                        stops after one sentence should have read the one that matters.

                        The live sentence is Turn off's, word for word ("any members currently
                        in progress will be removed"): archiving a live automation IS turning
                        it off, and saying the same thing two ways would leave a publisher
                        wondering which of the two they just did. */}
          {live
            ? 'This automation will be turned off, and any members currently in progress will be removed. Its history and settings are kept, and you can restore it from the Archived view at any time.'
            : 'Its history and settings are kept, and you can restore it from the Archived view at any time.'}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <Button onClick={onConfirm}>Archive</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
