import { useState } from 'react';
import UniversalImportModal from '@/settings/advanced/migration-tools/universal-import-modal';
import { ConfirmationProvider } from '@/settings/providers/confirmation-provider';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import JSZip from 'jszip';

const { mockImportContent, mockImportContentCSV, mockUseFeatureFlag, mockHandleError } = vi.hoisted(
  () => ({
    mockImportContent: vi.fn(),
    mockImportContentCSV: vi.fn(),
    mockUseFeatureFlag: vi.fn(),
    mockHandleError: vi.fn(),
  }),
);

vi.mock('@tryghost/admin-x-framework/api/db', async () => {
  const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/db')>(
    '@tryghost/admin-x-framework/api/db',
  );
  return { ...actual, useImportContent: () => ({ mutateAsync: mockImportContent }) };
});

vi.mock('@tryghost/admin-x-framework/api/posts', async () => {
  const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/posts')>(
    '@tryghost/admin-x-framework/api/posts',
  );
  return { ...actual, useImportContentCSV: () => ({ mutateAsync: mockImportContentCSV }) };
});

vi.mock('@tryghost/admin-x-framework/hooks', async () => {
  const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/hooks')>(
    '@tryghost/admin-x-framework/hooks',
  );
  return {
    ...actual,
    useFeatureFlag: (flag: string) => mockUseFeatureFlag(flag) as boolean,
    useHandleError: () => mockHandleError,
  };
});

