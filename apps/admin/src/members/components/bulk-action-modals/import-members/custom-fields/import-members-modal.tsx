// Every step but the mapping one is shared with the baseline modal: they are the same file
// upload, progress and result screens, and nothing about custom fields reaches them.
import {CompleteStep, ErrorStep, InitStep, ProcessingStep} from '@/members/components/bulk-action-modals/import-members/components';
import {MappingStep} from '@/members/components/bulk-action-modals/import-members/custom-fields/mapping-step';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, LoadingIndicator} from '@tryghost/shade/components';
import {useDirtyConfirmation} from '@tryghost/shade/patterns';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@tryghost/shade/components';
import {HostLimitError, JSONError, RequestEntityTooLargeError, ValidationError, getErrorMessage} from '@tryghost/admin-x-framework/errors';
import {type ImportResponse} from '@/members/components/bulk-action-modals/import-members/state';
import {MembersFieldMapping, detectFieldTypes, getFieldMappings} from '@/members/components/bulk-action-modals/import-members/custom-fields/mapping';
import {fieldTargets} from '@/members/components/bulk-action-modals/import-members/custom-fields/field-targets';
import {buildImportResponse} from '@/members/components/bulk-action-modals/import-members/upload';
import {cn} from '@tryghost/shade/utils';
import {createInitialImportState, importReducer} from '@/members/components/bulk-action-modals/import-members/reducer';
import {isImportMembersCompleteResponse, useImportMembers} from '@tryghost/admin-x-framework/api/members';
import {memberCustomFieldCsvColumns, useBrowseMemberCustomFields} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {parseCSV} from '@/members/components/bulk-action-modals/import-members/csv';
import {useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState} from 'react';
import {useFeatureFlag} from '@tryghost/admin-x-framework/hooks';
import {useLabelPicker} from '@/members/hooks/use-label-picker';

interface ImportMembersModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete?: (importResponse?: ImportResponse) => void;
    onClose?: (importResponse?: ImportResponse) => void;
}

