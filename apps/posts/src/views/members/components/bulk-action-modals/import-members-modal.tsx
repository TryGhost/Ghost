import {CompleteStep, ErrorStep, InitStep, MappingStep, ProcessingStep} from './import-members/components';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, cn} from '@tryghost/shade';
import {Label} from '@tryghost/admin-x-framework/api/labels';
import {MembersFieldMapping, detectFieldTypes} from './import-members/mapping';
import {buildImportResponse} from './import-members/upload';
import {createInitialImportState, importReducer} from './import-members/reducer';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {parseCSV} from './import-members/csv';
import {useCallback, useEffect, useMemo, useReducer, useRef} from 'react';

interface ImportMembersModalProps {
    open: boolean;
    labels: Label[];
    onOpenChange: (open: boolean) => void;
    onComplete?: () => void;
}

export function ImportMembersModal({
    open,
    labels,
    onOpenChange,
    onComplete
}: ImportMembersModalProps) {
    const [state, dispatch] = useReducer(importReducer, undefined, createInitialImportState);
    const errorCsvUrlRef = useRef<string | null>(null);

    const revokeErrorCsvUrl = useCallback(() => {
        if (errorCsvUrlRef.current) {
            URL.revokeObjectURL(errorCsvUrlRef.current);
            errorCsvUrlRef.current = null;
        }
    }, []);

    const reset = useCallback(() => {
        revokeErrorCsvUrl();
        dispatch({type: 'RESET'});
    }, [revokeErrorCsvUrl]);

    useEffect(() => {
        return () => {
            revokeErrorCsvUrl();
        };
    }, [revokeErrorCsvUrl]);

    const handleOpenChange = useCallback((isOpen: boolean) => {
        if (!isOpen && state.status === 'UPLOADING') {
            return;
        }
        if (!isOpen) {
            reset();
        }
        onOpenChange(isOpen);
    }, [onOpenChange, reset, state.status]);

    useEffect(() => {
        if (!state.file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const data = parseCSV(text);

                if (data.length > 0) {
                    const detectedMapping = detectFieldTypes(data);
                    const fieldMapping = new MembersFieldMapping(detectedMapping);

                    dispatch({
                        type: 'PARSE_SUCCESS',
                        fileData: data,
                        mapping: fieldMapping,
                        mappingError: fieldMapping.getKeyByValue('email')
                            ? null
                            : 'Please map "Email" to one of the fields in the CSV.'
                    });
                } else {
                    dispatch({
                        type: 'PARSE_SUCCESS',
                        fileData: [],
                        mapping: null,
                        mappingError: 'File is empty, nothing to import. Please select a different file.'
                    });
                }
            } catch {
                dispatch({
                    type: 'PARSE_FAILURE',
                    mappingError: 'Failed to parse this file. Please try another CSV file.'
                });
            }
        };
        reader.onerror = () => {
            dispatch({
                type: 'PARSE_FAILURE',
                mappingError: `Failed to read file${reader.error?.message ? `: ${reader.error.message}` : ''}`
            });
        };
        reader.onabort = () => {
            dispatch({
                type: 'PARSE_FAILURE',
                mappingError: 'File read was interrupted. Please try again.'
            });
        };
        reader.readAsText(state.file);

        return () => {
            if (reader.readyState === FileReader.LOADING) {
                reader.abort();
            }
        };
    }, [state.file]);

    const validateFile = useCallback((file: File): boolean => {
        const match = /(?:\.([^.]+))?$/.exec(file.name);
        const extension = match?.[1];
        if (!extension || extension.toLowerCase() !== 'csv') {
            dispatch({
                type: 'SET_FILE_ERROR',
                fileError: 'The file type you uploaded is not supported'
            });
            return false;
        }
        dispatch({type: 'SET_FILE_ERROR', fileError: null});
        return true;
    }, []);

    const handleFileSelected = useCallback((file: File) => {
        if (validateFile(file)) {
            dispatch({type: 'SELECT_FILE', file});
        }
    }, [validateFile]);

    const handleUpdateMapping = useCallback((from: string, to: string | null) => {
        if (!state.mapping) {
            return;
        }

        const nextMapping = state.mapping.updateMapping(from, to);
        const nextError = state.fileData && state.fileData.length === 0
            ? 'File is empty, nothing to import. Please select a different file.'
            : !nextMapping.getKeyByValue('email')
                ? 'Please map "Email" to one of the fields in the CSV.'
                : null;

        dispatch({
            type: 'UPDATE_MAPPING',
            mapping: nextMapping,
            mappingError: nextError
        });
    }, [state.fileData, state.mapping]);

    const handleUpload = useCallback(async () => {
        if (!state.file || state.mappingError) {
            dispatch({type: 'SET_SHOW_MAPPING_ERRORS', showMappingErrors: true});
            return;
        }

        dispatch({type: 'UPLOAD_START'});

        const formData = new FormData();
        formData.append('membersfile', state.file);
        state.selectedLabels.forEach((labelName) => {
            formData.append('labels', labelName);
        });

        if (state.mapping) {
            const mappingJSON = state.mapping.toJSON();
            for (const [key, val] of Object.entries(mappingJSON)) {
                if (val) {
                    formData.append(`mapping[${key}]`, val);
                }
            }
        }

        try {
            const {apiRoot} = getGhostPaths();
            const response = await fetch(`${apiRoot}/members/upload/`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
                mode: 'cors',
                headers: {
                    'app-pragma': 'no-cache'
                }
            });

            if (response.status === 202) {
                dispatch({type: 'UPLOAD_ACCEPTED'});
                onComplete?.();
                return;
            }

            if (response.status === 413) {
                dispatch({
                    type: 'UPLOAD_ERROR',
                    errorMessage: 'The file you uploaded was larger than the maximum file size your server allows.'
                });
                return;
            }

            if (!response.ok) {
                const data = await response.json();
                const err = data?.errors?.[0];

                if (err?.type === 'HostLimitError' && err?.code === 'EMAIL_VERIFICATION_NEEDED') {
                    dispatch({
                        type: 'UPLOAD_ERROR',
                        errorMessage: err.message,
                        errorHeader: 'Woah there cowboy, that\'s a big list',
                        showTryAgainButton: false
                    });
                    onComplete?.();
                    return;
                }

                if (err?.type === 'DataImportError' || err?.type === 'ValidationError') {
                    dispatch({
                        type: 'UPLOAD_ERROR',
                        errorMessage: err.message
                    });
                    return;
                }

                dispatch({
                    type: 'UPLOAD_ERROR',
                    errorMessage: 'An unexpected error occurred, please try again'
                });
                return;
            }

            const importData = await response.json();
            const importResponse = buildImportResponse(importData);
            revokeErrorCsvUrl();
            errorCsvUrlRef.current = importResponse.errorCsvUrl;

            dispatch({
                type: 'UPLOAD_COMPLETE',
                importResponse
            });
            onComplete?.();
        } catch {
            dispatch({
                type: 'UPLOAD_ERROR',
                errorMessage: 'An unexpected error occurred, please try again'
            });
        }
    }, [
        state.file,
        state.mapping,
        state.mappingError,
        state.selectedLabels,
        revokeErrorCsvUrl,
        onComplete
    ]);

    const hasNextRecord = state.fileData ? !!state.fileData[state.dataPreviewIndex + 1] : false;
    const hasPrevRecord = state.dataPreviewIndex > 0;
    const membersCount = state.fileData?.length ?? 0;
    const isWide = state.status === 'MAPPING' || state.status === 'UPLOADING';

    const title = useMemo(() => {
        switch (state.status) {
        case 'PROCESSING':
            return 'Import in progress';
        case 'COMPLETE':
            return 'Import complete';
        case 'ERROR':
            return state.errorHeader;
        default:
            return 'Import members';
        }
    }, [state.errorHeader, state.status]);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className={cn('gap-0', isWide && 'max-w-2xl')}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Import members from a CSV file.
                    </DialogDescription>
                </DialogHeader>

                {state.status === 'INIT' && (
                    <InitStep
                        fileError={state.fileError}
                        onClose={() => handleOpenChange(false)}
                        onDropAccepted={handleFileSelected}
                        onDropRejected={() => dispatch({
                            type: 'SET_FILE_ERROR',
                            fileError: 'The file type you uploaded is not supported'
                        })}
                    />
                )}

                {(state.status === 'MAPPING' || state.status === 'UPLOADING') && (
                    <MappingStep
                        dataPreviewIndex={state.dataPreviewIndex}
                        fileData={state.fileData}
                        hasNextRecord={hasNextRecord}
                        hasPrevRecord={hasPrevRecord}
                        labels={labels}
                        mapping={state.mapping}
                        mappingError={state.mappingError}
                        membersCount={membersCount}
                        selectedLabels={state.selectedLabels}
                        showMappingErrors={state.showMappingErrors}
                        status={state.status}
                        onDataPreviewIndexChange={(nextIndex) => {
                            dispatch({
                                type: 'SET_DATA_PREVIEW_INDEX',
                                dataPreviewIndex: nextIndex
                            });
                        }}
                        onSelectLabels={(selectedLabels) => {
                            dispatch({type: 'SET_SELECTED_LABELS', selectedLabels});
                        }}
                        onStartOver={reset}
                        onUpdateMapping={handleUpdateMapping}
                        onUpload={handleUpload}
                    />
                )}

                {state.status === 'PROCESSING' && (
                    <ProcessingStep
                        onClose={() => handleOpenChange(false)}
                        onUploadAnotherFile={reset}
                    />
                )}

                {state.status === 'COMPLETE' && state.importResponse && (
                    <CompleteStep
                        importResponse={state.importResponse}
                        onClose={() => handleOpenChange(false)}
                        onReset={reset}
                    />
                )}

                {state.status === 'ERROR' && (
                    <ErrorStep
                        errorMessage={state.errorMessage}
                        showTryAgainButton={state.showTryAgainButton}
                        onClose={() => handleOpenChange(false)}
                        onTryAgain={reset}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
