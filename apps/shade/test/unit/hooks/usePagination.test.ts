import {expect} from 'chai';
import {renderHook, act} from '@testing-library/react-hooks';
import {usePagination, PaginationMeta, PaginationData} from '../../../src/hooks/usePagination';

describe('usePagination', function () {
    const initialMeta: PaginationMeta = {
        limit: 10,
        pages: 5,
        total: 50,
        next: null,
        prev: null
    };

    it('should initialize with the given meta and page', function () {
        const {result} = renderHook(() => usePagination({
            meta: initialMeta,
            limit: 10,
            page: 1,
            setPage: () => {}
        })
        );

        const expectedData: PaginationData = {
            page: 1,
            pages: initialMeta.pages,
            total: initialMeta.total,
            limit: initialMeta.limit,
            setPage: result.current.setPage,
            nextPage: result.current.nextPage,
            prevPage: result.current.prevPage
        };

        expect(result.current).to.deep.equal(expectedData);
    });

    it('should update page correctly when nextPage and prevPage are called', function () {
        let currentPage = 1;
        const setPage = (newPage: number) => {
            currentPage = newPage;
        };

        const {result} = renderHook(() => usePagination({
            meta: initialMeta,
            limit: 10,
            page: currentPage,
            setPage
        })
        );

        act(() => {
            result.current.nextPage();
        });

        expect(currentPage).to.equal(2);

        act(() => {
            result.current.prevPage();
        });

        expect(currentPage).to.equal(1);
    });

    it('should update page correctly when setPage is called', function () {
        let currentPage = 3;
        const setPage = (newPage: number) => {
            currentPage = newPage;
        };

        const {result} = renderHook(() => usePagination({
            meta: initialMeta,
            limit: 10,
            page: currentPage,
            setPage
        })
        );

        const newPage = 5;

        act(() => {
            result.current.setPage(newPage);
        });

        expect(currentPage).to.equal(newPage);
    });

    it('should handle edge cases where meta.pages < page when setting meta', function () {
        let currentPage = 5;
        const setPage = (newPage: number) => {
            currentPage = newPage;
        };

        const {rerender} = renderHook(
            ({meta}) => usePagination({
                meta,
                limit: 10,
                page: currentPage,
                setPage
            }),
            {initialProps: {meta: initialMeta}}
        );

        const updatedMeta: PaginationMeta = {
            limit: 10,
            pages: 4,
            total: 40,
            next: null,
            prev: null
        };

        act(() => {
            rerender({meta: updatedMeta});
        });

        expect(currentPage).to.equal(4);
    });
});
