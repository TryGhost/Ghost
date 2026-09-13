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
 * Values are held by the caller, so nothing is committed by typing and Cancel is
 * a real cancel rather than an undo of writes that already landed.
 */
interface DetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heading: string;
  blurb: string;
  confirmLabel: string;
  values: { name: string; description: string };
  onChange: (next: { name: string; description: string }) => void;
  onConfirm: () => void;
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
          {/* Says where the words end up. Without it the field is a box asking
                    for text with no stated audience, and people either skip it or
                    write for nobody. */}
          <p className="text-sm text-muted-foreground">
            Shown under the name on your automations list.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        {/* An automation with no name is unfindable in a list, so this holds
                    rather than writing an empty one. Nothing else here can be invalid —
                    a blank description is a legitimate answer. */}
        <Button disabled={!values.name.trim()} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
