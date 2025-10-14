import React, {useEffect, useMemo, useState} from 'react';
import {useNotesStore} from '@src/stores/notesStore';

const NotesStoreDebug: React.FC<{onlyInDev?: boolean}> = ({onlyInDev = true}) => {
    const [open, setOpen] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const byId = useNotesStore((s) => s.byId);
    const lists = useNotesStore((s) => s.lists);

    useEffect(() => {
        const isProd = process.env.NODE_ENV === 'production';
        const hasParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debugStore');
        const inLocal = typeof window !== 'undefined' && window.localStorage.getItem('notesStoreDebug') === '1';
        setEnabled(!onlyInDev || !isProd || hasParam || inLocal);

        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
                setEnabled((prev) => {
                    const next = !prev;
                    try {
                        if (typeof window !== 'undefined') {
                            window.localStorage.setItem('notesStoreDebug', next ? '1' : '0');
                        }
                    } catch {}
                    return next;
                });
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onlyInDev]);

    const info = useMemo(() => {
        const listEntries = Object.entries(lists).map(([key, items]) => ({key, count: items.length}));
        return {
            totalNotes: Object.keys(byId).length,
            listEntries
        };
    }, [byId, lists]);

    if (!enabled) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-[1000]">
            {!open && (
                <button
                    className="rounded bg-gray-800 px-3 py-1 text-white shadow hover:bg-gray-700 dark:bg-gray-200 dark:text-black dark:hover:bg-gray-100"
                    onClick={() => setOpen(true)}
                >
                    Store Debug
                </button>
            )}
            {open && (
                <div className="w-[280px] rounded-md border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-900 dark:bg-black">
                    <div className="mb-2 flex items-center justify-between">
                        <div className="font-semibold">Notes Store</div>
                        <button className="text-sm opacity-70 hover:opacity-100" onClick={() => setOpen(false)}>Close</button>
                    </div>
                    <div className="text-sm">
                        <div className="mb-2">Total notes: <span className="font-mono">{info.totalNotes}</span></div>
                        <div className="mb-2 max-h-40 overflow-auto">
                            {info.listEntries.length === 0 && <div className="opacity-60">No lists</div>}
                            {info.listEntries.map(({key, count}) => (
                                <div key={key} className="flex justify-between">
                                    <span className="truncate font-mono">{key}</span>
                                    <span className="font-mono">{count}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 flex gap-2">
                            <button
                                className="rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-950"
                                onClick={() => {
                                    // eslint-disable-next-line no-console
                                    console.log('[NotesStore] state', {byId, lists});
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const store = (window as any).__notesStore;
                                    if (store) {
                                        // eslint-disable-next-line no-console
                                        console.log('[NotesStore] via window.__notesStore.getState()', store.getState());
                                    }
                                }}
                            >
                                Log state
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotesStoreDebug;
