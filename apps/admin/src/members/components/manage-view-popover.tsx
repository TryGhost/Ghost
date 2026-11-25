import React, { useState } from 'react';
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '@tryghost/shade/components';
import { FilterBar } from '@tryghost/shade/patterns';
import {
  type Segment,
  useAddSegment,
  useDeleteSegment,
  useEditSegment,
  useInvalidateSegments,
} from '@tryghost/admin-x-framework/api/segments';
import { JSONError } from '@tryghost/admin-x-framework/errors';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { z } from 'zod';
import {
  MEMBER_VIEW_NAME_MAX_LENGTH,
  useCanChangeMemberViews,
} from '@/members/hooks/use-member-views';

interface ManageViewPopoverProps {
  filter: string;
  existingViews: Segment[];
  activeView?: Segment | null;
  onDeleted?: () => void;
}

type Write = 'add' | 'rename' | 'delete';

const WRITE_FAILED_ERRORS: Record<Write, string> = {
  add: 'Failed to save view',
  rename: 'Failed to save view',
  delete: 'Failed to delete view',
};
const NO_PERMISSION_ERRORS: Record<Write, string> = {
  add: 'You do not have permission to save views',
  rename: 'You do not have permission to save views',
  delete: 'You do not have permission to delete views',
};

/**
 * The error body of a write that a validation rule rejected, such as a duplicate name: a
 * validation error that names the field in `property`, with `context` written for a publisher.
 * The API framework answers a request it can't parse with a validation error too, but that one
 * has the parsing problems in `details`. A validation error that names no field is a condition
 * of the server, such as a stored value it can't read, not something to rename around.
 */
const RuleRejection = z.object({
  type: z.literal('ValidationError'),
  context: z.string().min(1),
  property: z.string().min(1),
  details: z.null().optional(),
});

/**
 * The message a failed write shows, and whether the failure should be reported. A 404 for a
 * rename or a delete is a view that no longer exists. A 403 says the staff user may not change
 * views, in terms of views, since the server's text names segments. A rejection by a validation
 * rule shows the server's text. Those are the publisher's to act on, so they aren't reported.
 * Anything else reads as a failed write and is reported.
 */
function viewWriteFailure(error: unknown, write: Write): { message: string; report: boolean } {
  const status = error instanceof JSONError ? error.response?.status : undefined;

  if (status === 404 && write !== 'add') {
    return { message: 'This view no longer exists', report: false };
  }

  if (status === 403) {
    return { message: NO_PERMISSION_ERRORS[write], report: false };
  }

  if (status === 422 && error instanceof JSONError) {
    const rejection = RuleRejection.safeParse(error.data?.errors?.[0]);
    if (rejection.success) {
      return { message: rejection.data.context, report: false };
    }
  }

  return { message: WRITE_FAILED_ERRORS[write], report: true };
}

interface ManageViewPopoverContentProps extends ManageViewPopoverProps {
  onClose: () => void;
}

const ManageViewPopoverContent: React.FC<ManageViewPopoverContentProps> = ({
  filter,
  existingViews,
  activeView,
  onDeleted,
  onClose,
}) => {
  // The view being edited is the one that was active when the popover opened. The views can be
  // refreshed while the popover is open, as when the list arrives late, and a popover opened to
  // save a new view must not turn into a rename of one that has since become active.
  const [editedView] = useState(activeView ?? null);
  const [name, setName] = useState(editedView?.name ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { mutateAsync: addSegment } = useAddSegment();
  const { mutateAsync: editSegment } = useEditSegment();
  const { mutateAsync: deleteSegment } = useDeleteSegment();
  const invalidateSegments = useInvalidateSegments();
  const handleError = useHandleError();

  const isEditing = editedView !== null;

  /**
   * Shows why a write failed. A successful write refreshes the views itself. A failed one
   * refreshes them here, since the views shown may be why it failed, as with a view deleted in
   * another tab.
   */
  const showFailure = (err: unknown, write: Write) => {
    const failure = viewWriteFailure(err, write);
    if (failure.report) {
      handleError(err, { withToast: false, displayedMessage: failure.message });
    }
    setError(failure.message);
    invalidateSegments();
  };

  const handleSave = async () => {
    // Enter can be pressed again before the first save finishes.
    if (saving) {
      return;
    }

    const trimmed = name.trim();

    if (!trimmed) {
      setError('Please enter a name');
      return;
    }

    if (!isEditing) {
      const duplicate = existingViews.find(
        (view) => view.name.trim().toLowerCase() === trimmed.toLowerCase(),
      );

      if (duplicate) {
        setError('A view with this name already exists');
        return;
      }
    }

    setSaving(true);

    try {
      if (editedView) {
        await editSegment({ id: editedView.id, name: trimmed });
      } else {
        await addSegment({ name: trimmed, filter });
      }
      onClose();
    } catch (err) {
      showFailure(err, editedView ? 'rename' : 'add');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editedView) {
      return;
    }

    setDeleting(true);

    try {
      await deleteSegment(editedView.id);
      onClose();
      onDeleted?.();
    } catch (err) {
      showFailure(err, 'delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleSave();
    }
  };

  return (
    <PopoverContent align="end" className="w-72">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">{isEditing ? 'Edit view' : 'Save view'}</h3>
        <div className="flex flex-col gap-1.5">
          <Input
            maxLength={MEMBER_VIEW_NAME_MAX_LENGTH}
            placeholder="View name"
            value={name}
            autoFocus
            onChange={(event) => {
              setName(event.target.value);

              if (error) {
                setError('');
              }
            }}
            onKeyDown={handleKeyDown}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        {isEditing ? (
          confirmingDelete ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Delete view?</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={deleting}
                  size="sm"
                  variant="destructive"
                  onClick={() => void handleDelete()}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Button
                className="text-red hover:bg-red/5 hover:text-red"
                size="sm"
                variant="ghost"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete
              </Button>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  disabled={saving || !name.trim()}
                  size="sm"
                  onClick={() => void handleSave()}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )
        ) : (
          <Button
            className="w-full"
            disabled={saving || !name.trim()}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>
    </PopoverContent>
  );
};

const ManageViewPopover: React.FC<ManageViewPopoverProps> = ({
  filter,
  existingViews,
  activeView,
  onDeleted,
}) => {
  const [open, setOpen] = useState(false);
  const canChangeViews = useCanChangeMemberViews();

  if (!canChangeViews) {
    return null;
  }

  // The content is keyed on the filters, so it starts afresh when other filters are opened. It
  // keeps its state while the same filters are open, so the message for a refused save and the
  // name typed stay when the views are refreshed underneath it.
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterBar.Action variant="outline">
          {activeView ? 'Edit view' : 'Save view'}
        </FilterBar.Action>
      </PopoverTrigger>
      {open && (
        <ManageViewPopoverContent
          key={filter}
          activeView={activeView}
          existingViews={existingViews}
          filter={filter}
          onClose={() => setOpen(false)}
          onDeleted={onDeleted}
        />
      )}
    </Popover>
  );
};

export default ManageViewPopover;
