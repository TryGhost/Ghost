import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {commentFields} from './comment-fields';
import {useCommentFilterFields} from './use-comment-filter-fields';

const mockUseFilterOptions = vi.fn();

vi.mock('./hooks/use-filter-options', () => ({
    useFilterOptions: (...args: unknown[]) => mockUseFilterOptions(...args)
}));

vi.mock('./hooks/use-search-posts', () => ({
    useSearchPosts: vi.fn()
}));

vi.mock('./hooks/use-search-members', () => ({
    useSearchMembers: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/posts', () => ({
    getPost: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/members', () => ({
    getMember: vi.fn()
}));

describe('useCommentFilterFields', () => {
    beforeEach(() => {
        mockUseFilterOptions.mockReset();
        mockUseFilterOptions.mockImplementation(({filterFieldName}: {filterFieldName: string}) => {
            if (filterFieldName === 'post') {
                return {
                    options: [{value: 'post_1', label: 'Post 1'}],
                    isLoading: true,
                    searchValue: 'welcome',
                    onSearchChange: vi.fn()
                };
            }

            return {
                options: [{value: 'member_1', label: 'Member 1'}],
                isLoading: false,
                searchValue: 'jamie',
                onSearchChange: vi.fn()
            };
        });
    });

    it('hydrates visible fields from the static schema', () => {
        const {result} = renderHook(() => useCommentFilterFields({
            filters: [],
            knownPosts: [],
            knownMembers: []
        }));

        expect(result.current.map(field => field.key)).toEqual([
            'author',
            'post',
            'body',
            'status',
            'reported',
            'created_at'
        ]);
    });

    it('attaches runtime options and search callbacks to resource fields', () => {
        const {result} = renderHook(() => useCommentFilterFields({
            filters: [{id: '1', field: 'post', operator: 'is', values: ['post_1']}],
            knownPosts: [],
            knownMembers: []
        }));

        const authorField = result.current.find(field => field.key === 'author');
        const postField = result.current.find(field => field.key === 'post');

        expect(authorField).toMatchObject({
            options: [{value: 'member_1', label: 'Member 1'}],
            searchValue: 'jamie',
            isLoading: false
        });

        expect(postField).toMatchObject({
            options: [{value: 'post_1', label: 'Post 1'}],
            searchValue: 'welcome',
            isLoading: false
        });
        expect(postField?.onSearchChange).toBeTypeOf('function');
    });

    it('preserves static operator semantics from the field map', () => {
        const {result} = renderHook(() => useCommentFilterFields({
            filters: [],
            knownPosts: [],
            knownMembers: []
        }));

        const bodyField = result.current.find(field => field.key === 'body');
        const reportedField = result.current.find(field => field.key === 'reported');

        expect(bodyField?.operators?.map(operator => operator.value)).toEqual(commentFields.body.operators);
        expect(reportedField?.operators?.map(operator => operator.value)).toEqual(commentFields.reported.operators);
    });
});
