import React, {useState} from 'react';
import {
    Badge,
    Button,
    Card,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    EmptyIndicator,
    LoadingIndicator,
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useBrowsePages} from '@tryghost/admin-x-framework/api/pages';
import {
    useBrowseFormAttachedPosts,
    useAttachFormToPost,
    useDetachFormFromPost,
    type Form,
    type FormSchema
} from '@tryghost/admin-x-framework/api/forms';

interface FormEmbedModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: Form;
}

export const FormEmbedModal: React.FC<FormEmbedModalProps> = ({
    open,
    onOpenChange,
    form
}) => {
    const [copied, setCopied] = useState<string | null>(null);
    const [selectedTargetId, setSelectedTargetId] = useState<string>('');
    const [placement, setPlacement] = useState<'end' | 'start'>('end');
    const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);

    // Fetch posts and pages
    const {data: postsData, isLoading: isLoadingPosts} = useBrowsePosts({
        searchParams: {limit: 'all', fields: 'id,title,slug,status,updated_at'}
    });
    const {data: pagesData, isLoading: isLoadingPages} = useBrowsePages({
        searchParams: {limit: 'all', fields: 'id,title,slug,status,updated_at'}
    });

    const isLoadingOptions = isLoadingPosts || isLoadingPages;

    // Fetch posts currently with this form attached
    const {data: attachedData, isLoading: isLoadingAttached, refetch: refetchAttached} = useBrowseFormAttachedPosts(form.id, {
        enabled: open
    });

    // Mutations for attach and detach
    const {mutateAsync: attachForm, isPending: isAttaching} = useAttachFormToPost();
    const {mutateAsync: detachForm, isPending: isDetaching} = useDetachFormFromPost();

    const posts = postsData?.posts || [];
    const pages = pagesData?.pages || [];
    const attachedPosts = attachedData?.posts || [];

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
    const customCss = parsedSchema.custom_css || form.custom_css || '';

    const smartScriptSnippet = `<script src="${window.location.origin}/ghost/api/content/forms/${form.id}/embed.js" async></script>`;
    const smartDivSnippet = `<div data-ghost-form="${form.id}"></div>\n<script src="${window.location.origin}/ghost/api/content/forms/${form.id}/embed.js" async></script>`;
    const endpointUrl = `${window.location.origin}/ghost/api/content/forms/${form.id}/submissions`;

    const handleCopy = (text: string, type: string) => {
        void navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleAttach = async () => {
        if (!selectedTargetId) {
            return;
        }
        try {
            setStatusMessage(null);
            await attachForm({
                formId: form.id,
                postId: selectedTargetId,
                placement
            });
            await refetchAttached();
            setSelectedTargetId('');
            setStatusMessage({type: 'success', text: 'Form successfully attached to post!'});
            setTimeout(() => setStatusMessage(null), 4000);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to attach form to post.';
            setStatusMessage({type: 'error', text: msg});
        }
    };

    const handleDetach = async (postId: string) => {
        try {
            setStatusMessage(null);
            await detachForm({
                formId: form.id,
                postId
            });
            await refetchAttached();
            setStatusMessage({type: 'success', text: 'Form successfully detached from post.'});
            setTimeout(() => setStatusMessage(null), 4000);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to detach form.';
            setStatusMessage({type: 'error', text: msg});
        }
    };

    // Filter out posts and pages that already have this form attached
    const attachedIds = new Set(attachedPosts.map(p => p.id));
    const availablePosts = posts.filter(p => !attachedIds.has(p.id));
    const availablePages = pages.filter(p => !attachedIds.has(p.id));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Embed Form: {form.name}</DialogTitle>
                    <DialogDescription>
                        Attach this form directly to any post or page with zero copy-pasting, or use the dynamic smart script.
                    </DialogDescription>
                </DialogHeader>

                {statusMessage && (
                    <div
                        className={`rounded-md border p-3 text-xs ${
                            statusMessage.type === 'success'
                                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300'
                                : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
                        }`}
                    >
                        <Inline align="center" gap="xs">
                            {statusMessage.type === 'success' ? (
                                <LucideIcon.CheckCircle2 className="size-4 shrink-0 text-green-600" />
                            ) : (
                                <LucideIcon.AlertCircle className="size-4 shrink-0 text-red-600" />
                            )}
                            <span>{statusMessage.text}</span>
                        </Inline>
                    </div>
                )}

                <Tabs className="w-full" defaultValue="direct">
                    <TabsList className="mb-4 grid w-full grid-cols-4">
                        <TabsTrigger value="direct">Attach to Post/Page</TabsTrigger>
                        <TabsTrigger value="smart">Smart Script</TabsTrigger>
                        <TabsTrigger value="preview">Live Preview</TabsTrigger>
                        <TabsTrigger value="api">REST API</TabsTrigger>
                    </TabsList>

                    {/* Tab 1: 1-Click Direct Post / Page Attachment (Zero Copy-Paste) */}
                    <TabsContent value="direct">
                        <Stack gap="md">
                            {/* Reassurance Banner */}
                            <Card className="border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
                                <Stack gap="xs">
                                    <Inline align="center" gap="xs">
                                        <LucideIcon.ShieldCheck className="size-4 text-blue-600 dark:text-blue-400" />
                                        <Text className="font-semibold text-blue-950 dark:text-blue-200" size="sm">
                                            Zero Copy-Paste & Safe Lifecycle Management
                                        </Text>
                                    </Inline>
                                    <Text className="text-blue-800 dark:text-blue-300" size="xs">
                                        No manual HTML or copy-pasting required. Ghost directly attaches the live form to your selected post or page. Edits made in Form Builder update automatically. If you ever delete this form, it is <strong>automatically cleaned up from all posts and pages</strong> in your database.
                                    </Text>
                                </Stack>
                            </Card>

                            {/* Attach Selector Controls */}
                            <Card className="bg-surface-elevated-1 border border-border-default p-4">
                                <Stack gap="md">
                                    <Text className="font-semibold" size="sm">
                                        Insert Form into a Post or Page:
                                    </Text>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div className="sm:col-span-2">
                                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                                Select Post or Page
                                            </label>
                                            <Select disabled={isLoadingOptions} value={selectedTargetId} onValueChange={setSelectedTargetId}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={isLoadingOptions ? 'Loading posts and pages...' : 'Choose a post or page...'} />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60">
                                                    {availablePosts.length > 0 && (
                                                        <SelectGroup>
                                                            <SelectLabel>Posts</SelectLabel>
                                                            {availablePosts.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>
                                                                    {p.title || '(Untitled Post)'}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    )}
                                                    {availablePages.length > 0 && (
                                                        <SelectGroup>
                                                            <SelectLabel>Pages</SelectLabel>
                                                            {availablePages.map(pg => (
                                                                <SelectItem key={pg.id} value={pg.id}>
                                                                    {pg.title || '(Untitled Page)'}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    )}
                                                    {availablePosts.length === 0 && availablePages.length === 0 && (
                                                        <div className="p-2 text-center text-xs text-muted-foreground">
                                                            No other posts or pages available
                                                        </div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                                Placement
                                            </label>
                                            <Select value={placement} onValueChange={(val: 'end' | 'start') => setPlacement(val)}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="end">End of Content</SelectItem>
                                                    <SelectItem value="start">Top of Content</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            disabled={!selectedTargetId || isAttaching}
                                            size="sm"
                                            onClick={() => void handleAttach()}
                                        >
                                            {isAttaching ? (
                                                <>
                                                    <LoadingIndicator size="sm" />
                                                    Attaching...
                                                </>
                                            ) : (
                                                <>
                                                    <LucideIcon.Plus className="mr-1 size-3.5" />
                                                    Attach Form to Selected
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Stack>
                            </Card>

                            {/* Currently Attached Posts Section */}
                            <Stack gap="xs">
                                <Text className="font-semibold" size="sm">
                                    Active Attachments ({attachedPosts.length})
                                </Text>

                                {isLoadingAttached ? (
                                    <div className="flex justify-center p-6">
                                        <LoadingIndicator size="md" />
                                    </div>
                                ) : attachedPosts.length === 0 ? (
                                    <EmptyIndicator
                                        description="This form is not attached to any post or page yet. Select one above to attach it with 1 click."
                                        title="No active attachments"
                                    />
                                ) : (
                                    <div className="bg-surface-elevated-1 rounded-md border border-border-default">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Title</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {attachedPosts.map(p => (
                                                    <TableRow key={p.id}>
                                                        <TableCell className="font-medium">
                                                            {p.title || '(Untitled)'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className="capitalize" variant="secondary">
                                                                {p.type || 'post'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                className="capitalize"
                                                                variant={p.status === 'published' ? 'default' : 'outline'}
                                                            >
                                                                {p.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                disabled={isDetaching}
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => void handleDetach(p.id)}
                                                            >
                                                                <LucideIcon.Trash2 className="mr-1 size-3.5" />
                                                                Detach
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </Stack>
                        </Stack>
                    </TabsContent>

                    {/* Tab 2: Smart Dynamic Script (For External Sites, Themes, or Custom Embeds) */}
                    <TabsContent value="smart">
                        <Stack gap="md">
                            <Card className="bg-surface-elevated-1 border border-border-default p-4">
                                <Stack gap="xs">
                                    <Inline align="center" gap="xs">
                                        <LucideIcon.Sparkles className="size-4 text-amber-500" />
                                        <Text className="font-semibold" size="sm">
                                            Smart Dynamic Embed Script
                                        </Text>
                                    </Inline>
                                    <Text className="text-muted-foreground" size="xs">
                                        Use this 1-line script for theme <code className="font-mono text-primary">.hbs</code> files, HTML cards, or external websites. It automatically syncs edits in real-time, renders custom CSS, and <strong>automatically deletes the form from the page</strong> if the form is archived or deleted in Admin.
                                    </Text>
                                </Stack>
                            </Card>

                            <Stack gap="xs">
                                <Text className="text-xs font-semibold text-muted-foreground uppercase">
                                    Single-Line Loader (Auto-places form right where script is inserted)
                                </Text>
                                <div className="relative rounded-md border border-border-default bg-surface-elevated-2 p-3 font-mono text-xs">
                                    <pre className="overflow-x-auto whitespace-pre-wrap">{smartScriptSnippet}</pre>
                                    <Button
                                        className="absolute top-2 right-2"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleCopy(smartScriptSnippet, 'script')}
                                    >
                                        {copied === 'script' ? (
                                            <>
                                                <LucideIcon.Check className="mr-1 size-3.5 text-green-600" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <LucideIcon.Copy className="mr-1 size-3.5" />
                                                Copy Snippet
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </Stack>

                            <Stack gap="xs">
                                <Text className="text-xs font-semibold text-muted-foreground uppercase">
                                    Explicit Container Snippet (For precise placement control)
                                </Text>
                                <div className="relative rounded-md border border-border-default bg-surface-elevated-2 p-3 font-mono text-xs">
                                    <pre className="overflow-x-auto whitespace-pre-wrap">{smartDivSnippet}</pre>
                                    <Button
                                        className="absolute top-2 right-2"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleCopy(smartDivSnippet, 'div')}
                                    >
                                        {copied === 'div' ? (
                                            <>
                                                <LucideIcon.Check className="mr-1 size-3.5 text-green-600" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <LucideIcon.Copy className="mr-1 size-3.5" />
                                                Copy Snippet
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </Stack>
                        </Stack>
                    </TabsContent>

                    {/* Tab 3: Live Preview */}
                    <TabsContent value="preview">
                        <Stack gap="sm">
                            <Text size="xs" tone="secondary">
                                Preview of how this form renders with custom CSS and interactive fields:
                            </Text>
                            <div className="bg-surface-elevated-1 flex justify-center rounded-md border border-border-default p-6">
                                <div className="ghost-form-preview-wrapper w-full max-w-lg">
                                    {customCss && (
                                        <style dangerouslySetInnerHTML={{__html: customCss}} />
                                    )}
                                    <div className="ghost-form-container rounded-lg border border-border-default bg-card p-6 text-card-foreground shadow-sm">
                                        <h3 className="ghost-form-title mb-1 text-lg font-bold">{form.name}</h3>
                                        {form.description && (
                                            <p className="ghost-form-description mb-4 text-xs text-muted-foreground">{form.description}</p>
                                        )}
                                        <div className="ghost-form space-y-3">
                                            {fields.map(f => (
                                                <div key={f.id} className="ghost-form-group space-y-1">
                                                    <label className="ghost-form-label text-xs font-medium">
                                                        {f.label} {f.required && <span className="text-destructive">*</span>}
                                                    </label>
                                                    <input
                                                        className="ghost-form-input w-full rounded border border-border-default bg-background px-3 py-1.5 text-xs"
                                                        placeholder={f.placeholder || ''}
                                                        disabled
                                                    />
                                                </div>
                                            ))}
                                            <Button className="ghost-form-btn mt-3 w-full" size="sm" disabled>
                                                Submit
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Stack>
                    </TabsContent>

                    {/* Tab 4: REST API Endpoint */}
                    <TabsContent value="api">
                        <Stack gap="sm">
                            <Text size="sm" tone="secondary">
                                For custom frontend applications, mobile apps, or headless setups:
                            </Text>
                            <div className="relative rounded-md border border-border-default bg-surface-elevated-2 p-3 font-mono text-xs">
                                <p className="font-semibold text-foreground">POST {endpointUrl}</p>
                                <p className="mt-2 text-muted-foreground">Headers: Content-Type: application/json</p>
                                <pre className="mt-2 text-muted-foreground">
{`// Example payload:
{
${fields.map(f => `  "${f.name || f.id}": "sample value"`).join(',\n')}
}`}
                                </pre>
                                <Button
                                    className="absolute top-2 right-2"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleCopy(endpointUrl, 'api')}
                                >
                                    {copied === 'api' ? (
                                        <>
                                            <LucideIcon.Check className="mr-1 size-3.5 text-green-600" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <LucideIcon.Copy className="mr-1 size-3.5" />
                                            Copy Endpoint
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Stack>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Inline gap="sm" justify="end">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Done
                        </Button>
                    </Inline>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default FormEmbedModal;
