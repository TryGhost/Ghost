import {MembersFieldMapping} from './mapping';

export type ImportStatus = 'INIT' | 'MAPPING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETE' | 'ERROR';

export interface ImportLabel {
    name: string;
    slug: string;
}

export interface ImportResponse {
    importedCount: number;
    errorCount: number;
    errorCsvUrl: string;
    errorCsvName: string;
    errorList: Array<{message: string; count: number}>;
    importLabel?: ImportLabel;
}

export interface ImportState {
    status: ImportStatus;
    file: File | null;
    fileData: Record<string, string>[] | null;
    mapping: MembersFieldMapping | null;
    selectedLabelSlugs: string[];
    dataPreviewIndex: number;
    mappingError: string | null;
    showMappingErrors: boolean;
    importResponse: ImportResponse | null;
    errorMessage: string | null;
    errorHeader: string;
    showTryAgainButton: boolean;
    dragOver: boolean;
    fileError: string | null;
}

export const createInitialImportState = (): ImportState => ({
    status: 'INIT',
    file: null,
    fileData: null,
    mapping: null,
    selectedLabelSlugs: [],
    dataPreviewIndex: 0,
    mappingError: null,
    showMappingErrors: false,
    importResponse: null,
    errorMessage: null,
    errorHeader: 'Import error',
    showTryAgainButton: true,
    dragOver: false,
    fileError: null
});