export function ImportMembersModal({
    open,
    onOpenChange,
    onComplete,
    onClose
}: ImportMembersModalProps) {
    const [state, dispatch] = useReducer(importReducer, undefined, createInitialImportState);
    const errorCsvUrlRef = useRef<string | null>(null);
    const {mutateAsync: importMembers} = useImportMembers();
    const importMemberTier = useFeatureFlag('importMemberTier');

    // Defined custom fields become mapping targets. Browse returns active fields only, which
    // are the ones the importer writes to. No flag check anywhere in this file: the gate does
    // not render it unless membersCustomFields is on.
    const {data: customFieldsData, isError: customFieldsFailed} = useBrowseMemberCustomFields();
    // A field created from the mapping step is in here the moment it is created: the create
    // mutation puts it into the cached list, so there is no window where a row points at a
    // column the picker cannot name yet.
    const customFieldColumns = useMemo(
        () => memberCustomFieldCsvColumns(customFieldsData?.members_custom_fields ?? []),
        [customFieldsData]
    );
    // The file-reader effect waits for this before its first parse: the custom field
    // definitions must be loaded or auto-detection would miss custom_fields.* columns on a
    // fast upload. It flips false -> true once and stays true (a refetch keeps data defined),
    // so readiness never re-triggers the read.
    // Ready, or never going to be. A failure has no representation in `data`, so waiting on it
    // alone leaves the file unparsed and the step on a spinner with nothing said — for a query
    // whose only job is to add targets to a list. Failing it costs the custom fields; blocking
    // on it costs the import.
    const customFieldsReady = customFieldsData !== undefined || customFieldsFailed;
    // Detection options are read inside the effect through this ref rather than as deps, so
    // a later refetch of the options can't re-run the read and overwrite a mapping the user
    // has begun editing.
    const detectOptionsRef = useRef({importMemberTier, customFieldColumns});
    // Assigned in an effect rather than during render: a ref written while rendering can tear
    // if a render is thrown away, and the read below happens after paint either way.
    useLayoutEffect(() => {
        detectOptionsRef.current = {importMemberTier, customFieldColumns};
    }, [importMemberTier, customFieldColumns]);
    // Auto-detection takes customFieldColumns separately, through detectOptionsRef above: it
    // matches on column names rather than on what is offered.
    const targets = useMemo(
        () => fieldTargets({
            membershipFields: getFieldMappings({importMemberTier}),
            customFieldColumns
        }),
        [importMemberTier, customFieldColumns]
    );

    // Whether email is mapped is the mapping step's to answer, because it is the only thing
    // that knows which columns are actually in the import — a second answer here could
    // disagree, which is how a mapped-but-deselected email column would pass.
    const labelPicker = useLabelPicker({
        selectedSlugs: state.selectedLabelSlugs,
        onSelectionChange: (slugs: string[]) => {
            setHasEdits(true);
            dispatch({type: 'SET_SELECTED_LABEL_SLUGS', selectedLabelSlugs: slugs});
        }
    });

    const revokeErrorCsvUrl = useCallback(() => {
        if (errorCsvUrlRef.current && typeof URL.revokeObjectURL === 'function') {
            URL.revokeObjectURL(errorCsvUrlRef.current);
            errorCsvUrlRef.current = null;
        } else if (errorCsvUrlRef.current) {
            errorCsvUrlRef.current = null;
        }
    }, []);

    const reset = useCallback(() => {
        revokeErrorCsvUrl();
        // The modal is never unmounted (members-actions keeps it mounted and toggles `open`),
        // so anything held outside the reducer outlives Start over unless it is cleared here.
        setHasEdits(false);
        dispatch({type: 'RESET'});
    }, [revokeErrorCsvUrl]);

    useEffect(() => {
        return () => {
            revokeErrorCsvUrl();
        };
    }, [revokeErrorCsvUrl]);

    // Escape and a click on the backdrop stay as they are — they are how a dialog is dismissed
    // and taking them away costs more than it saves. What they must not do is silently discard
    // a mapped file: which columns are in, what each fills, the labels chosen. So dismissal
    // asks first, using the same confirmation the settings modals use.
    const {confirm, dialogProps} = useDirtyConfirmation();
    // Whether anything would actually be lost by leaving. A file that has only been parsed is
    // not worth asking about: re-uploading it reproduces the same detected mapping. What cannot
    // be reproduced is what the publisher changed since, so that is what this tracks.
    const [hasEdits, setHasEdits] = useState(false);

    const handleOpenChange = useCallback((isOpen: boolean) => {
        if (!isOpen && state.status === 'UPLOADING') {
            return;
        }
        if (!isOpen) {
            // Only the mapping step holds anything: every other one is either empty or shows a
            // result that closing is the natural end of.
            confirm(state.status === 'MAPPING' && hasEdits, () => {
                const importResponse = state.importResponse ?? undefined;
                reset();
                onClose?.(importResponse);
                onOpenChange(false);
            });
            return;
        }
        onOpenChange(isOpen);
    }, [confirm, hasEdits, onClose, onOpenChange, reset, state.importResponse, state.status]);

    useEffect(() => {
        if (!state.file || !customFieldsReady) {
            return;
        }

        let ignoreReaderEvents = false;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (ignoreReaderEvents) {
                return;
            }
            try {
                const text = e.target?.result as string;
                const data = parseCSV(text);

                if (data.length > 0) {
                    const detectedMapping = detectFieldTypes(data, detectOptionsRef.current);
                    const fieldMapping = new MembersFieldMapping(detectedMapping);

                    dispatch({
                        type: 'PARSE_SUCCESS',
                        fileData: data,
                        mapping: fieldMapping,
                        mappingError: null
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
            if (ignoreReaderEvents) {
                return;
            }
            dispatch({
                type: 'PARSE_FAILURE',
                mappingError: `Failed to read file${reader.error?.message ? `: ${reader.error.message}` : ''}`
            });
        };
        reader.onabort = () => {
            if (ignoreReaderEvents) {
                return;
            }
            dispatch({
                type: 'PARSE_FAILURE',
                mappingError: 'File read was interrupted. Please try again.'
            });
        };
        reader.readAsText(state.file);

        return () => {
            ignoreReaderEvents = true;
            if (reader.readyState === FileReader.LOADING) {
                reader.abort();
            }
        };
    }, [state.file, customFieldsReady]);

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

        setHasEdits(true);

        const nextMapping = state.mapping.updateMapping(from, to);
        const nextError = state.fileData && state.fileData.length === 0
            ? 'File is empty, nothing to import. Please select a different file.'
            : null;

        dispatch({
            type: 'UPDATE_MAPPING',
            mapping: nextMapping,
            mappingError: nextError
        });
    }, [state.fileData, state.mapping]);

    // The row maps onto the column the form resolved — or onto nothing yet, for a composite,
    // whose parts are all candidates and whose choice the mapping step asks in the picker.
    // Either way the field joins the targets, so the other columns of a composite can be
    // mapped by hand: guessing which of them holds a postcode is how data ends up in the
    // wrong part.
    //
    // Nothing else is re-detected: a mapping already edited stays as they left it.
    const handleFieldCreated = useCallback((columnKey: string, column: string | null) => {
        if (column) {
            handleUpdateMapping(columnKey, column);
        }
    }, [handleUpdateMapping]);

    const handleUpload = useCallback(async (importMapping: Record<string, string | null>) => {
        if (!state.file || state.mappingError) {
            dispatch({type: 'SET_SHOW_MAPPING_ERRORS', showMappingErrors: true});
            return;
        }

        dispatch({type: 'UPLOAD_START'});

        const selectedLabelNames: string[] = [];
        for (const slug of state.selectedLabelSlugs) {
            const label = labelPicker.labels.find(l => l.slug === slug);
            if (label) {
                selectedLabelNames.push(label.name);
            }
        }

        try {
            // Sent as given. The mapping step composes it from the mapping and what is in the
            // import, which is knowledge this modal does not have and must not second-guess.
            const importData = await importMembers({
                file: state.file,
                labels: selectedLabelNames,
                mapping: importMapping
            });

            if (isImportMembersCompleteResponse(importData)) {
                const importResponse = buildImportResponse(importData);
                revokeErrorCsvUrl();
                errorCsvUrlRef.current = importResponse.errorCsvUrl;

                dispatch({
                    type: 'UPLOAD_COMPLETE',
                    importResponse
                });
                onComplete?.(importResponse);
                return;
            }

            // Per the upload API contract a 2xx response is either complete (handled
            // above) or accepted for background processing; importMembers() has already
            // thrown for any error status.
            dispatch({type: 'UPLOAD_ACCEPTED'});
            onComplete?.();
        } catch (error) {
            if (error instanceof RequestEntityTooLargeError) {
                dispatch({
                    type: 'UPLOAD_ERROR',
                    errorMessage: 'The file you uploaded was larger than the maximum file size your server allows.'
                });
                return;
            }

            const apiError = error instanceof JSONError ? error.data?.errors?.[0] : null;

            if (error instanceof HostLimitError && apiError?.code === 'EMAIL_VERIFICATION_NEEDED') {
                dispatch({
                    type: 'UPLOAD_ERROR',
                    errorMessage: getErrorMessage(error, error.message),
                    errorHeader: 'Woah there cowboy, that\'s a big list',
                    showTryAgainButton: false
                });
                onComplete?.();
                return;
            }

            if (error instanceof ValidationError || apiError?.type === 'DataImportError') {
                dispatch({
                    type: 'UPLOAD_ERROR',
                    errorMessage: getErrorMessage(error, error instanceof Error ? error.message : 'An unexpected error occurred, please try again')
                });
                return;
            }

            dispatch({
                type: 'UPLOAD_ERROR',
                errorMessage: 'An unexpected error occurred, please try again'
            });
        }
    }, [
        state.file,
        state.mappingError,
        state.selectedLabelSlugs,
        labelPicker.labels,
        importMembers,
        revokeErrorCsvUrl,
        onComplete
    ]);

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
            {/* The mapping table needs the extra width only when it carries the kind
                column; without it the dialog stays the size it has always been.
                While mapping, the dialog is also bounded to the viewport and laid out
                as a column, so the table can take the leftover height and the footer
                is always reachable. 8vmin matches the dialog's own top offset. */}
            <DialogContent className={cn(
                'gap-0',
                isWide && 'max-w-4xl',
                isWide && 'flex max-h-[calc(100vh-16vmin)] flex-col'
            )}>
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

            {/* Still parsing: the step is handed a file that has been read, so waiting for one
                is the container's business and never reaches the table. A parse that failed
                gives an empty set rather than none, so the step still renders to say so. */}
            {(state.status === 'MAPPING' || state.status === 'UPLOADING') && state.fileData === null && (
                <div className="flex items-center justify-center rounded-md border bg-muted p-10">
                    <LoadingIndicator size="md" />
                </div>
            )}

            {(state.status === 'MAPPING' || state.status === 'UPLOADING') && state.fileData !== null && (
                <MappingStep
                    dataPreviewIndex={state.dataPreviewIndex}
                    fileData={state.fileData}
                    labelPicker={labelPicker}
                    mapping={state.mapping}
                    mappingError={state.mappingError}
                    showMappingErrors={state.showMappingErrors}
                    status={state.status}
                    targets={targets}
                    onColumnsChanged={() => setHasEdits(true)}
                    onDataPreviewIndexChange={(nextIndex) => {
                        dispatch({
                            type: 'SET_DATA_PREVIEW_INDEX',
                            dataPreviewIndex: nextIndex
                        });
                    }}
                    onFieldCreated={handleFieldCreated}
                    onStartOver={reset}
                    onUpdateMapping={handleUpdateMapping}
                    onUpload={importMapping => void handleUpload(importMapping)}
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
        {/* Worded and shaped as the member detail's leave guard is (member-detail.tsx:480-494),
            which is the same question a screen away: Shade's DirtyConfirmDialog says Stay/Leave
            and talks about saving, and neither fits a members screen or an import that has
            nothing to save. Its controller is still what decides whether to ask.

            The cancel label names what the publisher goes back to, as the member detail's "Keep
            editing" and the automations editor's "Keep working" do — which here is mapping.

            Raised above the import dialog it interrupts, which owns z-50. */}
        <AlertDialog open={dialogProps.open} onOpenChange={dialogProps.onOpenChange}>
            {/* Escape closes the guard and nothing else: without this it reaches the import
                dialog underneath and closes the very thing the guard is asking about. */}
            <AlertDialogContent className="z-[1100]" data-testid="import-members-leave-guard" overlayClassName="z-[1100]" onEscapeKeyDown={event => event.stopPropagation()}>
                <AlertDialogHeader>
                    {/* Not "unsaved changes": nothing here is saved or savable, so there is no
                        such state to be in. Nor "discard this import" — no import exists yet to
                        be discarded. The title names the act the buttons perform, and the line
                        below says what it costs without repeating it. */}
                    <AlertDialogTitle>Leave without importing?</AlertDialogTitle>
                    <AlertDialogDescription>The columns you have mapped will be lost.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep mapping</AlertDialogCancel>
                    <Button variant="destructive" onClick={dialogProps.onConfirm}>Leave</Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </Dialog>
    );
}
