import {EditRow} from '@/members/label-picker/edit-row';
import {type ErrorResponse, ValidationError} from '@tryghost/admin-x-framework/errors';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import type {ComponentProps} from 'react';

const label = {
    id: '1',
    name: 'Existing',
    slug: 'existing',
    created_at: '',
    updated_at: ''
};

function makeValidationError(context: string) {
    const data: ErrorResponse = {
        errors: [{
            code: 'VALIDATION',
            context,
            details: null,
            ghostErrorCode: null,
            help: '',
            id: 'error-id',
            message: 'Validation error, cannot edit label.',
            property: null,
            type: 'ValidationError'
        }]
    };
    return new ValidationError({url: '', status: 422} as unknown as Response, data);
}

function renderEditRow(overrides: Partial<ComponentProps<typeof EditRow>> = {}) {
    const props = {
        label,
        onSave: vi.fn().mockResolvedValue(undefined),
        onCancel: vi.fn(),
        onDelete: vi.fn().mockResolvedValue(undefined),
        ...overrides
    };
    render(<EditRow {...props} />);
    return props;
}

describe('EditRow', () => {
    it('closes the row after a successful save', async () => {
        const {onSave, onCancel} = renderEditRow();

        fireEvent.change(screen.getByRole('textbox'), {target: {value: 'Renamed'}});
        fireEvent.click(screen.getByRole('button', {name: 'Save'}));

        await waitFor(() => expect(onCancel).toHaveBeenCalled());
        expect(onSave).toHaveBeenCalledWith('1', 'Renamed');
    });

    it('shows the server validation message inline when the save is rejected', async () => {
        const {onCancel} = renderEditRow({
            onSave: vi.fn().mockRejectedValue(makeValidationError('Label already exists'))
        });

        fireEvent.change(screen.getByRole('textbox'), {target: {value: 'Duplicate beyond first page'}});
        fireEvent.click(screen.getByRole('button', {name: 'Save'}));

        expect(await screen.findByText('Label already exists')).toBeInTheDocument();
        // The row stays open so the user can fix the name
        expect(onCancel).not.toHaveBeenCalled();
        expect(screen.getByRole('button', {name: 'Save'})).toBeEnabled();
    });

    it('shows a generic message when the save fails unexpectedly', async () => {
        renderEditRow({
            onSave: vi.fn().mockRejectedValue(new Error('Network down'))
        });

        fireEvent.change(screen.getByRole('textbox'), {target: {value: 'Renamed'}});
        fireEvent.click(screen.getByRole('button', {name: 'Save'}));

        expect(await screen.findByText('Failed to save label, please try again.')).toBeInTheDocument();
    });

    it('clears the error when the name is changed', async () => {
        renderEditRow({
            onSave: vi.fn().mockRejectedValue(makeValidationError('Label already exists'))
        });

        fireEvent.change(screen.getByRole('textbox'), {target: {value: 'Duplicate'}});
        fireEvent.click(screen.getByRole('button', {name: 'Save'}));
        await screen.findByText('Label already exists');

        fireEvent.change(screen.getByRole('textbox'), {target: {value: 'Duplicate 2'}});

        expect(screen.queryByText('Label already exists')).not.toBeInTheDocument();
    });

    it('requires a name without calling onSave', async () => {
        const {onSave} = renderEditRow();

        fireEvent.change(screen.getByRole('textbox'), {target: {value: '   '}});
        fireEvent.click(screen.getByRole('button', {name: 'Save'}));

        expect(await screen.findByText('Name is required')).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
    });
});
