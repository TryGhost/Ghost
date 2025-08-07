import {useEffect, useMemo, useState} from 'react';

/**
 * A simple pagination hook that handles data slicing and page navigation.
 *
 * @example
 * const { currentPage, totalPages, paginatedData, nextPage, previousPage } = useSimplePagination({
 *   data: items,
 *   itemsPerPage: 10
 * });
 *
 * @example With SimplePagination components
 * <SimplePagination>
 *   <SimplePaginationPages
 *     currentPage={currentPage.toString()}
 *     totalPages={totalPages.toString()}
 *   />
 *   <SimplePaginationNavigation>
 *     <SimplePaginationPreviousButton
 *       disabled={!hasPreviousPage}
 *       onClick={previousPage}
 *     />
 *     <SimplePaginationNextButton
 *       disabled={!hasNextPage}
 *       onClick={nextPage}
 *     />
 *   </SimplePaginationNavigation>
 * </SimplePagination>
 */

interface UseSimplePaginationProps<T> {
    data: T[] | null;
    itemsPerPage: number;
    initialPage?: number;
}

interface UseSimplePaginationResult<T> {
    currentPage: number;
    setCurrentPage: (page: number) => void;
    totalPages: number;
    paginatedData: T[] | null;
    nextPage: () => void;
    previousPage: () => void;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export function useSimplePagination<T>({
    data,
    itemsPerPage,
    initialPage = 1
}: UseSimplePaginationProps<T>): UseSimplePaginationResult<T> {
    const [currentPage, setCurrentPage] = useState(initialPage);

    if (itemsPerPage <= 0) {
        throw new Error('itemsPerPage must be a positive number');
    }

    const setCurrentPageSafe = (page: number) => {
        const clampedPage = Math.max(1, Math.min(totalPages, page));
        setCurrentPage(clampedPage);
    };

    const totalPages = useMemo(() => {
        if (!data) {
            return 1;
        }
        return Math.ceil(data.length / itemsPerPage);
    }, [data, itemsPerPage]);

    // Reset to page 1 if current page becomes invalid due to data changes
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [currentPage, totalPages]);

    const paginatedData = useMemo(() => {
        if (!data) {
            return null;
        }
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    }, [data, currentPage, itemsPerPage]);

    const nextPage = () => {
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
    };

    const previousPage = () => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    };

    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    return {
        currentPage,
        setCurrentPage: setCurrentPageSafe,
        totalPages,
        paginatedData,
        nextPage,
        previousPage,
        hasNextPage,
        hasPreviousPage
    };
}
