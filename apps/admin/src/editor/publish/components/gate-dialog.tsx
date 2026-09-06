import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tryghost/shade/components';
import type { ReactNode } from 'react';

export interface GateDialogProps {
  testId: string;
  title: string;
  children: ReactNode;
  onContinue: () => void;
  onBack: () => void;
}

/**
 * The pre-publish interstitials (TK reminders, public-preview warnings):
 * continue into the flow, or go back to the editor.
 */
export function GateDialog({ testId, title, children, onContinue, onBack }: GateDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onBack()}>
      <DialogContent data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{children}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onContinue}>
            Continue to publish
          </Button>
          <Button onClick={onBack}>Back to editor</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
