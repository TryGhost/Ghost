import React from 'react';

export function useClickOutside(
    enabled: boolean,
    refs: React.RefObject<HTMLElement | null> | React.RefObject<HTMLElement | null>[],
    handler: () => void
): void {
    React.useEffect(() => {
        if (!enabled) {
            return;
        }

        // accept a single ref or a list of them, e.g. when a popover renders in a
        // portal its trigger button lives outside of the popover element
        const refList = Array.isArray(refs) ? refs : [refs];

        const handleClickOutside = (event: MouseEvent) => {
            // do nothing until something is actually mounted, otherwise the very
            // first event would read as a click outside of everything
            if (!refList.some(ref => ref.current)) {
                return;
            }

            if (!refList.some(ref => ref.current?.contains(event.target as Node))) {
                handler();
            }
        };

        window.addEventListener('mousedown', handleClickOutside, {capture: true});
        return () => window.removeEventListener('mousedown', handleClickOutside, {capture: true});
    }, [enabled, handler, refs]);
}
