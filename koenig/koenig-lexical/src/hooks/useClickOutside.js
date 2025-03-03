import React from 'react';

export function useClickOutside(enabled, ref, handler) {
    React.useEffect(() => {
        if (!enabled) {
            return;
        }

        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                handler();
            }
        };

        window.addEventListener('mousedown', handleClickOutside, {capture: true});
        return () => window.removeEventListener('mousedown', handleClickOutside, {capture: true});
    }, [enabled, handler, ref]);
}
