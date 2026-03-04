import React from 'react';
import {Button, DialogFooter, LoadingIndicator, LucideIcon, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn} from '@tryghost/shade';
import {FIELD_MAPPINGS, MembersFieldMapping} from '../mapping';

interface MappingPreviewRow {
    key: string;
    value: string;
    mapTo: string | null;
}

interface MappingStepProps {
    status: 'MAPPING' | 'UPLOADING';
    fileData: Record<string, string>[] | null;
    mapping: MembersFieldMapping | null;
    mappingError: string | null;
    showMappingErrors: boolean;
    membersCount: number;
    dataPreviewIndex: number;
    hasPrevRecord: boolean;
    hasNextRecord: boolean;
    selectedLabels: string[];
    labels: Array<{id: string; name: string}>;
    onUpdateMapping: (from: string, to: string | null) => void;
    onSelectLabels: (labels: string[]) => void;
    onDataPreviewIndexChange: (next: number) => void;
    onStartOver: () => void;
    onUpload: () => void;
}

export function MappingStep({
    status,
    fileData,
    mapping,
    mappingError,
    showMappingErrors,
    membersCount,
    dataPreviewIndex,
    hasPrevRecord,
    hasNextRecord,
    selectedLabels,
    labels,
    onUpdateMapping,
    onSelectLabels,
    onDataPreviewIndexChange,
    onStartOver,
    onUpload
}: MappingStepProps) {
    const currentlyDisplayedData: MappingPreviewRow[] = fileData && fileData.length > 0 && mapping
        ? Object.entries(fileData[dataPreviewIndex] || {}).map(([key, value]) => ({
            key,
            value,
            mapTo: mapping.get(key)
        }))
        : [];

    return (
        <>
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
                                                            disabled={!hasPrevRecord || status === 'UPLOADING'}
                                                            type="button"
                                                            onClick={() => onDataPreviewIndexChange(dataPreviewIndex - 1)}
                                                        >
                                                            <LucideIcon.ChevronLeft className="size-4" />
                                                        </button>
                                                        <button
                                                            className={cn(
                                                                'rounded p-0.5 hover:bg-muted',
                                                                !hasNextRecord && 'cursor-default opacity-30'
                                                            )}
                                                            disabled={!hasNextRecord || status === 'UPLOADING'}
                                                            type="button"
                                                            onClick={() => onDataPreviewIndexChange(dataPreviewIndex + 1)}
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
                                                            disabled={status === 'UPLOADING'}
                                                            value={row.mapTo || '__not_imported__'}
                                                            onValueChange={(val) => {
                                                                onUpdateMapping(row.key, val === '__not_imported__' ? null : val);
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
                                disabled={status === 'UPLOADING'}
                                value={selectedLabels[0] || '__none__'}
                                onValueChange={(val) => {
                                    if (val === '__none__') {
                                        onSelectLabels([]);
                                    } else {
                                        onSelectLabels([val]);
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
                    disabled={status === 'UPLOADING'}
                    variant="outline"
                    onClick={onStartOver}
                >
                    Start over
                </Button>
                <Button
                    disabled={status === 'UPLOADING' || membersCount === 0}
                    onClick={onUpload}
                >
                    {status === 'UPLOADING' ? (
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
    );
}
