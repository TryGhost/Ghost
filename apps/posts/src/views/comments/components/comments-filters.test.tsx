import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import CommentsFilters from './comments-filters';

const mockUseFilterOptions = vi.fn();

vi.mock('../hooks/use-filter-options', () => ({
    useFilterOptions: () => mockUseFilterOptions()
}));

describe('CommentsFilters', () => {
    it('shows a Filter button when no predicates are active', () => {
        mockUseFilterOptions.mockReturnValue({
            options: [],
            isLoading: false,
            onSearchChange: vi.fn(),
            searchValue: ''
        });

        render(<CommentsFilters filters={[]} knownMembers={[]} knownPosts={[]} onFiltersChange={vi.fn()} />);

        expect(screen.getByRole('button', {name: /filter/i})).toHaveTextContent('Filter');
        expect(screen.queryByRole('button', {name: /add filter/i})).not.toBeInTheDocument();
    });

    it('shows an Add filter button when predicates are active', () => {
        mockUseFilterOptions.mockReturnValue({
            options: [],
            isLoading: false,
            onSearchChange: vi.fn(),
            searchValue: ''
        });

        render(<CommentsFilters filters={[
            {id: 'status-1', field: 'status', operator: 'is', values: ['published']}
        ]} knownMembers={[]} knownPosts={[]} onFiltersChange={vi.fn()} />);

        expect(screen.getByRole('button', {name: /add filter/i})).toHaveTextContent('Add filter');
    });
});
