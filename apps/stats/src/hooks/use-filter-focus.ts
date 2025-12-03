import {useEffect, useRef} from 'react';

/**
 * Custom hook to automatically focus the filter button when the first filter is added.
 *
 * This is useful when you have a conditional filter UI that relocates when filters are applied.
 * For example, a filter button in a header that moves below the header when filters exist.
 *
 * @param filterCount - Current number of active filters
 * @returns Object containing:
 *   - filterContainerRef: Ref to attach to the container div where filters are shown when active
 *
 * @example
 * ```tsx
 * const {filterContainerRef} = useFilterFocus(filters.length);
 *
 * return (
 *   <>
 *     <Header>
 *       {!hasFilters && <FilterButton />}
 *     </Header>
 *     {hasFilters && (
 *       <div ref={filterContainerRef}>
 *         <FilterButton />
 *       </div>
 *     )}
 *   </>
 * );
 * ```
 */
export function useFilterFocus(filterCount: number) {
    // Track previous filter count to detect when first filter is added
    const prevFilterCountRef = useRef(filterCount);
    const filterContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const prevCount = prevFilterCountRef.current;
        const currentCount = filterCount;

        // Check if we just added the first filter (went from 0 to 1+)
        if (prevCount === 0 && currentCount > 0) {
            // Wait for the component to re-render and the filter UI to move to the new location
            setTimeout(() => {
                // Find the first button in the filter container (typically the "Add filter" button)
                const addFilterButton = filterContainerRef.current?.querySelector('button[type="button"]');
                if (addFilterButton instanceof HTMLElement) {
                    addFilterButton.focus();
                }
            }, 0);
        }

        // Update the ref for the next render
        prevFilterCountRef.current = currentCount;
    }, [filterCount]);

    return {filterContainerRef};
}