describe('UniversalImportModal', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

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

    render(
      <ConfirmationProvider>
        <ModalHarness />
      </ConfirmationProvider>,
    );
  };

  const fileInput = async () => await screen.findByTestId('import-file');

  const description = async () => await screen.findByTestId('import-file-description');

  const dropFile = async (file: File) => {
    const input = await fileInput();

    // act() flushes react-dropzone's async file processing, so a
    // "not called" assertion afterwards can't pass vacuously
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
      await Promise.resolve();
    });
  };

  const zipFile = async (build: (archive: JSZip) => void) => {
    const archive = new JSZip();
    build(archive);
    const bytes = await archive.generateAsync({ type: 'arraybuffer' });
    return new File([bytes], 'import.zip', { type: 'application/zip' });
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

    const file = new File(['{}'], 'export.json', { type: 'application/json' });
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

    await dropFile(new File(['title\nHello'], 'posts.csv', { type: 'text/csv' }));

    expect(mockImportContent).not.toHaveBeenCalled();
    expect(mockImportContentCSV).not.toHaveBeenCalled();
    expect(screen.getByTestId('universal-import-modal')).toBeInTheDocument();
  });

  it('maps CSV files before sending them to the posts upload endpoint', async () => {
    mockUseFeatureFlag.mockReturnValue(true);
    showModal();

    expect(await description()).toHaveTextContent(/Select any JSON, zip or CSV file/);

    const input = await fileInput();
    expect(input).toHaveAttribute('accept', expect.stringContaining('.csv'));

    const file = new File(['title\nHello'], 'posts.csv', { type: 'text/csv' });
    await dropFile(file);

    expect(await screen.findByText('Map CSV fields')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(mockImportContentCSV).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() =>
      expect(mockImportContentCSV).toHaveBeenCalledWith({
        file,
        mapping: { title: 'title' },
      }),
    );
    expect(mockImportContent).not.toHaveBeenCalled();
    expect(await screen.findByTestId('confirmation-modal')).toHaveTextContent('Import in progress');
  });

  it('can start over after selecting a CSV file', async () => {
    mockUseFeatureFlag.mockReturnValue(true);
    showModal();

    await dropFile(new File(['title\nHello'], 'posts.csv', { type: 'text/csv' }));
    expect(await screen.findByText('Map CSV fields')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));

    expect(await fileInput()).toBeInTheDocument();
    expect(mockImportContentCSV).not.toHaveBeenCalled();
  });

  it('blocks importing while the required title field is unmapped', async () => {
    mockUseFeatureFlag.mockReturnValue(true);
    showModal();

    await dropFile(new File(['Headline\nHello'], 'posts.csv', { type: 'text/csv' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Required field missing: Title');
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    expect(mockImportContentCSV).not.toHaveBeenCalled();
  });

  it('searches grouped editorial targets and submits the chosen field', async () => {
    mockUseFeatureFlag.mockReturnValue(true);
    showModal();

    const file = new File(['title,Social summary\nHello,Shared copy'], 'posts.csv', {
      type: 'text/csv',
    });
    await dropFile(file);

    fireEvent.click(await screen.findByRole('combobox', { name: /Field for Social summary/ }));
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Social')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search post fields...'), {
      target: { value: 'Twitter description' },
    });
    fireEvent.click(screen.getByText('Twitter description'));
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() =>
      expect(mockImportContentCSV).toHaveBeenCalledWith({
        file,
        mapping: { title: 'title', 'Social summary': 'twitter_description' },
      }),
    );
  });

  it('still sends JSON files to the db import when csvContentImporter is enabled', async () => {
    mockUseFeatureFlag.mockReturnValue(true);
    showModal();

    const file = new File(['{}'], 'export.json', { type: 'application/json' });
    await dropFile(file);

    await waitFor(() => expect(mockImportContent).toHaveBeenCalledWith(file));
    expect(mockImportContentCSV).not.toHaveBeenCalled();
  });

  it('still sends JSON ZIP files to the db import when csvContentImporter is enabled', async () => {
    mockUseFeatureFlag.mockReturnValue(true);
    showModal();

    const file = await zipFile((archive) => archive.file('ghost-import.json', '{}'));
    await dropFile(file);

    await waitFor(() => expect(mockImportContent).toHaveBeenCalledWith(file));
    expect(mockImportContentCSV).not.toHaveBeenCalled();
  });

  it('maps the single CSV in a ZIP and uploads the original archive', async () => {
    mockUseFeatureFlag.mockReturnValue(true);
    showModal();

    const file = await zipFile((archive) => {
      archive.file('export/posts.csv', 'title,html\nFrom ZIP,<p>Body</p>');
      archive.file('export/content/files/attachment.csv', 'download,only');
    });
    await dropFile(file);

    expect(await screen.findByText('Map CSV fields')).toBeInTheDocument();
    expect(screen.getByText('From ZIP')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() =>
      expect(mockImportContentCSV).toHaveBeenCalledWith({
        file,
        mapping: { title: 'title', html: 'html' },
      }),
    );
    expect(mockImportContent).not.toHaveBeenCalled();
  });

  it('rejects multiple data CSVs before uploading the ZIP', async () => {
    mockUseFeatureFlag.mockReturnValue(true);
    showModal();

    const file = await zipFile((archive) => {
      archive.file('one.csv', 'title\nOne');
      archive.file('two.csv', 'title\nTwo');
    });
    await dropFile(file);

    await waitFor(() => expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error)));
    expect(mockHandleError.mock.calls[0][0]).toHaveProperty(
      'message',
      expect.stringContaining('only one CSV file'),
    );
    expect(mockImportContent).not.toHaveBeenCalled();
    expect(mockImportContentCSV).not.toHaveBeenCalled();
    expect(screen.getByTestId('universal-import-modal')).toBeInTheDocument();
  });

  it('surfaces an error and keeps the modal open when the import fails', async () => {
    const error = new Error('Import failed');
    mockUseFeatureFlag.mockReturnValue(true);
    mockImportContentCSV.mockRejectedValue(error);
    showModal();

    await dropFile(new File(['title\nHello'], 'posts.csv', { type: 'text/csv' }));
    await screen.findByText('Map CSV fields');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(mockHandleError).toHaveBeenCalledWith(error));
    expect(screen.getByTestId('universal-import-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
  });
});
