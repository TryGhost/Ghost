import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import CommentsFilters from './comments-filters';

const mockUseFilterOptions = vi.fn();

vi.mock('../hooks/use-filter-options', () => ({
    useFilterOptions: () => mockUseFilterOptions()
}));

describe('CommentsFilters', () => {
    const renderSubject = (filters: Array<{id: string; field: string; operator: string; values: string[]}>) => {
        mockUseFilterOptions.mockReturnValue({
            options: [],
            isLoading: false,
            onSearchChange: vi.fn(),
            searchValue: ''
        });

        render(<CommentsFilters filters={filters} knownMembers={[]} knownPosts={[]} onFiltersChange={vi.fn()} />);
    };

    it('shows a Filter button when no predicates are active', () => {
        renderSubject([]);

        expect(screen.getByRole('button', {name: /filter/i})).toHaveTextContent('Filter');
        expect(screen.queryByRole('button', {name: /add filter/i})).not.toBeInTheDocument();
    });

    it('shows an Add filter button when predicates are active', () => {
        renderSubject([
            {id: 'status-1', field: 'status', operator: 'is', values: ['published']}
        ]);

        expect(screen.getByRole('button', {name: /add filter/i})).toHaveTextContent('Add filter');
    });
});
