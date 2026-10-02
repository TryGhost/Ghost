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
 * Name + description, in a dialog — the LIST's editor. One component for both
 * the rename dialog and the duplicate dialog, so the two are the same object
 * rather than two that resemble each other — duplicating is naming a new
 * automation, and it should ask the way renaming asks.
 *
 * A form on purpose: values are held by the caller, nothing is committed by
 * typing, and Cancel is a real cancel — a rename from the list has no draft to
 * ride, so the confirm here is the only commit in sight and should look like
 * one. (The DETAIL screen used this dialog too, in a buttonless write-through
 * mode, and left for a popover under its own title — see details-popover.)
 */
interface DetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heading: string;
  // Says who these words are for. It used to be a hint under the description alone,
  // which left the name unaccounted for and put the reassurance below the field it
  // was reassuring about. One line at the top covers both.
  blurb: string;
  confirmLabel: string;
  values: { name: string; description: string };
  onChange: (next: { name: string; description: string }) => void;
  onConfirm: () => void;
  // Why the name can't be accepted as it stands (a collision, from the
  // caller's isNameTaken check). Shown under the field and blocks the confirm,
  // the same way the built-in blank-name rule does — the caller owns the rule,
  // the dialog owns saying it.
  nameError?: string;
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
  nameError,
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
            aria-invalid={nameError ? true : undefined}
            id="automation-name"
            value={values.name}
            autoFocus
            onChange={(e) => onChange({ ...values, name: e.target.value })}
          />
          {nameError && (
            <p aria-live="polite" className="text-xs text-destructive">
              {nameError}
            </p>
          )}
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
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        {/* An automation with no name is unfindable in a list, so this holds
                    rather than writing an empty one — and a name another automation
                    already carries holds the same way (nameError). A blank
                    description is a legitimate answer. */}
        <Button disabled={!values.name.trim() || Boolean(nameError)} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
