import {AlreadyExistsError} from '@tryghost/admin-x-framework/errors';
import {EditRow, LabelPicker} from '@src/components/label-picker';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';

describe('label-picker components', () => {
    it('shows duplicate create errors inline', async () => {
        const onCreate = vi.fn().mockRejectedValue(new AlreadyExistsError('A label with this name already exists'));
        const optionSource = {
            options: [],
            isInitialLoad: false,
            isSearching: false,
            isLoadingMore: false,
            hasMore: false,
            loadMore: vi.fn(),
            shouldClientFilter: true,
            onSearchChange: vi.fn()
        };

        render(
            <LabelPicker
                canCreateFromSearch={() => true}
                labels={[]}
                optionSource={optionSource}
                selectedSlugs={[]}
                onCreate={onCreate}
                onToggle={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole('combobox'));
        fireEvent.change(screen.getByPlaceholderText('Search labels...'), {target: {value: 'New Label'}});
        fireEvent.click(screen.getByText('Create "New Label"'));

        await waitFor(() => {
            expect(onCreate).toHaveBeenCalledWith('New Label');
        });

        expect(screen.getByText('A label with this name already exists')).toBeInTheDocument();
    });

    it('shows duplicate save errors inline', async () => {
        const onSave = vi.fn().mockRejectedValue(new AlreadyExistsError('A label with this name already exists'));

        render(
            <EditRow
                label={{
                    id: 'label-1',
                    name: 'Existing Label',
                    slug: 'existing-label',
                    created_at: '',
                    updated_at: ''
                }}
                onCancel={vi.fn()}
                onDelete={vi.fn()}
                onSave={onSave}
            />
        );

        fireEvent.click(screen.getByRole('button', {name: 'Save'}));

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith('label-1', 'Existing Label');
        });

        expect(screen.getByText('A label with this name already exists')).toBeInTheDocument();
    });
});
