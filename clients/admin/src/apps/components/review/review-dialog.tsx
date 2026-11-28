import React from 'react';
import { Dialog, DialogContent } from '@tryghost/shade/components';

interface ReviewDialogProps {
  /** Set while Ghost is answering, so its answer is never about a closed review. */
  locked?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** The dialog an app's review, and what comes of it, is shown in. */
export const ReviewDialog: React.FC<ReviewDialogProps> = ({
  locked = false,
  onClose,
  children,
}) => (
  <Dialog
    open
    onOpenChange={(open) => {
      if (!open && !locked) {
        onClose();
      }
    }}
  >
    {/* The review can be taller than a short screen; the backdrop then scrolls the whole dialog. */}
    <DialogContent
      className="max-w-lg overflow-x-hidden"
      data-testid="app-install-dialog"
      scroll="overlay"
    >
      {children}
    </DialogContent>
  </Dialog>
);
