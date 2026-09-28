import React, { useEffect, useState } from 'react';
import { Input, Label, Textarea } from '@tryghost/shade/components';

/**
 * Name + description as a POPOVER under the title — the detail screen's
 * replacement for the details dialog.
 *
 * The dialog went through three footers here (Save, then Done, then a lone
 * Close) and every one of them framed the edit as a submission the screen
 * doesn't have: edits write through to the draft, and the header's global Save
 * is the only commit. A popover has no form-frame at all — you click the
 * title, type, and click away to move on, exactly how the canvas's own fields
 * edit (the tiers popover is this same shape). The title retitling LIVE
 * directly above the popover is the feedback loop the dialog never had.
 *
 * The LIST keeps the dialog (see details-dialog): a rename there has no draft
 * to ride, so a form that commits on Save is the honest shape for it.
 *
 * No blurb line ("shown on your automations list…") — the dialog had room for
 * reassurance prose; a popover under the title is already visibly about the
 * thing it's attached to.
 */
interface DetailsPopoverContentProps {
  values: { name: string; description: string };
  onChange: (next: { name: string; description: string }) => void;
  // Whether the CURRENT field text collides with another automation's name,
  // computed live by the screen (see isNameTaken). The collision guard itself
  // is the screen's — a colliding name never reaches the draft — so this only
  // drives what the field says about it.
  nameTaken: boolean;
}

// How long a collision has to hold still before the field says so. Extending
// an existing name passes THROUGH a collision — typing "Welcome series 2" is
// momentarily "Welcome series" — and an error that fires on that keystroke
// scolds people mid-thought. The guard upstream is keystroke-level either way;
// only the message waits.
const ERROR_DEBOUNCE_MS = 450;

export const DetailsPopoverContent: React.FC<DetailsPopoverContentProps> = ({
  values,
  onChange,
  nameTaken,
}) => {
  const [showError, setShowError] = useState(false);
  useEffect(() => {
    if (!nameTaken) {
      setShowError(false);
      return;
    }
    const timer = setTimeout(() => setShowError(true), ERROR_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // values.name is a dependency so the timer restarts on every keystroke —
    // the message appears only once a colliding value has been LEFT there.
  }, [nameTaken, values.name]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="automation-name">Name</Label>
        <Input
          aria-invalid={showError || undefined}
          id="automation-name"
          value={values.name}
          autoFocus
          onChange={(e) => onChange({ ...values, name: e.target.value })}
        />
        {/* Present only while true — the row appears and the popover grows,
                    which is itself part of the signal. aria-live so the arrival is
                    announced without moving focus off the field being corrected. */}
        {showError && (
          <p aria-live="polite" className="text-xs text-destructive">
            An automation with this name already exists.
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
  );
};
