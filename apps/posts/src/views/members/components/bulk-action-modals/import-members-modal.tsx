import React, {useCallback, useEffect, useRef, useState} from 'react';
import moment from 'moment-timezone';
import {
    Banner,
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    LoadingIndicator,
    LucideIcon,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    cn
} from '@tryghost/shade';
import {
    FIELD_MAPPINGS,
    MembersFieldMapping,
    detectFieldTypes,
    formatImportError,
    parseCSV,
    unparseErrorCSV
} from './import-members/field-mapping';
import {Label} from '@tryghost/admin-x-framework/api/labels';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';

type ImportState = 'INIT' | 'MAPPING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETE' | 'ERROR';

interface ImportResponse {
    importedCount: number;
    errorCount: number;
    errorCsvUrl: string;
    errorCsvName: string;
    errorList: Array<{message: string; count: number}>;
}

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
    const [state, setState] = useState<ImportState>('INIT');
    const [file, setFile] = useState<File | null>(null);
    const [fileData, setFileData] = useState<Record<string, string>[] | null>(null);
    const [mapping, setMapping] = useState<MembersFieldMapping | null>(null);
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const [dataPreviewIndex, setDataPreviewIndex] = useState(0);
    const [mappingError, setMappingError] = useState<string | null>(null);
    const [showMappingErrors, setShowMappingErrors] = useState(false);
    const [importResponse, setImportResponse] = useState<ImportResponse | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errorHeader, setErrorHeader] = useState('Import error');
    const [showTryAgainButton, setShowTryAgainButton] = useState(true);
    const [dragOver, setDragOver] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = useCallback(() => {
        setState('INIT');
        setFile(null);
        setFileData(null);
        setMapping(null);
        setSelectedLabels([]);
        setDataPreviewIndex(0);
        setMappingError(null);
        setShowMappingErrors(false);
        setImportResponse(null);
        setErrorMessage(null);
        setErrorHeader('Import error');
        setShowTryAgainButton(true);
        setDragOver(false);
        setFileError(null);
    }, []);

    const handleOpenChange = useCallback((isOpen: boolean) => {
        if (!isOpen && state === 'UPLOADING') {
            return; // Don't allow closing during upload
        }
        if (!isOpen) {
            reset();
        }
        onOpenChange(isOpen);
    }, [onOpenChange, reset, state]);

    // Parse CSV when file is selected
    useEffect(() => {
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const data = parseCSV(text);
            setFileData(data);

            if (data.length > 0) {
                const detectedMapping = detectFieldTypes(data);
                const fieldMapping = new MembersFieldMapping(detectedMapping);
                setMapping(fieldMapping);

                // Validate mapping
                if (!fieldMapping.getKeyByValue('email')) {
                    setMappingError('Please map "Email" to one of the fields in the CSV.');
                } else {
                    setMappingError(null);
                }
            } else {
                setMappingError('File is empty, nothing to import. Please select a different file.');
            }
        };
        reader.readAsText(file);
    }, [file]);

    const validateFile = useCallback((f: File): boolean => {
        const match = /(?:\.([^.]+))?$/.exec(f.name);
        const extension = match?.[1];
        if (!extension || extension.toLowerCase() !== 'csv') {
            setFileError('The file type you uploaded is not supported');
            return false;
        }
        setFileError(null);
        return true;
    }, []);

    const handleFileSelected = useCallback((selectedFile: File) => {
        if (validateFile(selectedFile)) {
            setFile(selectedFile);
            setState('MAPPING');
        }
    }, [validateFile]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFileSelected(selectedFile);
        }
    }, [handleFileSelected]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            handleFileSelected(droppedFile);
        }
    }, [handleFileSelected]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handleUpdateMapping = useCallback((from: string, to: string | null) => {
        if (!mapping) {
            return;
        }

        const newMapping = mapping.updateMapping(from, to);
        setMapping(newMapping);

        // Re-validate
        if (fileData && fileData.length === 0) {
            setMappingError('File is empty, nothing to import. Please select a different file.');
        } else if (!newMapping.getKeyByValue('email')) {
            setMappingError('Please map "Email" to one of the fields in the CSV.');
        } else {
            setMappingError(null);
        }
    }, [mapping, fileData]);

    const handleUpload = useCallback(async () => {
        if (!file || mappingError) {
            setShowMappingErrors(true);
            return;
        }

        setShowMappingErrors(false);
        setState('UPLOADING');

        const formData = new FormData();
        formData.append('membersfile', file);

        // Add labels
        selectedLabels.forEach((labelName) => {
            formData.append('labels', labelName);
        });

        // Add mapping
        if (mapping) {
            const mappingJSON = mapping.toJSON();
            for (const [key, val] of Object.entries(mappingJSON)) {
                if (val) {
                    formData.append(`mapping[${key}]`, val);
                }
            }
        }

        try {
            const {apiRoot} = getGhostPaths();
            const url = `${apiRoot}/members/upload/`;

            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                credentials: 'include',
                mode: 'cors',
                headers: {
                    'app-pragma': 'no-cache'
                }
            });

            if (response.status === 202) {
                setState('PROCESSING');
                onComplete?.();
                return;
            }

            if (response.status === 413) {
                setErrorMessage('The file you uploaded was larger than the maximum file size your server allows.');
                setErrorHeader('Import error');
                setState('ERROR');
                return;
            }

            if (!response.ok) {
                const data = await response.json();
                const err = data?.errors?.[0];

                if (err?.type === 'HostLimitError' && err?.code === 'EMAIL_VERIFICATION_NEEDED') {
                    setErrorMessage(err.message);
                    setErrorHeader('Woah there cowboy, that\'s a big list');
                    setShowTryAgainButton(false);
                    setState('ERROR');
                    onComplete?.();
                    return;
                }

                if (err?.type === 'DataImportError' || err?.type === 'ValidationError') {
                    setErrorMessage(err.message);
                    setErrorHeader('Import error');
                    setState('ERROR');
                    return;
                }

                setErrorMessage('An unexpected error occurred, please try again');
                setErrorHeader('Import error');
                setState('ERROR');
                return;
            }

            const importData = await response.json();
            const importedCount = importData.meta.stats.imported;
            const erroredMembers = importData.meta.stats.invalid || [];
            const errorCount = erroredMembers.length;
            const errorListMap: Record<string, {message: string; count: number}> = {};

            const errorsWithFormattedMessages = erroredMembers.map((row: Record<string, string> & {error: string}) => {
                const formattedError = formatImportError(row.error);
                formattedError.split(',').forEach((errorMsg: string) => {
                    const trimmed = errorMsg.trim();
                    if (errorListMap[trimmed]) {
                        errorListMap[trimmed].count += 1;
                    } else {
                        errorListMap[trimmed] = {message: trimmed, count: 1};
                    }
                });
                return {...row, error: formattedError};
            });

            const errorCsv = unparseErrorCSV(errorsWithFormattedMessages);
            const errorCsvBlob = new Blob([errorCsv], {type: 'text/csv'});
            const errorCsvUrl = URL.createObjectURL(errorCsvBlob);
            const importLabel = importData.meta.import_label;
            const errorCsvName = importLabel
                ? `${importLabel.name} - Errors.csv`
                : `Import ${moment().format('YYYY-MM-DD HH:mm')} - Errors.csv`;

            setImportResponse({
                importedCount,
                errorCount,
                errorCsvUrl,
                errorCsvName,
                errorList: Object.values(errorListMap)
            });

            setState('COMPLETE');
            onComplete?.();
        } catch {
            setErrorMessage('An unexpected error occurred, please try again');
            setErrorHeader('Import error');
            setState('ERROR');
        }
    }, [file, mapping, mappingError, selectedLabels, onComplete]);

    // Get current row data for the mapping table preview
    const currentlyDisplayedData = fileData && fileData.length > 0 && mapping
        ? Object.entries(fileData[dataPreviewIndex] || {}).map(([key, value]) => ({
            key,
            value,
            mapTo: mapping.get(key)
        }))
        : [];

    const hasNextRecord = fileData ? !!fileData[dataPreviewIndex + 1] : false;
    const hasPrevRecord = dataPreviewIndex > 0;
    const membersCount = fileData?.length ?? 0;
    const isWide = state === 'MAPPING' || state === 'UPLOADING';

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className={cn('gap-0', isWide && 'max-w-2xl')}>
                {/* INIT State */}
                {state === 'INIT' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Import members</DialogTitle>
                        </DialogHeader>

                        <div className="mt-5 space-y-5">
                            <Banner className="shadow-none">
                                Need some help? <a className="font-semibold underline" href="https://ghost.org/help/import-members/" rel="noopener noreferrer" target="_blank">Learn more</a> about importing members or <a className="font-semibold underline" href="https://static.ghost.org/v4.0.0/files/member-import-template.csv" rel="noopener noreferrer" target="_blank">download a sample CSV file</a>.
                            </Banner>

                            {fileError && (
                                <div className="flex items-start gap-2 text-sm text-red-600">
                                    <LucideIcon.AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                    <p>{fileError}</p>
                                </div>
                            )}

                            <div
                                className={cn(
                                    'flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-10 transition-colors',
                                    dragOver
                                        ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                                        : 'border-grey-300 hover:border-grey-400'
                                )}
                                onClick={() => fileInputRef.current?.click()}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                            >
                                <LucideIcon.Upload className="mb-2 size-6 text-grey-600" />
                                <span className="text-sm text-grey-700">Select or drop a CSV file</span>
                                <input
                                    ref={fileInputRef}
                                    accept=".csv"
                                    className="hidden"
                                    type="file"
                                    onChange={handleFileInputChange}
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-5">
                            <Button variant="outline" onClick={() => handleOpenChange(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {/* MAPPING / UPLOADING State */}
                {(state === 'MAPPING' || state === 'UPLOADING') && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Import members</DialogTitle>
                        </DialogHeader>

                        <div className="mt-5 space-y-5">
                            {fileData === null ? (
                                <div className="flex items-center justify-center rounded-md border bg-muted p-10">
                                    <LoadingIndicator size="md" />
                                </div>
                            ) : (
                                <>
                                    <div className={cn(
                                        'overflow-hidden rounded-md border',
                                        showMappingErrors && mappingError && 'border-red-500'
                                    )}>
                                        <div className="max-h-[400px] overflow-auto">
                                            <Table className="table-fixed">
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-1/3">Field</TableHead>
                                                        <TableHead className="w-1/3">
                                                            <div className="flex items-center justify-between">
                                                                <span>
                                                                    Sample data <span className="text-muted-foreground">(#{(dataPreviewIndex + 1).toLocaleString()})</span>
                                                                </span>
                                                                <div className="flex items-center">
                                                                    <button
                                                                        className={cn(
                                                                            'rounded p-0.5 hover:bg-muted',
                                                                            !hasPrevRecord && 'cursor-default opacity-30'
                                                                        )}
                                                                        disabled={!hasPrevRecord || state === 'UPLOADING'}
                                                                        type="button"
                                                                        onClick={() => setDataPreviewIndex(i => i - 1)}
                                                                    >
                                                                        <LucideIcon.ChevronLeft className="size-4" />
                                                                    </button>
                                                                    <button
                                                                        className={cn(
                                                                            'rounded p-0.5 hover:bg-muted',
                                                                            !hasNextRecord && 'cursor-default opacity-30'
                                                                        )}
                                                                        disabled={!hasNextRecord || state === 'UPLOADING'}
                                                                        type="button"
                                                                        onClick={() => setDataPreviewIndex(i => i + 1)}
                                                                    >
                                                                        <LucideIcon.ChevronRight className="size-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </TableHead>
                                                        <TableHead className="w-1/3">Import as</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {currentlyDisplayedData.length > 0 ? (
                                                        currentlyDisplayedData.map(row => (
                                                            <TableRow key={row.key}>
                                                                <TableCell className="break-all text-sm font-medium">{row.key}</TableCell>
                                                                <TableCell className={cn('break-all text-sm', !row.value && 'text-muted-foreground')}>
                                                                    {row.value || '\u00A0'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Select
                                                                        disabled={state === 'UPLOADING'}
                                                                        value={row.mapTo || '__not_imported__'}
                                                                        onValueChange={(val) => {
                                                                            handleUpdateMapping(row.key, val === '__not_imported__' ? null : val);
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className={cn('h-8 text-sm', !row.mapTo && 'text-muted-foreground')}>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="__not_imported__">Not imported</SelectItem>
                                                                            {FIELD_MAPPINGS.map(field => (
                                                                                <SelectItem key={field.value} value={field.value}>
                                                                                    {field.label}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell className="text-muted-foreground" colSpan={3}>
                                                                No data found in the uploaded CSV.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    {showMappingErrors && mappingError && (
                                        <p className="text-sm text-red-600">{mappingError}</p>
                                    )}

                                    {membersCount > 0 && (
                                        <p className="text-sm text-muted-foreground">
                                            If an email address in your CSV matches an existing member, they will be updated with the mapped values.
                                        </p>
                                    )}

                                    <div>
                                        <label className="mb-1 block text-sm font-semibold">Label these members</label>
                                        <Select
                                            disabled={state === 'UPLOADING'}
                                            value={selectedLabels[0] || '__none__'}
                                            onValueChange={(val) => {
                                                if (val === '__none__') {
                                                    setSelectedLabels([]);
                                                } else {
                                                    setSelectedLabels([val]);
                                                }
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a label..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">No label</SelectItem>
                                                {labels.map(label => (
                                                    <SelectItem key={label.id} value={label.name}>
                                                        {label.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                        </div>

                        <DialogFooter className="mt-5">
                            <Button
                                disabled={state === 'UPLOADING'}
                                variant="outline"
                                onClick={reset}
                            >
                                Start over
                            </Button>
                            <Button
                                disabled={state === 'UPLOADING' || membersCount === 0}
                                onClick={handleUpload}
                            >
                                {state === 'UPLOADING' ? (
                                    <span className="flex items-center gap-2">
                                        <LoadingIndicator size="sm" />
                                        Uploading
                                    </span>
                                ) : membersCount > 0 ? (
                                    `Import ${membersCount.toLocaleString()} ${membersCount === 1 ? 'member' : 'members'}`
                                ) : (
                                    'Import members'
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {/* PROCESSING State */}
                {state === 'PROCESSING' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Import in progress</DialogTitle>
                        </DialogHeader>

                        <div className="mt-5">
                            <p className="text-sm">
                                Your import is being processed, and you&apos;ll receive a confirmation email as soon as it&apos;s complete. Usually this only takes a few minutes, but larger imports may take longer.
                            </p>
                        </div>

                        <DialogFooter className="mt-5">
                            <Button variant="outline" onClick={reset}>
                                Upload another file
                            </Button>
                            <Button onClick={() => handleOpenChange(false)}>
                                Got it
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {/* COMPLETE State */}
                {state === 'COMPLETE' && importResponse && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Import complete</DialogTitle>
                        </DialogHeader>

                        <div className="mt-5 space-y-4">
                            {importResponse.importedCount === 0 ? (
                                <p className="text-sm">
                                    No members were added{importResponse.errorCount > 0 ? ' due to the following errors:' : '.'}
                                </p>
                            ) : (
                                <p className="text-sm">
                                    A total of <strong>{importResponse.importedCount.toLocaleString()}</strong> {importResponse.importedCount === 1 ? 'person was' : 'people were'} successfully added or updated in your list of members, and now have access to your site.
                                </p>
                            )}

                            {importResponse.errorCount > 0 && (
                                <>
                                    {importResponse.importedCount > 0 && (
                                        <>
                                            <hr className="border-grey-200" />
                                            <p className="text-sm">
                                                <strong>{importResponse.errorCount.toLocaleString()}</strong> {importResponse.errorCount === 1 ? 'member was' : 'members were'} skipped due to the following errors:
                                            </p>
                                        </>
                                    )}
                                    <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                                        {importResponse.errorList.map(error => (
                                            <li key={error.message}>{error.message} ({error.count})</li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>

                        <DialogFooter className="mt-5">
                            {importResponse.errorCount > 0 ? (
                                <>
                                    <Button variant="outline" asChild>
                                        <a download={importResponse.errorCsvName} href={importResponse.errorCsvUrl}>
                                            Download error file
                                        </a>
                                    </Button>
                                    {importResponse.importedCount === 0 ? (
                                        <Button onClick={reset}>
                                            Try again
                                        </Button>
                                    ) : (
                                        <Button onClick={() => handleOpenChange(false)}>
                                            View members
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <>
                                    {importResponse.importedCount === 0 ? (
                                        <>
                                            <Button variant="outline" onClick={() => handleOpenChange(false)}>
                                                Close
                                            </Button>
                                            <Button onClick={reset}>
                                                Try again
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button variant="outline" onClick={reset}>
                                                Upload another file
                                            </Button>
                                            <Button onClick={() => handleOpenChange(false)}>
                                                View members
                                            </Button>
                                        </>
                                    )}
                                </>
                            )}
                        </DialogFooter>
                    </>
                )}

                {/* ERROR State */}
                {state === 'ERROR' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>{errorHeader}</DialogTitle>
                        </DialogHeader>

                        <div className="mt-5">
                            <div className="flex items-start gap-2 text-sm text-red-600">
                                <LucideIcon.AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                <p>{errorMessage}</p>
                            </div>
                        </div>

                        <DialogFooter className="mt-5">
                            {showTryAgainButton && (
                                <Button variant="outline" onClick={reset}>
                                    Try again
                                </Button>
                            )}
                            <Button onClick={() => handleOpenChange(false)}>
                                OK
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
