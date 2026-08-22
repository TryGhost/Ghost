import {EditorFileInputControl} from '../../src/components/AddonSettingsRemote';
import {expect, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';

describe('AddonSettingsRemote', () => {
    it('shares only the explicitly selected file bytes and metadata', async () => {
        const onChange = vi.fn();
        const file = new File([new Uint8Array([0, 255, 1])], 'data.bin', {type: 'application/octet-stream'});

        render(<EditorFileInputControl label="Data file" onChange={onChange} />);
        fireEvent.change(screen.getByLabelText('Data file'), {target: {files: [file]}});

        await waitFor(() => expect(onChange).toHaveBeenCalledWith({
            name: 'data.bin',
            type: 'application/octet-stream',
            size: 3,
            bytes: new Uint8Array([0, 255, 1])
        }));
    });

    it('rejects a selected file above the control limit', async () => {
        const onChange = vi.fn();
        const file = new File(['too large'], 'data.csv', {type: 'text/csv'});

        render(<EditorFileInputControl label="Data file" maxBytes={4} onChange={onChange} />);
        fireEvent.change(screen.getByLabelText('Data file'), {target: {files: [file]}});

        expect(await screen.findByText('The selected file is too large.')).toBeInTheDocument();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('ignores a stale file read that finishes after a newer selection', async () => {
        const onChange = vi.fn();
        let resolveFirst!: (value: ArrayBuffer) => void;
        let resolveSecond!: (value: ArrayBuffer) => void;
        const first = new File(['first'], 'first.csv', {type: 'text/csv'});
        const second = new File(['second'], 'second.csv', {type: 'text/csv'});
        Object.defineProperty(first, 'arrayBuffer', {value: () => new Promise<ArrayBuffer>(resolve => resolveFirst = resolve)});
        Object.defineProperty(second, 'arrayBuffer', {value: () => new Promise<ArrayBuffer>(resolve => resolveSecond = resolve)});

        render(<EditorFileInputControl label="Data file" onChange={onChange} />);
        const input = screen.getByLabelText('Data file');
        fireEvent.change(input, {target: {files: [first]}});
        fireEvent.change(input, {target: {files: [second]}});

        resolveSecond(new TextEncoder().encode('second').buffer as ArrayBuffer);
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({name: 'second.csv'})));
        resolveFirst(new TextEncoder().encode('first').buffer as ArrayBuffer);
        await Promise.resolve();

        expect(onChange).toHaveBeenCalledTimes(1);
    });
});
