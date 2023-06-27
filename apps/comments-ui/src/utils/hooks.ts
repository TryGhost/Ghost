import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {formatRelativeTime} from './helpers';
import {useAppContext} from '../AppContext';

/**
 * Execute a callback when a ref is set and unset.
 * Warning: make sure setup and clear are both functions that do not change on every rerender. So use useCallback if required on them.
 */
export function useRefCallback<T>(setup: (element: T) => void, clear?: (element: T) => void) {
    const ref = useRef<T | null>(null);
    const setRef = useCallback((node) => {
        if (ref.current && clear) {
            // Make sure to cleanup any events/references added to the last instance
            clear(ref.current);
        }

        if (node && setup) {
            // Check if a node is actually passed. Otherwise node would be null.
            // You can now do what you need to, addEventListeners, measure, etc.
            setup(node);
        }

        // Save a reference to the node
        ref.current = node;
    }, [setup, clear]);
    return [ref, setRef];
}

/**
 * Sames as useEffect, but ignores the first mounted call and the first update (so first 2 calls ignored)
 * @param {Same} fn
 * @param {*} inputs
*/
export function useSecondUpdate(fn: () => void, inputs: React.DependencyList) {
    const didMountRef = useRef(0);

    useEffect(() => {
        if (didMountRef.current >= 2) {
            return fn();
        }
        didMountRef.current += 1;
    // We shouldn't listen for fn changes, so ignore exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, inputs);
}

export function usePopupOpen(type: string) {
    const {popup} = useAppContext();
    return popup?.type === type;
}

/**
 * Avoids a rerender of the relative time unless the date changed, and not the current timestamp changed
 */
export function useRelativeTime(dateString: string) {
    return useMemo(() => {
        return formatRelativeTime(dateString);
    }, [dateString]);
}
