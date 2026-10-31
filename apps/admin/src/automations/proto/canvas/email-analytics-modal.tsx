import React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { EmailPerformance } from './email-analytics';
import type { SheetEmail } from './email-analytics-sheet';

// An email's report as a modal — the same contents as EmailAnalyticsSheet (the
// performance numbers and the links list), in Shade's Dialog rather than a sheet
// sliding over the canvas's right edge.
//
// Phase 2 asks for this (see the edit canvas's analyticsSurface): its side panel
// now owns the screen's right edge, and a second surface arriving from that edge
// stacked against it. Centred and modal, the report is plainly about one email
// and plainly separate from the panel. Every other lane keeps the sheet.
//
// Shade's Dialog brings the overlay, focus trap, Esc and outside-press closing;
// it has no close button of its own, so the header carries one.
interface EmailAnalyticsModalProps {
  email: SheetEmail | null;
  onClose: () => void;
}

export const EmailAnalyticsModal: React.FC<EmailAnalyticsModalProps> = ({ email, onClose }) => (
  <Dialog open={Boolean(email)} onOpenChange={(open) => !open && onClose()}>
    {/* Capped at the viewport less the dialog's own top offset, scrolling inside
        once the links list runs long, so the header and close stay put. */}
    <DialogContent
      className="max-h-[84vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden"
      data-testid="email-analytics-modal"
    >
      {email && (
        <>
          <DialogHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div className="flex min-w-0 flex-col gap-1.5">
              {/* The subject is what this report is about, as the sheet's
                  header had it. */}
              <DialogTitle className="leading-tight">{email.subject}</DialogTitle>
              <DialogDescription>Email performance</DialogDescription>
            </div>
            <Button
              aria-label="Close"
              className="-mt-2 -mr-2 shrink-0"
              size="icon"
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              <LucideIcon.X strokeWidth={2} />
            </Button>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto">
            <EmailPerformance actionId={email.actionId} stats={email.stats} />
          </div>
        </>
      )}
    </DialogContent>
  </Dialog>
);
