import {ImportResponse, ImportState, createInitialImportState} from './state';
import {MembersFieldMapping} from './mapping';

export type ImportAction =
    | {type: 'SELECT_FILE'; file: File}
    | {type: 'SET_FILE_ERROR'; fileError: string | null}
    | {type: 'PARSE_SUCCESS'; fileData: Record<string, string>[]; mapping: MembersFieldMapping | null; mappingError: string | null}
    | {type: 'PARSE_FAILURE'; mappingError: string}
    | {type: 'UPDATE_MAPPING'; mapping: MembersFieldMapping | null; mappingError: string | null}
    | {type: 'SET_SELECTED_LABEL_SLUGS'; selectedLabelSlugs: string[]}
    | {type: 'SET_DATA_PREVIEW_INDEX'; dataPreviewIndex: number}
    | {type: 'SET_SHOW_MAPPING_ERRORS'; showMappingErrors: boolean}
    | {type: 'SET_DRAG_OVER'; dragOver: boolean}
    | {type: 'UPLOAD_START'}
    | {type: 'UPLOAD_ACCEPTED'}
    | {type: 'UPLOAD_COMPLETE'; importResponse: ImportResponse}
    | {type: 'UPLOAD_ERROR'; errorMessage: string; errorHeader?: string; showTryAgainButton?: boolean}
    | {type: 'RESET'};

export function importReducer(state: ImportState, action: ImportAction): ImportState {
    switch (action.type) {
    case 'SELECT_FILE':
        return {
            ...state,
            status: 'MAPPING',
            file: action.file,
            fileData: null,
            mapping: null,
            dataPreviewIndex: 0,
            mappingError: null,
            showMappingErrors: false,
            fileError: null
        };
    case 'SET_FILE_ERROR':
        return {
            ...state,
            fileError: action.fileError
        };
    case 'PARSE_SUCCESS':
        return {
            ...state,
            fileData: action.fileData,
            mapping: action.mapping,
            mappingError: action.mappingError
        };
    case 'PARSE_FAILURE':
        return {
            ...state,
            fileData: [],
            mapping: null,
            mappingError: action.mappingError
        };
    case 'UPDATE_MAPPING':
        return {
            ...state,
            mapping: action.mapping,
            mappingError: action.mappingError
        };
    case 'SET_SELECTED_LABEL_SLUGS':
        return {
            ...state,
            selectedLabelSlugs: action.selectedLabelSlugs
        };
    case 'SET_DATA_PREVIEW_INDEX':
        return {
            ...state,
            dataPreviewIndex: action.dataPreviewIndex
        };
    case 'SET_SHOW_MAPPING_ERRORS':
        return {
            ...state,
            showMappingErrors: action.showMappingErrors
        };
    case 'SET_DRAG_OVER':
        return {
            ...state,
            dragOver: action.dragOver
        };
    case 'UPLOAD_START':
        return {
            ...state,
            status: 'UPLOADING',
            showMappingErrors: false
        };
    case 'UPLOAD_ACCEPTED':
        return {
            ...state,
            status: 'PROCESSING'
        };
    case 'UPLOAD_COMPLETE':
        return {
            ...state,
            status: 'COMPLETE',
            importResponse: action.importResponse
        };
    case 'UPLOAD_ERROR':
        return {
            ...state,
            status: 'ERROR',
            errorMessage: action.errorMessage,
            errorHeader: action.errorHeader ?? 'Import error',
            showTryAgainButton: action.showTryAgainButton ?? true
        };
    case 'RESET':
        return createInitialImportState();
    default:
        return state;
    }
}

export {createInitialImportState};
