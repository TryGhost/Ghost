import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useNavigate } from '@tryghost/admin-x-framework';
import { getErrorMessage, SessionExpiredError } from '@tryghost/admin-x-framework/errors';
import { pagesDataType, useDeletePage } from '@tryghost/admin-x-framework/api/pages';
import { postsDataType, useDeletePost } from '@tryghost/admin-x-framework/api/posts';
import { useQueryClient } from '@tanstack/react-query';
import {
  settingsDeleteButton,
  settingsDeleteDialog,
  settingsDeleteError,
} from '@tryghost/test-data/selectors/editor';
import type { PostType } from '@/editor/card-config';
import { DEFAULT_TITLE } from '@/editor/engine/save-engine';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { SettingsSection } from './settings-section';

export interface DeleteSectionProps {
  session: EditorSessionHandle;
  postType: PostType;
}

/**
 * Deletes the post the editor is open on. There is nothing to delete until the
 * first save has given the post an ID, so the button appears only then.
 */
export function DeleteSection({ session, postType }: DeleteSectionProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutateAsync: deletePost } = useDeletePost();
  const { mutateAsync: deletePage } = useDeletePage();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const postId = session.loadedRecord?.id ?? session.createdId;
  const noun = postType === 'page' ? 'page' : 'post';

  if (!postId) {
    return null;
  }

  const title = session.bind.title.trim() || session.loadedRecord?.title || DEFAULT_TITLE;

  const changeOpen = (open: boolean) => {
    if (isDeleting) {
      return;
    }
    setIsOpen(open);
    setError(null);
  };

  const confirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await (postType === 'page'
        ? deletePage({ id: postId, sessionExpiryRedirect: false })
        : deletePost({ id: postId, sessionExpiryRedirect: false }));
    } catch (deleteError) {
      setError(
        deleteError instanceof SessionExpiredError
          ? 'Your session expired. Sign in again in a new tab, then try deleting again.'
          : getErrorMessage(deleteError, `Couldn’t delete this ${noun}.`),
      );
      setIsDeleting(false);
      return;
    }

    // Nothing may be written to a post that is gone. Ending the session aborts
    // the save in flight and drops every later one, including the leave guard's.
    session.dispose();

    // The list would otherwise serve its cached page, deleted row and all.
    // `refetchType: 'none'`: the editor's own read of this post is still mounted.
    void queryClient.invalidateQueries({
      queryKey: [postType === 'page' ? pagesDataType : postsDataType],
      refetchType: 'none',
    });

    navigate(postType === 'page' ? '/pages' : '/posts', { replace: true });
  };

  return (
    <SettingsSection>
      <AlertDialog open={isOpen} onOpenChange={changeOpen}>
        <AlertDialogTrigger asChild>
          <Button
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            data-testid={settingsDeleteButton}
            variant="outline"
          >
            <LucideIcon.Trash />
            Delete {noun}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent data-testid={settingsDeleteDialog}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this {noun}?</AlertDialogTitle>
            <AlertDialogDescription>
              You’re about to delete &quot;<strong>{title}</strong>&quot;. This is permanent! We
              warned you, k?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <Text
              className="text-destructive"
              data-testid={settingsDeleteError}
              role="alert"
              size="sm"
            >
              {error}
            </Text>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button disabled={isDeleting} variant="destructive" onClick={() => void confirm()}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
