import React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tryghost/shade/components';

/**
 * Shown instead of the install flow to staff who can't install apps, so an install link
 * sent to them says who can.
 */
export const AskAdminDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Dialog
    open
    onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}
  >
    <DialogContent className="max-w-md" data-testid="app-install-not-allowed-dialog">
      <DialogHeader className="gap-3">
        <DialogTitle>Ask an administrator to install this app</DialogTitle>
        <DialogDescription>
          Only the site owner and administrators can install apps. Ask one of them to install it for
          you.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={onClose}>OK</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
