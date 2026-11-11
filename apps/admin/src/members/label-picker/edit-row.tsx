import React, { useEffect, useRef, useState } from 'react';
import { Stack } from '@tryghost/shade/primitives';
import { Button, Input } from '@tryghost/shade/components';
import { type Label } from '@tryghost/admin-x-framework/api/labels';
import { getErrorMessage } from '@tryghost/admin-x-framework/errors';
// PROTOTYPE ONLY (NY-1750): the label automations' fake backend. Don't merge.
import { LeadMagnetDeleteBlockedDialog, useLeadMagnetDeleteBlocker } from '@/automations/api';

interface EditRowProps {
  // `slug` is for the prototype's delete check (NY-1750).
  label: Pick<Label, 'id' | 'name'> & { slug?: string };
  onSave: (id: string, name: string) => Promise<void>;
  onCancel: () => void;
  onDelete: (id: string) => Promise<void>;
  // PROTOTYPE ONLY (NY-1750): runs on the first Delete click; returning true skips the inline
  // confirm, e.g. for a label an active automation uses. Don't merge.
  onDeleteClick?: (id: string) => boolean;
}

export const EditRow: React.FC<EditRowProps> = ({
  label,
  onSave,
  onCancel,
  onDelete,
  onDeleteClick,
}) => {
  const [name, setName] = useState(label.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isBusy = isSaving || isDeleting;
  // PROTOTYPE ONLY (NY-1750): an active automation's label can't be deleted. Don't merge.
  const blockingAutomation = useLeadMagnetDeleteBlocker(label.slug);
  const [isBlockedOpen, setBlockedOpen] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(label.id, name.trim());
      onCancel();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Failed to save label, please try again.'));
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (!isBusy) {
        onCancel();
      }
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(label.id);
    } catch {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Stack className="pt-1 pb-2" gap="sm" data-edit-row>
      <Input
        ref={inputRef}
        className="h-7 rounded-control-sm! px-2 text-sm"
        disabled={isBusy}
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError('');
        }}
        onKeyDown={handleKeyDown}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
      {showDeleteConfirm ? (
        <div className="flex items-center gap-1 text-sm">
          <span className="flex-1 font-semibold">Delete label?</span>
          <Button
            className="h-6 px-2 text-xs"
            disabled={isBusy}
            size="sm"
            variant="outline"
            onClick={() => setShowDeleteConfirm(false)}
          >
            Cancel
          </Button>
          <Button
            className="h-6 px-2 text-xs"
            disabled={isBusy}
            size="sm"
            variant="destructive"
            onClick={() => void handleDelete()}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      ) : (
        <div className="flex items-center">
          <Button
            className="h-6 gap-1 px-1.5 text-xs text-red hover:bg-red/5 hover:text-red"
            disabled={isBusy}
            size="sm"
            variant="ghost"
            onClick={() => {
              if (onDeleteClick?.(label.id)) {
                return;
              }
              if (blockingAutomation) {
                setBlockedOpen(true);
                return;
              }
              setShowDeleteConfirm(true);
            }}
          >
            Delete
          </Button>
          <div className="ml-auto flex gap-1">
            <Button
              className="h-6 px-2 text-xs"
              disabled={isBusy}
              size="sm"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              className="h-6 px-2 text-xs"
              disabled={isBusy}
              size="sm"
              onClick={() => void handleSave()}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}
      {/* PROTOTYPE ONLY (NY-1750) */}
      {blockingAutomation && (
        <LeadMagnetDeleteBlockedDialog
          automation={blockingAutomation}
          labelName={label.name}
          open={isBlockedOpen}
          onOpenChange={setBlockedOpen}
        />
      )}
    </Stack>
  );
};
