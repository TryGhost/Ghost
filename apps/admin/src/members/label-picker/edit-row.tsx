import React, { useEffect, useRef, useState } from 'react';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { Button, Input } from '@tryghost/shade/components';
import { LabelDeletionWarning } from './label-deletion-warning';
import { type Label } from '@tryghost/admin-x-framework/api/labels';
import { getErrorMessage } from '@tryghost/admin-x-framework/errors';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useLabelAutomations } from '@/automations/api';

interface EditRowProps {
  label: Pick<Label, 'id' | 'name'>;
  onSave: (id: string, name: string) => Promise<void>;
  onCancel: () => void;
  onDelete: (id: string) => Promise<void>;
  onDeletionWarningOpenChange?: (open: boolean) => void;
}

export const EditRow: React.FC<EditRowProps> = ({
  label,
  onSave,
  onCancel,
  onDelete,
  onDeletionWarningOpenChange,
}) => {
  const [name, setName] = useState(label.name);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isChecking, setChecking] = useState(false);
  const handleError = useHandleError();
  const lookup = useLabelAutomations({ labels: [label], enabled: deleteRequested });
  const automations = lookup.matches.flatMap((match) => match.automations);
  const blocked = deleteRequested && automations.length > 0;
  const isBusy = isSaving || isDeleting || isChecking || (deleteRequested && lookup.isLoading);

  // Keep the label picker open while its deletion warning is open.
  useEffect(() => {
    onDeletionWarningOpenChange?.(blocked);
    return () => onDeletionWarningOpenChange?.(false);
  }, [blocked, onDeletionWarningOpenChange]);

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
    if (isBusy || lookup.isError || automations.length > 0) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(label.id);
    } catch {
      setIsDeleting(false);
      setDeleteRequested(false);
    }
  };

  const requestDelete = async () => {
    if (isBusy) {
      return;
    }
    setChecking(true);
    setDeleteRequested(true);
    try {
      await lookup.check();
    } catch (checkError) {
      setDeleteRequested(false);
      handleError(checkError);
    } finally {
      setChecking(false);
    }
  };

  let deleteControls: React.ReactNode;
  if (deleteRequested && !blocked && !isChecking) {
    deleteControls = (
      <Inline className="text-sm" gap="xs">
        <span className="flex-1 font-semibold">Delete label?</span>
        <Button
          className="h-6 px-2 text-xs"
          disabled={isBusy}
          size="sm"
          variant="outline"
          onClick={() => setDeleteRequested(false)}
        >
          Cancel
        </Button>
        <Button
          className="h-6 px-2 text-xs"
          disabled={isBusy}
          loading={isDeleting || lookup.isLoading}
          size="sm"
          variant="destructive"
          onClick={() => void handleDelete()}
        >
          Delete
        </Button>
      </Inline>
    );
  } else {
    deleteControls = (
      <Inline justify="between">
        <Button
          className="h-6 gap-1 px-1.5 text-xs text-destructive hover:bg-destructive/5 hover:text-destructive"
          disabled={isBusy}
          loading={isChecking}
          size="sm"
          variant="ghost"
          onClick={() => void requestDelete()}
        >
          Delete
        </Button>
        <Inline gap="xs">
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
            loading={isSaving}
            size="sm"
            onClick={() => void handleSave()}
          >
            Save
          </Button>
        </Inline>
      </Inline>
    );
  }

  return (
    <Stack className="pt-1 pb-2" gap="sm" data-edit-row>
      <Input
        ref={inputRef}
        aria-label="Label name"
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
      {deleteControls}
      <LabelDeletionWarning
        automations={automations}
        label={label}
        open={blocked}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteRequested(false);
          }
        }}
      />
    </Stack>
  );
};
