import {useEffect, useRef, useState} from 'react';
import {useSearch} from '../components/providers/SettingsAppProvider';

/**
 * Simple hook to auto-expand a component when it's the only search result.
 * Respects manual user control over the expanded state.
 */
export function useAutoExpandable(keywords: string[]) {
    const [isOpen, setIsOpen] = useState(false);
    const wasManuallyControlled = useRef(false);
    const {filter, getVisibleComponents, checkVisible} = useSearch();

    useEffect(() => {
        if (!filter) {
            wasManuallyControlled.current = false;
        }
    }, [filter]);

    useEffect(() => {
        if (wasManuallyControlled.current) {
            return;
        }

        const isVisible = checkVisible(keywords);
        const visibleComponents = getVisibleComponents();
        const shouldAutoOpen = !!filter && isVisible && visibleComponents.size === 1;

        setIsOpen(shouldAutoOpen);
    }, [filter, keywords, checkVisible, getVisibleComponents]);

    const openManually = () => {
        wasManuallyControlled.current = true;
        setIsOpen(true);
    };

    const closeManually = () => {
        wasManuallyControlled.current = true;
        setIsOpen(false);
    };

    return {isOpen, openManually, closeManually};
}