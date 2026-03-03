import assert from 'assert/strict';
import {describe, it, vi} from 'vitest';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import {Dropzone} from '../../../../src/components/ui/dropzone';
import {render} from '../../utils/test-utils';

function createFile(name: string, type: string, contents = 'content') {
    return {
        name,
        type,
        size: contents.length,
        lastModified: Date.now(),
        arrayBuffer: vi.fn(),
        slice: vi.fn(),
        stream: vi.fn(),
        text: vi.fn()
    };
}

describe('Dropzone Component', () => {
    it('renders an accessible drop target', () => {
        render(
            <Dropzone>
                <span>Select or drop a CSV file</span>
            </Dropzone>
        );

        const trigger = screen.getByRole('button', {name: /select or drop a csv file/i});

        assert.ok(trigger, 'Drop target should be rendered as a keyboard-focusable button');
        assert.equal(trigger.getAttribute('tabindex'), '0', 'Drop target should be tabbable');
    });

    it('calls onDropAccepted for accepted files', async () => {
        const onDropAccepted = vi.fn();
        render(
            <Dropzone accept={{'text/csv': ['.csv']}} onDropAccepted={onDropAccepted}>
                <span>Upload CSV</span>
            </Dropzone>
        );

        const file = createFile('members.csv', 'text/csv', 'email\nmember@example.com');
        const dropTarget = screen.getByRole('button', {name: /upload csv/i});

        fireEvent.drop(dropTarget, {
            dataTransfer: {
                files: [file],
                items: [
                    {
                        kind: 'file',
                        type: file.type,
                        getAsFile: () => file
                    }
                ],
                types: ['Files']
            }
        });

        await waitFor(() => {
            assert.equal(onDropAccepted.mock.calls.length, 1, 'Accepted callback should be called once');
        });
    });

    it('calls onDropRejected for rejected files', async () => {
        const onDropRejected = vi.fn();
        render(
            <Dropzone accept={{'text/csv': ['.csv']}} onDropRejected={onDropRejected}>
                <span>Upload CSV</span>
            </Dropzone>
        );

        const file = createFile('notes.txt', 'text/plain', 'hello');
        const dropTarget = screen.getByRole('button', {name: /upload csv/i});

        fireEvent.drop(dropTarget, {
            dataTransfer: {
                files: [file],
                items: [
                    {
                        kind: 'file',
                        type: file.type,
                        getAsFile: () => file
                    }
                ],
                types: ['Files']
            }
        });

        await waitFor(() => {
            assert.equal(onDropRejected.mock.calls.length, 1, 'Rejected callback should be called once');
        });
    });

    it('does not accept drops when disabled', async () => {
        const onDropAccepted = vi.fn();
        render(
            <Dropzone disabled onDropAccepted={onDropAccepted}>
                <span>Upload CSV</span>
            </Dropzone>
        );

        const file = createFile('members.csv', 'text/csv', 'email\nmember@example.com');
        const dropTarget = screen.getByRole('button', {name: /upload csv/i});

        fireEvent.drop(dropTarget, {
            dataTransfer: {
                files: [file],
                items: [
                    {
                        kind: 'file',
                        type: file.type,
                        getAsFile: () => file
                    }
                ],
                types: ['Files']
            }
        });

        await waitFor(() => {
            assert.equal(onDropAccepted.mock.calls.length, 0, 'Accepted callback should not run while disabled');
        });
    });
});
