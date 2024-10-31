import {useEffect, useState} from 'react';

export type Layout = 'feed' | 'inbox';

export function useLayout() {
    const [layout, setLayout] = useState(() => {
        return localStorage.getItem('AP:currentLayout') || 'inbox';
    });

    useEffect(() => {
        localStorage.setItem('AP:currentLayout', layout);
    }, [layout]);

    const setFeed = () => setLayout('feed');
    const setInbox = () => setLayout('inbox');

    return {layout, setInbox, setFeed} as {layout: Layout, setInbox: () => void, setFeed: () => void};
}
