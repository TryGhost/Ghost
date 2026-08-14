import {HostLimitError, JSONError, RequestEntityTooLargeError, ValidationError} from '@tryghost/admin-x-framework/errors';
import {ImportMembersModal} from '@/members/components/bulk-action-modals/import-members-modal';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
    useBrowseConfig: () => ({
        data: {
            config: {
                labs: {
                    importMemberTier: true
                }
            }
        }
    })
}));

const {mockImportMembers} = vi.hoisted(() => ({
    mockImportMembers: vi.fn()
}));

// Keep the real response type-guards (so this test exercises production logic);
// only the network mutation is stubbed. admin-x-framework resolves to its built
// `dist`, so run this after building the framework (CI gates it via Nx ^build).
vi.mock('@tryghost/admin-x-framework/api/members', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/members')>(
        '@tryghost/admin-x-framework/api/members'
    );
    return {
        ...actual,
        useImportMembers: () => ({
            mutateAsync: mockImportMembers
        })
    };
});

vi.mock('@/members/hooks/use-label-picker', () => ({
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

function createApiError(type: string, message: string, code = '') {
    return {
        errors: [{
            code,
            context: null,
            details: null,
            ghostErrorCode: null,
            help: '',
            id: 'error-id',
            message,
            property: null,
            type
        }]
    };
}

async function uploadCsv() {
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
}

function renderModal(props: Partial<Parameters<typeof ImportMembersModal>[0]> = {}) {
    return render(
        <ImportMembersModal
            open
            onOpenChange={() => {}}
            {...props}
        />
    );
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
                result: mockCsvContents
            }
        });
    }

    abort() {
        this.onabort?.();
    }
}

let mockCsvContents = 'email,name\nmember@example.com,Member';

const originalCreateObjectURL = URL.createObjectURL.bind(URL);
const originalRevokeObjectURL = URL.revokeObjectURL.bind(URL);
describe('ImportMembersModal', () => {
    beforeEach(() => {
        mockCsvContents = 'email,name\nmember@example.com,Member';
        vi.stubGlobal('FileReader', MockFileReader);
        vi.stubGlobal('fetch', vi.fn(() => new Response(null, {status: 202})));
        mockImportMembers.mockReset();
        mockImportMembers.mockResolvedValue({
            meta: {
                originalImportSize: 1
            }
        });
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            writable: true,
            value: vi.fn(() => 'blob:mock/0')
        });
        Object.defineProperty(URL, 'revokeObjectURL', {
            configurable: true,
            writable: true,
            value: vi.fn()
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            writable: true,
            value: originalCreateObjectURL
        });
        Object.defineProperty(URL, 'revokeObjectURL', {
            configurable: true,
            writable: true,
            value: originalRevokeObjectURL
        });
    });

    it('uploads members through the members API mutation so member queries are invalidated', async () => {
        renderModal();

        await uploadCsv();

        await waitFor(() => {
            expect(mockImportMembers).toHaveBeenCalledTimes(1);
        });

        expect(mockImportMembers.mock.calls[0][0]).toEqual(expect.objectContaining({
            file: expect.objectContaining({name: 'members.csv'}) as object,
            mapping: expect.objectContaining({
                email: 'email',
                name: 'name'
            }) as object
        }));
        expect(fetch).not.toHaveBeenCalled();
    });

    it('calls onComplete when the upload response is accepted for background processing', async () => {
        const onComplete = vi.fn();
        renderModal({onComplete});

        await uploadCsv();

        await waitFor(() => {
            expect(onComplete).toHaveBeenCalledTimes(1);
        });

        expect(screen.getByRole('heading', {name: /import in progress/i})).toBeInTheDocument();
    });

    it('shows the import result when the upload completes inline', async () => {
        const onComplete = vi.fn();
        mockImportMembers.mockResolvedValueOnce({
            meta: {
                stats: {
                    imported: 1,
                    invalid: []
                },
                import_label: {
                    name: 'Test Import',
                    slug: 'test-import'
                }
            }
        });

        renderModal({onComplete});

        await uploadCsv();

        await waitFor(() => {
            expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
                importedCount: 1,
                errorCount: 0,
                errorCsvUrl: 'blob:mock/0'
            }));
        });

        expect(screen.getByRole('heading', {name: /import complete/i})).toBeInTheDocument();
    });

    it('shows the file size error when the upload is too large', async () => {
        mockImportMembers.mockRejectedValueOnce(new RequestEntityTooLargeError(new Response(null, {status: 413}), 'too large'));

        renderModal();

        await uploadCsv();

        expect(await screen.findByText('The file you uploaded was larger than the maximum file size your server allows.')).toBeInTheDocument();
    });

    it('shows the email verification host limit error without retrying', async () => {
        const onComplete = vi.fn();
        const errorData = createApiError('HostLimitError', 'Please verify your email before importing this many members.', 'EMAIL_VERIFICATION_NEEDED');
        mockImportMembers.mockRejectedValueOnce(new HostLimitError(new Response(JSON.stringify(errorData), {status: 403}), errorData));

        renderModal({onComplete});

        await uploadCsv();

        expect(await screen.findByRole('heading', {name: /woah there cowboy/i})).toBeInTheDocument();
        expect(screen.getByText('Please verify your email before importing this many members.')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /try again/i})).not.toBeInTheDocument();
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('shows validation errors returned by the upload API', async () => {
        const errorData = createApiError('ValidationError', 'Please map Email to one of the fields in the CSV.');
        mockImportMembers.mockRejectedValueOnce(new ValidationError(new Response(JSON.stringify(errorData), {status: 422}), errorData));

        renderModal();

        await uploadCsv();

        expect(await screen.findByText('Please map Email to one of the fields in the CSV.')).toBeInTheDocument();
    });

    it('shows data import errors returned by the upload API', async () => {
        const errorData = createApiError('DataImportError', 'Some rows could not be imported.');
        mockImportMembers.mockRejectedValueOnce(new JSONError(new Response(JSON.stringify(errorData), {status: 422}), errorData));

        renderModal();

        await uploadCsv();

        expect(await screen.findByText('Some rows could not be imported.')).toBeInTheDocument();
    });

    it('shows tier as a mapped field when importMemberTier is enabled', async () => {
        mockCsvContents = 'email,import_tier\nmember@example.com,Gold';

        renderModal();

        const dropTarget = screen.getByRole('button', {name: /select or drop a csv file/i});
        const csvFile = createFile('members.csv', 'text/csv', mockCsvContents);

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

        expect(await screen.findByText('Tier')).toBeInTheDocument();
    });
});
