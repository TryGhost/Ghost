import {getScrollParent} from './get-scroll-parent';
import {useEffect, useRef, useState} from 'react';
import {useLocation} from '@tryghost/admin-x-framework';

// Store scroll positions globally across component instances
const scrollPositions = new Map<string, number>();

interface UseScrollRestorationOptions {
    /** Reference to the element whose scroll parent should be tracked */
    parentRef: React.RefObject<HTMLElement>;
    /** Whether scroll restoration is enabled (default: true) */
    enabled?: boolean;
    /** Whether data is currently loading. Restoration will be deferred until loading is false */
    isLoading?: boolean;
}

/**
 * Hook to automatically save and restore scroll position when navigating.
 * Works with the infinite virtual scroll by using the same parentRef to find the scrollable container.
 * Includes retry logic to handle virtual scrolling measurement delays.
 * 
 * Usage:
 * ```tsx
 * const parentRef = useRef<HTMLDivElement>(null);
 * useScrollRestoration({ parentRef, isLoading });
 * useInfiniteVirtualScroll({ parentRef, ... });
 * ```
 */
export function useScrollRestoration({parentRef, enabled = true, isLoading = false}: UseScrollRestorationOptions) {
    const location = useLocation();
    const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);
    const previousPathRef = useRef<string | null>(null);

    // Find the scroll container once the parent element is mounted
    useEffect(() => {
        if (!enabled || !parentRef.current) {
            return;
        }

        const container = getScrollParent(parentRef.current);
        setScrollContainer(container);
    }, [enabled, parentRef]);

    // Save scroll position when user scrolls
    useEffect(() => {
        if (!enabled || !scrollContainer) {
            return;
        }

        const key = location.pathname + location.search;
        const handleScroll = () => {
            const position = scrollContainer.scrollTop;
            scrollPositions.set(key, position);
        };
        scrollContainer.addEventListener('scroll', handleScroll);
        return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }, [enabled, location.pathname, location.search, scrollContainer]);

    // Restore scroll position when location changes and data has loaded
    useEffect(() => {
        const key = location.pathname + location.search;
        const savedPosition = scrollPositions.get(key);

        if (!enabled || !scrollContainer || isLoading) {
            return;
        }

        // Only restore if we're navigating to a different location and have a saved position
        if (savedPosition !== undefined && previousPathRef.current !== key) {
            // Delay to ensure content is rendered and scroll height is correct
            // For virtual scrolling, we may need multiple attempts as the virtualizer measures items
            let attempts = 0;
            const maxAttempts = 3;
            
            const attemptRestore = () => {
                attempts += 1;
                
                if (!scrollContainer) {
                    return;
                }

                const currentScroll = scrollContainer.scrollTop;
                const scrollHeight = scrollContainer.scrollHeight;
                const clientHeight = scrollContainer.clientHeight;
                const maxScroll = scrollHeight - clientHeight;

                // Check if we can actually scroll to the saved position
                if (savedPosition > maxScroll && attempts < maxAttempts) {
                    // Content hasn't fully rendered yet, try again
                    setTimeout(attemptRestore, 100);
                    return;
                }

                // Restore the position
                if (Math.abs(savedPosition - currentScroll) > 5) {
                    const targetPosition = Math.min(savedPosition, maxScroll);
                    scrollContainer.scrollTop = targetPosition;
                }
            };

            const timeoutId = setTimeout(attemptRestore, 150);
            return () => clearTimeout(timeoutId);
        }

        previousPathRef.current = key;
    }, [enabled, location.pathname, location.search, scrollContainer, isLoading]);
}

