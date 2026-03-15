import {describe, expect, it} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useFilterOptions} from '@src/views/comments/hooks/use-filter-options';
import type {Filter} from '@tryghost/shade';

type MemberItem = {id: string; name?: string; email?: string};
type MemberOption = {value: string; label: string; detail?: string};

describe('useFilterOptions', () => {
    const buildFilters = (value: string): Filter[] => ([
        {id: 'author', field: 'author', operator: 'is', values: [value]}
    ]);

    it('uses by-id data when active filter is missing from known/search results', () => {
        const knownItems: MemberItem[] = [];
        const filters = buildFilters('member-123');
        const searchResults: MemberItem[] = [];
        const byIdResults: MemberItem[] = [
            {id: 'member-123', name: 'Jane Doe', email: 'jane@example.com'}
        ];
        let lastEnabled: boolean | undefined;

        const useSearch = () => ({
            data: {members: searchResults},
            isLoading: false
        });

        const useGetById = (_id: string, options?: {enabled?: boolean}) => {
            lastEnabled = options?.enabled;
            return {
                data: options?.enabled ? {members: byIdResults} : undefined,
                isLoading: false
            };
        };

        const {result} = renderHook(() => useFilterOptions<MemberItem, MemberOption, 'members'>({
            knownItems,
            useSearch,
            useGetById,
            searchFieldName: 'members',
            filters,
            filterFieldName: 'author',
            toOption: member => ({
                value: member.id,
                label: member.name || 'Unknown name',
                detail: member.email ?? '(Unknown email)'
            })
        }));

        expect(lastEnabled).toBe(true);
        expect(result.current.options).toContainEqual({
            value: 'member-123',
            label: 'Jane Doe',
            detail: 'jane@example.com'
        });
        expect(result.current.options.some(option => option.label === 'ID: member-123')).toBe(false);
    });

    it('falls back to ID when by-id fetch returns no results', () => {
        const knownItems: MemberItem[] = [];
        const filters = buildFilters('member-456');
        const searchResults: MemberItem[] = [];
        const byIdResults: MemberItem[] = [];

        const useSearch = () => ({
            data: {members: searchResults},
            isLoading: false
        });

        const useGetById = (_id: string, options?: {enabled?: boolean}) => ({
            data: options?.enabled ? {members: byIdResults} : undefined,
            isLoading: false
        });

        const {result} = renderHook(() => useFilterOptions<MemberItem, MemberOption, 'members'>({
            knownItems,
            useSearch,
            useGetById,
            searchFieldName: 'members',
            filters,
            filterFieldName: 'author',
            toOption: member => ({
                value: member.id,
                label: member.name || 'Unknown name',
                detail: member.email ?? '(Unknown email)'
            })
        }));

        expect(result.current.options).toContainEqual({
            value: 'member-456',
            label: 'ID: member-456'
        });
    });
});
