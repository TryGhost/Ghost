import {Meta} from '../utils/api/hooks';
import {useEffect, useState} from 'react';

export interface PaginationData {
    page: number;
    pages: number | null;
    total: number | null;
    limit: number;
    setPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
}

export const usePage = () => {
    const [page, setPage] = useState(1);
    return {page, setPage};
};

export const usePagination = ({limit, meta, page, setPage}: {meta?: Meta, limit: number, page: number, setPage: React.Dispatch<React.SetStateAction<number>>}): PaginationData => {
    // Prevent resetting meta when a new page loads
    const [prevMeta, setPrevMeta] = useState<Meta | undefined>(meta);

    useEffect(() => {
        if (meta) {
            setPrevMeta(meta);

            if (meta.pagination.pages > 0 && meta.pagination.pages < page) {
                // We probably deleted an item when on the last page: go one page back automatically
                setPage(meta.pagination.pages);
            }
        }
    }, [meta, setPage, page]);

    return {
        page,
        setPage,
        pages: prevMeta?.pagination.pages ?? null,
        limit: prevMeta?.pagination.limit ?? limit,
        total: prevMeta?.pagination.total ?? null,
        nextPage: () => setPage(Math.min(page + 1, prevMeta?.pagination.pages ? prevMeta.pagination.pages : page)),
        prevPage: () => setPage(Math.max(1, page - 1))
    };
};
