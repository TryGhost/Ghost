import {Activity, type Post} from '@src/api/activitypub';
import {create} from 'zustand';
import {mapPostToActivity} from '@src/utils/posts';

type NoteId = string; // equals Activity.object.id

type NotesState = {
    byId: Record<NoteId, Post>;
    lists: Record<string, NoteId[]>;
    replaceList: (key: string, posts: Post[]) => void;
    appendToList: (key: string, posts: Post[]) => void;
    toggleLike: (noteId: string, liked: boolean) => () => void;
};

export const useNotesStore = create<NotesState>()((set, get) => ({
    byId: {},
    lists: {},
    replaceList: (key, posts) => {
        const {byId} = get();
        const ids: NoteId[] = posts.map((post) => {
            byId[post.id] = {
                ...(byId[post.id] || {}),
                ...post
            };
            return post.id as NoteId;
        });
        set(state => ({
            byId: {...byId},
            lists: {
                ...state.lists,
                [key]: ids
            }
        }));
    },
    appendToList: (key, posts) => {
        const {byId, lists} = get();
        const ids: NoteId[] = posts.map((post) => {
            byId[post.id] = {
                ...(byId[post.id] || {}),
                ...post
            };
            return post.id as NoteId;
        });
        set({
            byId: {...byId},
            lists: {
                ...lists,
                [key]: [...(lists[key] || []), ...ids]
            }
        });
    },
    toggleLike: (noteId, liked) => {
        const {byId} = get();
        const post = byId[noteId];
        if (!post) {
            return () => {};
        }
        const prev = {liked: !!post.likedByMe, likeCount: post.likeCount ?? 0};
        const nextCount = Math.max(0, (post.likeCount ?? 0) + (liked ? 1 : -1));
        set({
            byId: {
                ...byId,
                [noteId]: {
                    ...post,
                    likedByMe: liked,
                    likeCount: nextCount
                }
            }
        });
        return () => {
            const current = get().byId[noteId];
            set(state => ({
                byId: {
                    ...state.byId,
                    [noteId]: {
                        ...current,
                        likedByMe: prev.liked,
                        likeCount: prev.likeCount
                    }
                }
            }));
        };
    }
}));

export function useActivitiesForList(listKey: string): Activity[] {
    const lists = useNotesStore(s => s.lists);
    const byId = useNotesStore(s => s.byId);
    const ids = lists[listKey] || [];
    return ids.map(id => byId[id]).filter(Boolean).map(post => mapPostToActivity(post as Post));
}

export function notesStoreUpsert(listKey: string, posts: Post[], opts?: {append?: boolean}) {
    const {replaceList, appendToList} = useNotesStore.getState();
    if (opts?.append) {
        appendToList(listKey, posts);
    } else {
        replaceList(listKey, posts);
    }
}

export function notesStoreAppendUnique(listKey: string, posts: Post[]) {
    const {lists, appendToList} = useNotesStore.getState();
    const existing = new Set((lists[listKey] || []));
    const unique = posts.filter(p => !existing.has(p.id));
    if (unique.length) {
        appendToList(listKey, unique);
    }
}

// keep the store minimal/pure; action hooks live outside
