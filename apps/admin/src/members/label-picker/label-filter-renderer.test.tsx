import LabelFilterRenderer from '@/members/label-picker/label-filter-renderer';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useLabelPicker} from '@/members/hooks/use-label-picker';
import type {CustomRendererProps} from '@tryghost/shade/patterns';

vi.mock('@/members/hooks/use-label-picker', () => ({
    useLabelPicker: vi.fn()
}));

const mockUseLabelPicker = vi.mocked(useLabelPicker);

// cmdk scrolls the selected item into view, which jsdom doesn't implement
Element.prototype.scrollIntoView = () => {};

function makePicker(overrides: Partial<ReturnType<typeof useLabelPicker>> = {}) {
    const picker: ReturnType<typeof useLabelPicker> = {
        labels: [],
        optionSource: {
            options: [],
            isInitialLoad: false,
            isSearching: false,
            isLoadingMore: false,
            hasMore: false,
            loadMore: vi.fn(),
            shouldClientFilter: false,
            onSearchChange: vi.fn()
        },
        selectedSlugs: [],
        resolvedSelectedLabels: [],
        toggleLabel: vi.fn(),
        createLabel: vi.fn().mockResolvedValue(undefined),
        editLabel: vi.fn().mockResolvedValue(undefined),
        deleteLabel: vi.fn().mockResolvedValue(undefined),
        isCreating: false,
        ...overrides
    };
    mockUseLabelPicker.mockReturnValue(picker);
    return picker;
}

function renderFilterAndSearch(searchText: string, values: string[] = []) {
    const props = {
        field: {valueSource: undefined},
        values,
        onChange: vi.fn()
    } as unknown as CustomRendererProps<string>;
    render(<LabelFilterRenderer {...props} />);

    fireEvent.click(screen.getByRole('button', {name: 'Select...'}));
    const searchInput = screen.getByPlaceholderText('Search labels...');
    fireEvent.change(searchInput, {target: {value: searchText}});
    return searchInput;
}

describe('LabelFilterRenderer', () => {
    it('clears the search after a successful create without re-toggling the selection', async () => {
        const picker = makePicker({
            createLabel: vi.fn().mockResolvedValue({
                id: '1',
                name: 'New Label',
                slug: 'new-label',
                created_at: '',
                updated_at: ''
            })
        });

        const searchInput = renderFilterAndSearch('New Label');
        fireEvent.click(screen.getByRole('button', {name: 'Create "New Label"'}));

        await waitFor(() => expect(picker.createLabel).toHaveBeenCalledWith('New Label'));
        // Selection happens inside createLabel - toggling here too could
        // deselect the label if the selection changed during the request
        expect(picker.toggleLabel).not.toHaveBeenCalled();
        expect(searchInput).toHaveValue('');
    });

    it('keeps the typed name when creation fails', async () => {
        const picker = makePicker({
            createLabel: vi.fn().mockRejectedValue(new Error('Label already exists'))
        });

        const searchInput = renderFilterAndSearch('Duplicate beyond first page');
        fireEvent.click(screen.getByRole('button', {name: 'Create "Duplicate beyond first page"'}));

        await waitFor(() => expect(picker.createLabel).toHaveBeenCalledWith('Duplicate beyond first page'));
        expect(picker.toggleLabel).not.toHaveBeenCalled();
        expect(searchInput).toHaveValue('Duplicate beyond first page');
    });

    it('does not deselect an adopted label that is already selected', async () => {
        const picker = makePicker({
            createLabel: vi.fn().mockResolvedValue({
                id: '1',
                name: 'Adopted Label',
                slug: 'adopted-label',
                created_at: '',
                updated_at: ''
            })
        });

        const searchInput = renderFilterAndSearch('Adopted Label', ['adopted-label']);
        fireEvent.click(screen.getByRole('button', {name: 'Create "Adopted Label"'}));

        await waitFor(() => expect(picker.createLabel).toHaveBeenCalledWith('Adopted Label'));
        expect(picker.toggleLabel).not.toHaveBeenCalled();
        expect(searchInput).toHaveValue('');
    });

    it('hides the create action when an exact match is already loaded', () => {
        makePicker({
            labels: [{id: '1', name: 'Existing-Label', slug: 'existing-label', created_at: '', updated_at: ''}]
        });

        renderFilterAndSearch('existing-label');

        expect(screen.queryByRole('button', {name: 'Create "existing-label"'})).not.toBeInTheDocument();
    });
});
