import {ImportMembersModal} from '@src/views/members/components/bulk-action-modals/import-members-modal';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';

vi.mock('@tryghost/admin-x-framework/helpers', () => ({
    getGhostPaths: () => ({
        apiRoot: '/ghost/api/admin'
    })
}));

vi.mock('@src/hooks/use-label-picker', () => ({
    useLabelPicker: () => ({
        labels: [],
        selectedSlugs: [],
        isLoading: false,
        toggleLabel: vi.fn(),
        createLabel: vi.fn(),
        editLabel: vi.fn(),
        deleteLabel: vi.fn(),
        isDuplicateName: () => false,
        canCreateFromSearch: () => false,
        isCreating: false
    })
}));

function createFile(name: string, type: string, contents = 'content') {
    return {
        name,
        type,
        size: contents.length
    };
}

class MockFileReader {
    static LOADING = 1;
    onload: ((event: {target: {result: string}}) => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    readyState = 0;
    error: Error | null = null;

    readAsText() {
        this.onload?.({
            target: {
                result: 'email,name\nmember@example.com,Member'
            }
        });
    }

    abort() {
        this.onabort?.();
    }
}

describe('ImportMembersModal', () => {
    beforeEach(() => {
        vi.stubGlobal('FileReader', MockFileReader);
        vi.stubGlobal('fetch', vi.fn(async () => new Response(null, {status: 202})));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('calls onComplete when the upload response is accepted for background processing', async () => {
        const onComplete = vi.fn();
        render(
            <ImportMembersModal
                open
                onComplete={onComplete}
                onOpenChange={() => {}}
            />
        );

        const dropTarget = screen.getByRole('button', {name: /select or drop a csv file/i});
        const csvFile = createFile('members.csv', 'text/csv', 'email,name\nmember@example.com,Member');

        fireEvent.drop(dropTarget, {
            dataTransfer: {
                files: [csvFile],
                items: [{
                    kind: 'file',
                    type: csvFile.type,
                    getAsFile: () => csvFile
                }],
                types: ['Files']
            }
        });

        const importButton = await screen.findByRole('button', {name: /import 1 member/i});
        fireEvent.click(importButton);

        await waitFor(() => {
            expect(onComplete).toHaveBeenCalledTimes(1);
        });

        expect(screen.getByRole('heading', {name: /import in progress/i})).toBeInTheDocument();
    });
});
