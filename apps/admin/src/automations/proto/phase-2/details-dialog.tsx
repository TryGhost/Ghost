import React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@tryghost/shade/components';

/**
 * Name + description, in a dialog. One component for both the settings dialog and
 * the duplicate dialog, so the two are the same object rather than two that
 * resemble each other — duplicating is naming a new automation, and it should ask
 * the way renaming asks.
 *
 * Two footers, depending on what closing means where it's used. With a
 * confirmLabel it's a form: values are held by the caller, nothing is committed
 * by typing, and Cancel is a real cancel — the list's rename and the duplicate
 * dialog work this way, because their confirm is the only commit in sight.
 * WITHOUT one it's an editor over the caller's draft: typing writes through, and
 * the single Close just puts the dialog away. That's the detail screen's mode —
 * a Cancel/Done pair there read as the task being finished and saved, when the
 * real commit is the screen's global Save.
 */
interface DetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heading: string;
  // Says who these words are for. It used to be a hint under the description alone,
  // which left the name unaccounted for and put the reassurance below the field it
  // was reassuring about. One line at the top covers both.
  blurb: string;
  // Both or neither — a confirm button needs a handler and a handler needs a
  // button. Omit both for the write-through mode.
  confirmLabel?: string;
  values: { name: string; description: string };
  onChange: (next: { name: string; description: string }) => void;
  onConfirm?: () => void;
}

export const DetailsDialog: React.FC<DetailsDialogProps> = ({
  open,
  onOpenChange,
  heading,
  blurb,
  confirmLabel,
  values,
  onChange,
  onConfirm,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{heading}</DialogTitle>
        <DialogDescription>{blurb}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="automation-name">Name</Label>
          <Input
            id="automation-name"
            value={values.name}
            autoFocus
            onChange={(e) => onChange({ ...values, name: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="automation-description">Description</Label>
          <Textarea
            id="automation-description"
            placeholder="What this automation is for"
            rows={3}
            value={values.description}
            onChange={(e) => onChange({ ...values, description: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        {confirmLabel && onConfirm ? (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {/* An automation with no name is unfindable in a list, so this holds
                        rather than writing an empty one. Nothing else here can be invalid —
                        a blank description is a legitimate answer. */}
            <Button disabled={!values.name.trim()} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </>
        ) : (
          // One secondary button, not a primary — a primary at the end of a form
          // says "finish the task", and there is no task to finish: the edits are
          // already on the draft. Something visible has to close the dialog,
          // though; Shade's DialogContent draws no corner X, and Esc-or-overlay
          // are affordances you can't see.
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
