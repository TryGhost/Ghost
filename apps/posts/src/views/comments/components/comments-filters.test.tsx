import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import CommentsFilters from './comments-filters';

vi.mock('../use-comment-filter-fields', () => ({
    useCommentFilterFields: () => [{key: 'status', label: 'Status', type: 'select', operators: []}]
}));

const filtersSpy = vi.fn();

vi.mock('@tryghost/shade', async () => {
    const actual = await vi.importActual<object>('@tryghost/shade');

    return {
        ...actual,
        Filters: (props: object) => {
            filtersSpy(props);

            const {addButtonText, showClearButton}: {addButtonText: string; showClearButton: boolean} = props as never;

            return (
                <div>
                    <span>{addButtonText}</span>
                    <span>{showClearButton ? 'clear-on' : 'clear-off'}</span>
                </div>
            );
        }
    };
});

describe('CommentsFilters', () => {
    beforeEach(() => {
        filtersSpy.mockClear();
    });

    it('uses the compact filter button state when there are no filters', () => {
        render(
            <CommentsFilters
                filters={[]}
                knownMembers={[]}
                knownPosts={[]}
                onFiltersChange={vi.fn()}
            />
        );

        expect(screen.getByText('Filter')).toBeInTheDocument();
        expect(screen.getByText('clear-off')).toBeInTheDocument();
        expect(filtersSpy).toHaveBeenCalledWith(expect.objectContaining({
            allowMultiple: false,
            popoverAlign: 'end',
            showClearButton: false,
            showSearchInput: false
        }));
    });

    it('uses the expanded filter button state when filters are active', () => {
        render(
            <CommentsFilters
                filters={[{id: '1', field: 'status', operator: 'is', values: ['published']}]}
                knownMembers={[]}
                knownPosts={[]}
                onFiltersChange={vi.fn()}
            />
        );

        expect(screen.getByText('Add filter')).toBeInTheDocument();
        expect(screen.getByText('clear-on')).toBeInTheDocument();
        expect(filtersSpy).toHaveBeenCalledWith(expect.objectContaining({
            allowMultiple: false,
            popoverAlign: 'start',
            showClearButton: true,
            filters: [{id: '1', field: 'status', operator: 'is', values: ['published']}]
        }));
    });
});
