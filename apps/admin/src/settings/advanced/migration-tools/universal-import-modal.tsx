import React, { useState } from 'react';
import { Button, Dropzone, Link } from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { SettingsModal } from '@tryghost/shade/patterns';
import { toast } from 'sonner';
import { useConfirmation } from '@/settings/providers/confirmation-context';
import { useFeatureFlag, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useImportContent } from '@tryghost/admin-x-framework/api/db';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import {
  useCancelContentCSV,
  useImportContentCSV,
  useInspectContentCSV,
} from '@tryghost/admin-x-framework/api/posts';
import { JSONError } from '@tryghost/admin-x-framework/errors';
import { ContentFieldMapping } from './content-import/mapping';
import { MappingStep } from './content-import/mapping-step';
import { columnsOf, parseCSV, readCSV } from './content-import/csv';
import { ImportArchiveError, inspectImportArchive } from './content-import/archive';

interface CSVImportState {
  source: { file: File } | { uploadId: string };
  rows: Record<string, string>[];
  mapping: ContentFieldMapping;
  sampleIndex: number;
}

const UniversalImportModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { mutateAsync: importContent } = useImportContent();
  const { mutateAsync: importContentCSV } = useImportContentCSV();
  const { mutateAsync: inspectContentCSV } = useInspectContentCSV();
  const { mutateAsync: cancelContentCSV } = useCancelContentCSV();
  const { data: config } = useBrowseConfig();
  const csvContentImporter = useFeatureFlag('csvContentImporter');
  const [uploading, setUploading] = useState(false);
  const [reading, setReading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const busy = uploading || reading || cancelling;
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
    if (busy) {
      return;
    }
    const isCSV = csvContentImporter && file.name.toLowerCase().endsWith('.csv');
    const isZIP = csvContentImporter && file.name.toLowerCase().endsWith('.zip');
    if (isCSV || isZIP) {
      setReading(true);
      try {
        if (config?.config.contentImport?.stagedInspection) {
          const { meta } = await inspectContentCSV(file);
          if (!meta?.upload_id) {
            finishImport(false);
            return;
          }
          setCSVImport({
            source: { uploadId: meta.upload_id },
            rows: meta.rows,
            mapping: ContentFieldMapping.detect(meta.columns),
            sampleIndex: 0,
          });
          return;
        }
        let rows: Record<string, string>[];
        if (isZIP) {
          const contents = await inspectImportArchive(file);
          if (contents.type === 'legacy') {
            setReading(false);
            setUploading(true);
            try {
              await importContent(file);
              finishImport(false);
            } finally {
              setUploading(false);
            }
            return;
          }
          rows = parseCSV(contents.csv);
        } else {
          rows = await readCSV(file);
        }
        if (rows.length === 0) {
          throw new Error('File is empty, nothing to import. Please select a different file.');
        }
        setCSVImport({
          source: { file },
          rows,
          mapping: ContentFieldMapping.detect(columnsOf(rows)),
          sampleIndex: 0,
        });
      } catch (error) {
        if (error instanceof ImportArchiveError) {
          toast.error(error.message);
        } else {
          handleError(error);
        }
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
    if (!csvImport || busy) {
      return;
    }
    setUploading(true);
    try {
      await importContentCSV({ ...csvImport.source, mapping: csvImport.mapping.toJSON() });
      finishImport(true);
    } catch (error) {
      if (
        error instanceof JSONError &&
        error.data?.errors[0]?.code === 'CSV_IMPORT_SUBMISSION_UNCERTAIN'
      ) {
        // We cannot safely cancel or retry a confirmation whose acceptance is unknown.
        setCSVImport(null);
      }
      handleError(error);
    } finally {
      setUploading(false);
    }
  };

  const resetImport = async (close: boolean) => {
    if (busy) {
      return;
    }
    try {
      if (csvImport && 'uploadId' in csvImport.source) {
        setCancelling(true);
        await cancelContentCSV(csvImport.source.uploadId);
      }
    } catch (error) {
      handleError(error);
    } finally {
      setCancelling(false);
      setCSVImport(null);
      if (close) {
        onClose();
      }
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
        disabled={busy}
        type="button"
        variant="outline"
        onClick={() => void resetImport(false)}
      >
        Start over
      </Button>
      <Inline gap="sm">
        <Button
          disabled={busy}
          type="button"
          variant="outline"
          onClick={() => void resetImport(true)}
        >
          Cancel
        </Button>
        <Button disabled={busy || missingTitle} type="button" onClick={() => void importCSV()}>
          {uploading ? 'Uploading...' : 'Import'}
        </Button>
      </Inline>
    </Inline>
  ) : (
    <Inline align="center" className="w-full p-8" justify="between">
      <Link href="https://docs.ghost.org/migration/ghost" external>
        Learn more
      </Link>
      <Button disabled={busy} type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
    </Inline>
  );

  return (
    <SettingsModal
      footer={footer}
      okLabel=""
      size={csvImport ? 'lg' : 'sm'}
      testId="universal-import-modal"
      title={csvImport ? 'Map CSV fields' : 'Universal import'}
      onClose={() => void resetImport(true)}
    >
      <Stack className="py-4">
        {csvImport ? (
          <MappingStep
            disabled={busy}
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
                'Reading import file...'
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
