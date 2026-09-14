import React, {useState, useEffect} from 'react';
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Badge, Button, Card, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, EmptyIndicator, LoadingIndicator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {Box, Container, Inline, Stack, Text} from '@tryghost/shade/primitives';
import {ListPage} from '@tryghost/shade/page-templates';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {PageHeader} from '@tryghost/shade/patterns';
import {useBrowseForms, useDeleteForm, useInvalidateForms, type Form} from '@tryghost/admin-x-framework/api/forms';
import {FormBuilderModal} from './form-builder-modal';
import {FormSubmissionsModal} from './form-submissions-modal';
import {FormEmbedModal} from './form-embed-modal';
import {FormAnalyticsModal} from './form-analytics-modal';

export const Forms: React.FC = () => {
    const {data, isLoading, isError, refetch} = useBrowseForms();
    const {mutateAsync: deleteForm} = useDeleteForm();
    const invalidateForms = useInvalidateForms();

    const [builderOpen, setBuilderOpen] = useState(false);
    const [selectedForm, setSelectedForm] = useState<Form | null>(null);

    const [submissionsOpen, setSubmissionsOpen] = useState(false);
    const [submissionsForm, setSubmissionsForm] = useState<Form | null>(null);

    const [analyticsOpen, setAnalyticsOpen] = useState(false);
    const [analyticsForm, setAnalyticsForm] = useState<Form | null>(null);

    const [embedOpen, setEmbedOpen] = useState(false);
    const [embedForm, setEmbedForm] = useState<Form | null>(null);

    const [formToDelete, setFormToDelete] = useState<Form | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const forms = data?.forms || [];

    useEffect(() => {
        const query = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.search.replace(/^\?/, '');
        const params = new URLSearchParams(query);
        if (params.get('new') === 'true' || params.get('action') === 'new') {
            setSelectedForm(null);
            setBuilderOpen(true);
        }
    }, []);

    const handleCreateNew = () => {
        setSelectedForm(null);
        setBuilderOpen(true);
    };

    const handleEdit = (form: Form) => {
        setSelectedForm(form);
        setBuilderOpen(true);
    };

    const handleViewSubmissions = (form: Form) => {
        setSubmissionsForm(form);
        setSubmissionsOpen(true);
    };

    const handleViewAnalytics = (form: Form) => {
        setAnalyticsForm(form);
        setAnalyticsOpen(true);
    };

    const handleViewEmbed = (form: Form) => {
        setEmbedForm(form);
        setEmbedOpen(true);
    };

    const confirmDelete = async () => {
        if (!formToDelete) {
            return;
        }
        try {
            setIsDeleting(true);
            await deleteForm(formToDelete.id);
            invalidateForms();
            setFormToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Box className="size-full">
            <Container className="relative flex h-full flex-col" size="page">
                <ListPage data-testid="forms-page">
                    <ListPage.Header>
                        <PageHeader blurredBackground={false} sticky={false}>
                            <PageHeader.Left>
                                <PageHeader.Title>
                                    Forms
                                    {forms.length > 0 && (
                                        <PageHeader.Count>{formatNumber(forms.length)}</PageHeader.Count>
                                    )}
                                </PageHeader.Title>
                            </PageHeader.Left>
                            <PageHeader.Actions>
                                <PageHeader.ActionGroup>
                                    <Button onClick={handleCreateNew}>
                                        <LucideIcon.Plus className="mr-1.5 size-4" />
                                        New form
                                    </Button>
                                </PageHeader.ActionGroup>
                            </PageHeader.Actions>
                        </PageHeader>
                    </ListPage.Header>

                    <ListPage.Body>
                        {isLoading ? (
                            <div className="flex flex-1 items-center justify-center">
                                <LoadingIndicator size="lg" />
                            </div>
                        ) : isError ? (
                            <div className="flex flex-1 flex-col items-center justify-center">
                                <h2 className="mb-2 text-xl font-medium">Error loading forms</h2>
                                <p className="mb-4 text-muted-foreground">Please reload the page to try again.</p>
                                <Button onClick={() => { void refetch(); }}>Reload page</Button>
                            </div>
                        ) : forms.length === 0 ? (
                            <div className="flex flex-1 items-center justify-center">
                                <EmptyIndicator
                                    actions={
                                        <Button onClick={handleCreateNew}>
                                            <LucideIcon.Plus className="mr-1.5 size-4" />
                                            Create a form
                                        </Button>
                                    }
                                    description="Create custom forms to collect responses, survey readers, and capture leads directly within Ghost."
                                    title="No forms yet"
                                />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Card className="bg-surface-elevated-1 border border-border-default p-3">
                                    <Inline align="center" gap="sm">
                                        <LucideIcon.Sparkles className="size-4 shrink-0 text-primary" />
                                        <Text size="xs" tone="secondary">
                                            <strong>Embed forms easily:</strong> Click <strong>Embed</strong> on any form to copy a ready-to-use HTML card snippet with custom CSS for any Ghost Post or Page.
                                        </Text>
                                    </Inline>
                                </Card>

                                <Table data-testid="forms-table">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Form Name</TableHead>
                                            <TableHead className="w-28">Status</TableHead>
                                            <TableHead className="w-32">Submissions</TableHead>
                                            <TableHead className="w-40">Created</TableHead>
                                            <TableHead className="w-56 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {forms.map((form) => {
                                            const dateStr = form.created_at
                                                ? new Date(form.created_at).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })
                                                : '—';

                                            const submissionCount = form.count?.submissions ?? 0;

                                            return (
                                                <TableRow key={form.id}>
                                                    <TableCell>
                                                        <Stack gap="none">
                                                            <Text className="text-foreground" weight="semibold">
                                                                {form.name}
                                                            </Text>
                                                            {form.description && (
                                                                <Text className="line-clamp-1" size="xs" tone="secondary">
                                                                    {form.description}
                                                                </Text>
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className="text-xs font-normal capitalize"
                                                            variant={form.status === 'active' ? 'default' : 'outline'}
                                                        >
                                                            {form.status || 'active'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            className="h-7 px-2 font-mono text-xs hover:bg-surface-elevated-2"
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleViewSubmissions(form)}
                                                        >
                                                            <LucideIcon.Inbox className="mr-1.5 size-3.5" />
                                                            {formatNumber(submissionCount)}
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                                                        {dateStr}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Inline align="center" gap="xs" justify="end">
                                                            <Button
                                                                className="h-8 px-2.5 text-xs"
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleViewAnalytics(form)}
                                                            >
                                                                <LucideIcon.BarChart2 className="mr-1 size-3.5 text-primary" />
                                                                Analytics
                                                            </Button>

                                                            <Button
                                                                className="h-8 px-2.5 text-xs"
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleViewEmbed(form)}
                                                            >
                                                                <LucideIcon.Code className="mr-1 size-3.5" />
                                                                Embed
                                                            </Button>

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button className="size-8 p-0" size="sm" variant="ghost">
                                                                        <LucideIcon.MoreHorizontal className="size-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => handleViewAnalytics(form)}>
                                                                        <LucideIcon.BarChart2 className="mr-2 size-4 text-primary" />
                                                                        View Analytics
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleViewSubmissions(form)}>
                                                                        <LucideIcon.Inbox className="mr-2 size-4" />
                                                                        View Submissions
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleEdit(form)}>
                                                                        <LucideIcon.Pencil className="mr-2 size-4" />
                                                                        Edit Form
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleViewEmbed(form)}>
                                                                        <LucideIcon.Code className="mr-2 size-4" />
                                                                        Get Embed Code
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        className="text-destructive focus:text-destructive"
                                                                        onClick={() => setFormToDelete(form)}
                                                                    >
                                                                        <LucideIcon.Trash2 className="mr-2 size-4" />
                                                                        Delete Form
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </Inline>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </ListPage.Body>
                </ListPage>
            </Container>

            {/* Form Builder Modal */}
            <FormBuilderModal
                form={selectedForm}
                open={builderOpen}
                onOpenChange={setBuilderOpen}
            />

            {/* Submissions Modal */}
            {submissionsForm && (
                <FormSubmissionsModal
                    form={submissionsForm}
                    open={submissionsOpen}
                    onOpenChange={setSubmissionsOpen}
                />
            )}

            {/* Analytics Modal */}
            {analyticsForm && (
                <FormAnalyticsModal
                    form={analyticsForm}
                    open={analyticsOpen}
                    onOpenChange={setAnalyticsOpen}
                />
            )}

            {/* Embed Modal */}
            {embedForm && (
                <FormEmbedModal
                    form={embedForm}
                    open={embedOpen}
                    onOpenChange={setEmbedOpen}
                />
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={!!formToDelete} onOpenChange={openConfirm => !openConfirm && setFormToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete form?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &ldquo;{formToDelete?.name}&rdquo;? All responses and form data will be permanently removed.
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
        </Box>
    );
};

export default Forms;
