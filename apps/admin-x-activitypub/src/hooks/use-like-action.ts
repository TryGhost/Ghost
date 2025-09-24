import {ActivityPubAPI} from '@src/api/activitypub';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useNotesStore} from '@src/stores/notesStore';

async function getSiteUrl() {
    const response = await fetch('/ghost/api/admin/site');
    const json = await response.json();
    return json.site.url as string;
}

export function useLikeAction(handle: string) {
    const queryClient = useQueryClient();
    const toggleLikeStore = useNotesStore(s => s.toggleLike);

    const likeMutation = useMutation({
        mutationFn: async (id: string) => {
            const siteUrl = await getSiteUrl();
            const api = new ActivityPubAPI(new URL(siteUrl), new URL('/ghost/api/admin/identities/', window.location.origin), handle);
            return api.like(id);
        }
    });

    const unlikeMutation = useMutation({
        mutationFn: async (id: string) => {
            const siteUrl = await getSiteUrl();
            const api = new ActivityPubAPI(new URL(siteUrl), new URL('/ghost/api/admin/identities/', window.location.origin), handle);
            return api.unlike(id);
        }
    });

    const toggleLike = (noteId: string, nextLiked: boolean) => {
        const rollback = toggleLikeStore(noteId, nextLiked);
        const mut = nextLiked ? likeMutation : unlikeMutation;
        mut.mutate(noteId, {
            onError: () => {
                rollback();
            },
            onSuccess: () => {
                // Refresh likes list; allow backend to drive count via account refetch
                queryClient.invalidateQueries({queryKey: ['account_liked_posts']});
                queryClient.invalidateQueries({queryKey: ['account', 'index']});
            }
        });
    };

    return {toggleLike};
}
