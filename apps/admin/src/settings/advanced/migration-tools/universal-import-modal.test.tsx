import {useState} from 'react';
import UniversalImportModal from '@/settings/advanced/migration-tools/universal-import-modal';
import {ConfirmationProvider} from '@/settings/providers/confirmation-provider';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';

const {mockImportContent, mockImportContentCSV, mockUseFeatureFlag, mockHandleError} = vi.hoisted(() => ({
    mockImportContent: vi.fn(),
    mockImportContentCSV: vi.fn(),
    mockUseFeatureFlag: vi.fn(),
    mockHandleError: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/db', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/db')>('@tryghost/admin-x-framework/api/db');
    return {...actual, useImportContent: () => ({mutateAsync: mockImportContent})};
});

vi.mock('@tryghost/admin-x-framework/api/posts', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/posts')>('@tryghost/admin-x-framework/api/posts');
    return {...actual, useImportContentCSV: () => ({mutateAsync: mockImportContentCSV})};
});

vi.mock('@tryghost/admin-x-framework/hooks', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/hooks')>('@tryghost/admin-x-framework/hooks');
    return {...actual, useHandleError: () => mockHandleError};
});

vi.mock('@/settings/hooks/use-feature-flag', () => ({
    default: (flag: string) => mockUseFeatureFlag(flag) as boolean
}));

describe('UniversalImportModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockImportContent.mockResolvedValue({});
        mockImportContentCSV.mockResolvedValue({});
    });

    const showModal = () => {
        const ModalHarness = () => {
            const [isOpen, setIsOpen] = useState(true);

            return isOpen ? <UniversalImportModal onClose={() => setIsOpen(false)} /> : null;
        };

        render(<ConfirmationProvider><ModalHarness /></ConfirmationProvider>);
    };

    const fileInput = async () => await screen.findByTestId('import-file');

    const description = async () => await screen.findByTestId('import-file-description');

    const dropFile = async (file: File) => {
        const input = await fileInput();

        // act() flushes react-dropzone's async file processing, so a
        // "not called" assertion afterwards can't pass vacuously
        await act(async () => {
            fireEvent.change(input, {target: {files: [file]}});
            await Promise.resolve();
        });
    };

    it('reads the csvContentImporter flag', async () => {
        mockUseFeatureFlag.mockReturnValue(false);
        showModal();

        await fileInput();
        expect(mockUseFeatureFlag).toHaveBeenCalledWith('csvContentImporter');
    });

    it('sends JSON files to the db import when csvContentImporter is disabled', async () => {
        mockUseFeatureFlag.mockReturnValue(false);
        showModal();

        expect(await description()).toHaveTextContent(/Select any JSON or zip file/);

        const file = new File(['{}'], 'export.json', {type: 'application/json'});
        await dropFile(file);

        await waitFor(() => expect(mockImportContent).toHaveBeenCalledWith(file));
        expect(mockImportContentCSV).not.toHaveBeenCalled();
        expect(await screen.findByTestId('confirmation-modal')).toHaveTextContent('Import in progress');
    });

    it('rejects CSV files when csvContentImporter is disabled', async () => {
        mockUseFeatureFlag.mockReturnValue(false);
        showModal();

        const input = await fileInput();
        expect(input).toHaveAttribute('accept', expect.not.stringContaining('.csv'));

        await dropFile(new File(['title\nHello'], 'posts.csv', {type: 'text/csv'}));

        expect(mockImportContent).not.toHaveBeenCalled();
        expect(mockImportContentCSV).not.toHaveBeenCalled();
        expect(screen.getByTestId('universal-import-modal')).toBeInTheDocument();
    });

    it('sends CSV files to the posts upload endpoint when csvContentImporter is enabled', async () => {
        mockUseFeatureFlag.mockReturnValue(true);
        showModal();

        expect(await description()).toHaveTextContent(/Select any JSON, zip or CSV file/);

        const input = await fileInput();
        expect(input).toHaveAttribute('accept', expect.stringContaining('.csv'));

        const file = new File(['title\nHello'], 'posts.csv', {type: 'text/csv'});
        await dropFile(file);

        await waitFor(() => expect(mockImportContentCSV).toHaveBeenCalledWith(file));
        expect(mockImportContent).not.toHaveBeenCalled();
        expect(await screen.findByTestId('confirmation-modal')).toHaveTextContent('Import in progress');
    });

    it('still sends JSON files to the db import when csvContentImporter is enabled', async () => {
        mockUseFeatureFlag.mockReturnValue(true);
        showModal();

        const file = new File(['{}'], 'export.json', {type: 'application/json'});
        await dropFile(file);

        await waitFor(() => expect(mockImportContent).toHaveBeenCalledWith(file));
        expect(mockImportContentCSV).not.toHaveBeenCalled();
    });

    it('surfaces an error and keeps the modal open when the import fails', async () => {
        const error = new Error('Import failed');
        mockUseFeatureFlag.mockReturnValue(true);
        mockImportContentCSV.mockRejectedValue(error);
        showModal();

        await dropFile(new File(['title\nHello'], 'posts.csv', {type: 'text/csv'}));

        await waitFor(() => expect(mockHandleError).toHaveBeenCalledWith(error));
        expect(screen.getByTestId('universal-import-modal')).toBeInTheDocument();
        expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
    });
});
