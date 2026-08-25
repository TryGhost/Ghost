import React, { useState } from 'react';
import { Button, Dropzone } from '@tryghost/shade/components';
import { ExternalLink } from 'lucide-react';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { SettingsModal } from '@tryghost/shade/patterns';
import { useConfirmation } from '@/settings/providers/confirmation-context';
import { useFeatureFlag, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useImportContent } from '@tryghost/admin-x-framework/api/db';
import { useImportContentCSV } from '@tryghost/admin-x-framework/api/posts';
import { ContentFieldMapping } from './content-import/mapping';
import { MappingStep } from './content-import/mapping-step';
import { columnsOf, readCSV } from './content-import/csv';

interface CSVImportState {
  file: File;
  rows: Record<string, string>[];
  mapping: ContentFieldMapping;
  sampleIndex: number;
}

const UniversalImportModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { mutateAsync: importContent } = useImportContent();
  const { mutateAsync: importContentCSV } = useImportContentCSV();
  const csvContentImporter = useFeatureFlag('csvContentImporter');
  const [uploading, setUploading] = useState(false);
  const [reading, setReading] = useState(false);
  const [csvImport, setCSVImport] = useState<CSVImportState | null>(null);
  const handleError = useHandleError();
  const { confirm } = useConfirmation();

  const acceptedTypes: React.ComponentProps<typeof Dropzone>['accept'] = csvContentImporter
    ? { 'application/json': ['.json'], 'application/zip': ['.zip'], 'text/csv': ['.csv'] }
    : { 'application/json': ['.json'], 'application/zip': ['.zip'] };

  const finishImport = (isCSV: boolean) => {
    onClose();
    confirm({
      title: 'Import in progress',
      // CSV imports don't send a completion email yet, so don't promise one
      prompt: isCSV
        ? `Your import is being processed, and imported posts will appear on your site as soon as it’s complete. Usually this only takes a few minutes, but larger imports may take longer.`
        : `Your import is being processed, and you'll receive a confirmation email as soon as it’s complete. Usually this only takes a few minutes, but larger imports may take longer.`,
      cancelLabel: '',
      okLabel: 'Got it',
      onOk: (confirmModal) => confirmModal?.remove(),
      formSheet: false,
    });
  };

  const importFile = async (file: File) => {
    const isCSV = csvContentImporter && file.name.toLowerCase().endsWith('.csv');
    if (isCSV) {
      setReading(true);
      try {
        const rows = await readCSV(file);
        if (rows.length === 0) {
          throw new Error('File is empty, nothing to import. Please select a different file.');
        }
        setCSVImport({
          file,
          rows,
          mapping: ContentFieldMapping.detect(columnsOf(rows)),
          sampleIndex: 0,
        });
      } catch (error) {
        handleError(error);
      } finally {
        setReading(false);
      }
      return;
    }

    setUploading(true);
    try {
      await importContent(file);
      finishImport(false);
    } catch (e) {
      handleError(e);
    } finally {
      setUploading(false);
    }
  };

  const importCSV = async () => {
    if (!csvImport) {
      return;
    }
    setUploading(true);
    try {
      await importContentCSV({ file: csvImport.file, mapping: csvImport.mapping.toJSON() });
      finishImport(true);
    } catch (error) {
      handleError(error);
    } finally {
      setUploading(false);
    }
  };

  const updateMapping = (column: string, target: string | null) => {
    setCSVImport((current) =>
      current ? { ...current, mapping: current.mapping.update(column, target) } : current,
    );
  };

  const missingTitle = csvImport !== null && !csvImport.mapping.hasTarget('title');

  const footer = csvImport ? (
    <Inline align="center" className="w-full p-8" justify="between">
      <Button
        disabled={uploading}
        type="button"
        variant="outline"
        onClick={() => setCSVImport(null)}
      >
        Start over
      </Button>
      <Inline gap="sm">
        <Button disabled={uploading} type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={uploading || missingTitle} type="button" onClick={() => void importCSV()}>
          {uploading ? 'Uploading...' : 'Import'}
        </Button>
      </Inline>
    </Inline>
  ) : (
    <Inline align="center" className="w-full p-8" justify="between">
      <a
        className="inline-flex items-center gap-1 text-green transition-colors hover:text-green-400"
        href="https://docs.ghost.org/migration/ghost"
        rel="noopener noreferrer"
        target="_blank"
      >
        Learn more
        <ExternalLink aria-hidden="true" className="size-3" />
      </a>
      <Button disabled={uploading || reading} type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
    </Inline>
  );

  return (
    <SettingsModal
      backDropClick={false}
      footer={footer}
      okLabel=""
      size={csvImport ? 'lg' : 'sm'}
      testId="universal-import-modal"
      title={csvImport ? 'Map CSV fields' : 'Universal import'}
      onClose={onClose}
    >
      <Stack className="py-4">
        {csvImport ? (
          <MappingStep
            disabled={uploading}
            mapping={csvImport.mapping}
            missingTitle={missingTitle}
            rows={csvImport.rows}
            sampleIndex={csvImport.sampleIndex}
            onMappingChange={updateMapping}
            onSampleIndexChange={(sampleIndex) =>
              setCSVImport((current) => (current ? { ...current, sampleIndex } : current))
            }
          />
        ) : (
          <Dropzone
            accept={acceptedTypes}
            inputId="import-file"
            inputTestId="import-file"
            onDropAccepted={([file]) => void importFile(file)}
          >
            <div className="text-center" data-testid="import-file-description">
              {uploading ? (
                'Uploading...'
              ) : reading ? (
                'Reading CSV...'
              ) : (
                <>
                  Select any {csvContentImporter ? 'JSON, zip or CSV' : 'JSON or zip'} file that
                  contains <br />
                  posts and settings
                </>
              )}
            </div>
          </Dropzone>
        )}
      </Stack>
    </SettingsModal>
  );
};

export default UniversalImportModal;
