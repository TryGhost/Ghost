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
import { buildEpisodePostPayload } from './episode-post';
import { toast } from 'sonner';
import { useAddPost } from '@tryghost/admin-x-framework/api/posts';
import { useIsEmberOwnedRoute } from '@/routes';
import { useNavigate } from '@tryghost/admin-x-framework';
import type { Episode, Podcast } from './podcasts-store';

interface CreatePostDialogProps {
  open: boolean;
  podcast: Podcast;
  episode: Episode;
  /** Called when the writer declines, or after the post has been created and opened. */
  onDismiss: () => void;
}

/**
 * Offered right after an episode is created: starts a draft post with the
 * episode's podcast card already embedded and opens it in the editor.
 */
export function CreatePostDialog({ open, podcast, episode, onDismiss }: CreatePostDialogProps) {
  const navigate = useNavigate();
  const { mutateAsync: addPost, isPending } = useAddPost();
  // The editor may still be served by Ember, which only follows hash changes.
  const editorIsEmberOwned = useIsEmberOwnedRoute('/editor/post');

  const onCreatePost = async () => {
    try {
      const { posts } = await addPost({ post: buildEpisodePostPayload(podcast, episode) });
      const editorPath = `/editor/post/${posts[0].id}`;
      onDismiss();
      if (editorIsEmberOwned) {
        window.location.hash = `#${editorPath}`;
      } else {
        void navigate(editorPath);
      }
    } catch {
      toast.error('Couldn’t create the post.');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isPending) {
          onDismiss();
        }
      }}
    >
      <DialogContent data-testid="create-post-dialog">
        <DialogHeader>
          <DialogTitle>Write a post about this episode?</DialogTitle>
          <DialogDescription>
            &quot;<strong>{episode.title}</strong>&quot; is ready. Start a post with the episode
            already embedded, or come back to it later from the editor&apos;s podcast card.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            data-testid="create-post-dismiss"
            disabled={isPending}
            variant="outline"
            onClick={onDismiss}
          >
            Not now
          </Button>
          <Button
            data-testid="create-post-confirm"
            disabled={isPending}
            autoFocus
            onClick={() => void onCreatePost()}
          >
            {isPending ? (
              <>
                <LoadingIndicator size="sm" />
                <span className="sr-only">Creating post</span>
              </>
            ) : (
              'Create post'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePostDialog;
