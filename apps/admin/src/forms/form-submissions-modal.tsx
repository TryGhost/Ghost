import React, {useState} from 'react';
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, EmptyIndicator, LoadingIndicator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {Inline, Text} from '@tryghost/shade/primitives';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {blobDownloadFromEndpoint} from '@tryghost/admin-x-framework/helpers';
import {useBrowseSubmissions, useDeleteSubmission, type Form, type FormSchema, type FormSubmission} from '@tryghost/admin-x-framework/api/forms';

interface FormSubmissionsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: Form;
}

export const FormSubmissionsModal: React.FC<FormSubmissionsModalProps> = ({
    open,
    onOpenChange,
    form
}) => {
    const {data, isLoading, isError} = useBrowseSubmissions(form.id, {
        enabled: open
    });
    const {mutateAsync: deleteSubmission} = useDeleteSubmission();
    const [subToDelete, setSubToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    let parsedSchema: FormSchema = {fields: []};
    if (typeof form.schema === 'string') {
        try {
            parsedSchema = JSON.parse(form.schema) as FormSchema;
        } catch {
            parsedSchema = {fields: []};
        }
    } else if (form.schema && Array.isArray(form.schema.fields)) {
        parsedSchema = form.schema;
    }

    const fields = parsedSchema.fields || [];
    const submissions = data?.form_submissions || [];

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const filename = `${form.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-responses-${new Date().toISOString().slice(0, 10)}.csv`;
            await blobDownloadFromEndpoint(`/forms/${form.id}/submissions/export`, filename);
        } catch {
            // Client-side fallback if backend download stream encounters any issue
            const headers = ['Submission ID', 'Submitted At', ...fields.map(f => f.label || f.name || f.id)];
            const rows = submissions.map((sub) => {
                let subData: Record<string, unknown> = {};
                if (typeof sub.data === 'string') {
                    try {
                        subData = JSON.parse(sub.data) as Record<string, unknown>;
                    } catch {
                        subData = {};
                    }
                } else if (sub.data) {
                    subData = sub.data;
                }

                const row = [
                    sub.id,
                    sub.created_at ? new Date(sub.created_at).toISOString() : ''
                ];

                fields.forEach((f) => {
                    const raw = subData[f.id] !== undefined ? subData[f.id] : subData[f.name];
                    const strRaw = typeof raw === 'object' && raw !== null ? JSON.stringify(raw) : (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean' ? String(raw) : '');
                    row.push(raw !== undefined && raw !== null ? `"${strRaw.replace(/"/g, '""')}"` : '""');
                });
                return row.join(',');
            });

            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${form.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-responses.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } finally {
            setIsExporting(false);
        }
    };

    const confirmDelete = async () => {
        if (!subToDelete) {
            return;
        }
        try {
            setIsDeleting(true);
            await deleteSubmission({formId: form.id, submissionId: subToDelete});
            setSubToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const parseSubmissionData = (sub: FormSubmission): Record<string, unknown> => {
        if (typeof sub.data === 'string') {
            try {
                return JSON.parse(sub.data) as Record<string, unknown>;
            } catch {
                return {};
            }
        }
        return (sub.data) || {};
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col">
                    <DialogHeader>
                        <Inline align="center" className="w-full pr-6" justify="between">
                            <div>
                                <DialogTitle>{form.name} Submissions</DialogTitle>
                                <DialogDescription>
                                    {submissions.length > 0 ? (
                                        <span>Total {formatNumber(submissions.length)} recorded response{submissions.length === 1 ? '' : 's'}.</span>
                                    ) : (
                                        <span>View and export all recorded responses for this form.</span>
                                    )}
                                </DialogDescription>
                            </div>
                            {submissions.length > 0 && (
                                <Button disabled={isExporting} size="sm" variant="outline" onClick={() => { void handleExport(); }}>
                                    <LucideIcon.Download className="mr-1.5 size-3.5" />
                                    {isExporting ? 'Exporting...' : 'Export CSV'}
                                </Button>
                            )}
                        </Inline>
                    </DialogHeader>

                    <div className="min-h-[300px] flex-1 overflow-y-auto rounded-md border border-border-default">
                        {isLoading ? (
                            <div className="flex h-64 items-center justify-center">
                                <LoadingIndicator size="lg" />
                            </div>
                        ) : isError ? (
                            <div className="flex h-64 flex-col items-center justify-center">
                                <Text className="text-destructive">Failed to load submissions</Text>
                            </div>
                        ) : submissions.length === 0 ? (
                            <div className="flex h-64 items-center justify-center">
                                <EmptyIndicator
                                    description="Submissions will appear here once visitors fill out the form."
                                    title="No responses yet"
                                />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-44">Submitted At</TableHead>
                                        {fields.map(f => (
                                            <TableHead key={f.id}>{f.label || f.name || f.id}</TableHead>
                                        ))}
                                        <TableHead className="w-16 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissions.map((sub) => {
                                        const subData = parseSubmissionData(sub);
                                        const dateStr = sub.created_at
                                            ? new Date(sub.created_at).toLocaleString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                            : '—';

                                        return (
                                            <TableRow key={sub.id}>
                                                <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                                                    {dateStr}
                                                </TableCell>
                                                {fields.map((f) => {
                                                    const rawVal = subData[f.id] !== undefined ? subData[f.id] : subData[f.name];
                                                    const val: unknown = rawVal;
                                                    let displayVal = '—';
                                                    if (val !== undefined && val !== null && val !== '') {
                                                        if (typeof val === 'boolean') {
                                                            displayVal = val ? 'Yes' : 'No';
                                                        } else if (Array.isArray(val)) {
                                                            displayVal = val.join(', ');
                                                        } else if (typeof val === 'string' || typeof val === 'number') {
                                                            displayVal = String(val);
                                                        } else if (typeof val === 'object') {
                                                            displayVal = JSON.stringify(val);
                                                        }
                                                    }
                                                    return (
                                                        <TableCell key={f.id} className="max-w-xs truncate text-sm">
                                                            {displayVal}
                                                        </TableCell>
                                                    );
                                                })}
                                                <TableCell className="text-right">
                                                    <Button
                                                        className="size-8 p-0 text-muted-foreground hover:text-destructive"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setSubToDelete(sub.id)}
                                                    >
                                                        <LucideIcon.Trash2 className="size-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    <DialogFooter>
                        <Inline gap="sm" justify="end">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Close
                            </Button>
                        </Inline>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!subToDelete} onOpenChange={openConfirm => !openConfirm && setSubToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete submission?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this form submission response. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                            onClick={() => { void confirmDelete(); }}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
