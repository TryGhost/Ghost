import {Activity} from '@src/api/activitypub';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {create} from 'zustand';

type NoteId = string; // equals Activity.object.id
type ActivityId = string; // equals Activity.id (used for navigation/keys)

type ActivityMeta = {
    id: ActivityId;
    type: Activity['type'];
    actor: ActorProperties;
};

type ListItem = {
    noteId: NoteId;
    meta: ActivityMeta;
};

type NotesState = {
    byId: Record<NoteId, ObjectProperties & {id: string; likeCount?: number; liked?: boolean}>;
    lists: Record<string, ListItem[]>;
    replaceList: (key: string, activities: Activity[]) => void;
    appendToList: (key: string, activities: Activity[]) => void;
    toggleLike: (noteId: string, liked: boolean) => () => void;
};

export const useNotesStore = create<NotesState>()((set, get) => ({
    byId: {},
    lists: {},
    replaceList: (key, activities) => {
        const {byId} = get();
        const listItems: ListItem[] = activities.map((activity) => {
            const object = activity.object as NotesState['byId'][string];
            byId[object.id] = {
                ...(byId[object.id] || {}),
                ...object
            };
            return {
                noteId: object.id,
                meta: {
                    id: activity.id as ActivityId,
                    type: activity.type,
                    actor: activity.actor as ActorProperties
                }
            };
        });
        set(state => ({
            byId: {...byId},
            lists: {
                ...state.lists,
                [key]: listItems
            }
        }));
    },
    appendToList: (key, activities) => {
        const {byId, lists} = get();
        const listItems: ListItem[] = activities.map((activity) => {
            const object = activity.object as NotesState['byId'][string];
            byId[object.id] = {
                ...(byId[object.id] || {}),
                ...object
            };
            return {
                noteId: object.id,
                meta: {
                    id: activity.id as ActivityId,
                    type: activity.type,
                    actor: activity.actor as ActorProperties
                }
            };
        });
        set({
            byId: {...byId},
            lists: {
                ...lists,
                [key]: [...(lists[key] || []), ...listItems]
            }
        });
    },
    toggleLike: (noteId, liked) => {
        const {byId} = get();
        const note = byId[noteId];
        if (!note) {
            return () => {};
        }
        const prev = {liked: !!note.liked, likeCount: note.likeCount ?? 0};
        const nextCount = Math.max(0, (note.likeCount ?? 0) + (liked ? 1 : -1));
        set({
            byId: {
                ...byId,
                [noteId]: {
                    ...note,
                    liked,
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
                        liked: prev.liked,
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
    const items = lists[listKey] || [];
    return items
        .map(({noteId, meta}) => {
            const object = byId[noteId];
            if (!object) {
                return null;
            }
            return {
                id: meta.id,
                type: meta.type,
                actor: meta.actor,
                object
            } as Activity;
        })
        .filter(Boolean) as Activity[];
}

export function notesStoreUpsert(listKey: string, activities: Activity[], opts?: {append?: boolean}) {
    const {replaceList, appendToList} = useNotesStore.getState();
    if (opts?.append) {
        appendToList(listKey, activities);
    } else {
        replaceList(listKey, activities);
    }
}

export function notesStoreAppendUnique(listKey: string, activities: Activity[]) {
    const {lists, appendToList} = useNotesStore.getState();
    const existing = new Set((lists[listKey] || []).map(i => i.noteId));
    const unique = activities.filter((a) => {
        const id = (a.object as {id: string}).id;
        return !existing.has(id);
    });
    if (unique.length) {
        appendToList(listKey, unique);
    }
}

// keep the store minimal/pure; action hooks live outside
