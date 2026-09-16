import React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  LoadingIndicator,
} from '@tryghost/shade/components';
import { useDeleteTag } from '@tryghost/admin-x-framework/api/tags';
import { useHandleError, useNavigate } from '@tryghost/admin-x-framework';
import { formatNumber } from '@tryghost/shade/utils';
import type { Tag } from '@tryghost/admin-x-framework/api/tags';

interface TagDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag: Tag;
  displayName: string;
  onPendingChange: (pending: boolean) => void;
  /**
   * Invoked right before we `navigate('/tags')` so the parent's
   * unsaved-changes blocker doesn't intercept the redirect for a tag that
   * has just been deleted.
   */
  allowLeaveWithUnsavedChanges: () => void;
}

/**
 * Confirms permanent tag deletion, porting Ember's `delete-tag-modal`: the
 * body names the tag, reports how many posts it will be removed from, and a
 * successful delete returns to the tags list.
 */
const TagDeleteModal: React.FC<TagDeleteModalProps> = ({
  open,
  onOpenChange,
  tag,
  displayName,
  onPendingChange,
  allowLeaveWithUnsavedChanges,
}) => {
  const navigate = useNavigate();
  const handleError = useHandleError();
  const deleteTag = useDeleteTag();
  const postsCount = tag.count?.posts ?? 0;
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const onConfirm = async () => {
    onPendingChange(true);
    try {
      await deleteTag.mutateAsync(tag.id);
      if (!mountedRef.current) {
        return;
      }
      onOpenChange(false);
      allowLeaveWithUnsavedChanges();
      navigate('/tags');
    } catch (error) {
      if (mountedRef.current) {
        handleError(error);
      }
    } finally {
      if (mountedRef.current) {
        onPendingChange(false);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (deleteTag.isPending) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent data-testid="delete-tag-modal">
        <DialogHeader>
          <DialogTitle>Are you sure you want to delete this tag?</DialogTitle>
          <DialogDescription>
            You’re about to delete the tag &quot;<strong>{displayName}</strong>&quot;.{' '}
            {postsCount > 0 && (
              <>
                It will be removed from{' '}
                <span data-testid="delete-tag-posts-count">
                  {formatNumber(postsCount)} {postsCount === 1 ? 'post' : 'posts'}
                </span>
                .{' '}
              </>
            )}
            This is permanent! We warned you, k?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            data-testid="cancel-delete-tag"
            disabled={deleteTag.isPending}
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            data-testid="confirm-delete-tag"
            disabled={deleteTag.isPending}
            variant="destructive"
            autoFocus
            onClick={() => void onConfirm()}
          >
            {deleteTag.isPending ? (
              <>
                <LoadingIndicator size="sm" />
                <span className="sr-only">Deleting</span>
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TagDeleteModal;
