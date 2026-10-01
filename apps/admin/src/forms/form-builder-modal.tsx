import React, {useState, useEffect} from 'react';
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Checkbox,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Input,
    Label,
    LoadingIndicator,
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Textarea
} from '@tryghost/shade/components';
import {Box, Inline, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {
    useCreateForm,
    useEditForm,
    useInvalidateForms,
    useBrowseFormAttachedPosts,
    useAttachFormToPost,
    useDetachFormFromPost,
    type Form,
    type FormField,
    type FormFieldType,
    type FormSchema
} from '@tryghost/admin-x-framework/api/forms';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useBrowsePages} from '@tryghost/admin-x-framework/api/pages';
import {toast} from 'sonner';

interface FormBuilderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form?: Form | null;
}

interface FieldTypeConfig {
    type: FormFieldType;
    label: string;
    icon: React.ReactNode;
    category: 'text' | 'choice' | 'date_rating';
}

const FIELD_TYPES: FieldTypeConfig[] = [
    // Text & Contact
    {type: 'text', label: 'Short Text', icon: <LucideIcon.Type className="size-4" />, category: 'text'},
    {type: 'textarea', label: 'Long Text', icon: <LucideIcon.AlignLeft className="size-4" />, category: 'text'},
    {type: 'email', label: 'Email Address', icon: <LucideIcon.Mail className="size-4" />, category: 'text'},
    {type: 'phone', label: 'Phone Number', icon: <LucideIcon.Phone className="size-4" />, category: 'text'},
    {type: 'url', label: 'Website / URL', icon: <LucideIcon.Globe className="size-4" />, category: 'text'},
    {type: 'number', label: 'Number', icon: <LucideIcon.Hash className="size-4" />, category: 'text'},

    // Choices & Selection
    {type: 'select', label: 'Dropdown Select', icon: <LucideIcon.ListFilter className="size-4" />, category: 'choice'},
    {type: 'radio', label: 'Multiple Choice', icon: <LucideIcon.CircleDot className="size-4" />, category: 'choice'},
    {type: 'checkbox', label: 'Checkbox', icon: <LucideIcon.CheckSquare className="size-4" />, category: 'choice'},

    // Date & Rating
    {type: 'date', label: 'Date', icon: <LucideIcon.Calendar className="size-4" />, category: 'date_rating'},
    {type: 'time', label: 'Time', icon: <LucideIcon.Clock className="size-4" />, category: 'date_rating'},
    {type: 'rating', label: 'Star Rating', icon: <LucideIcon.Star className="size-4" />, category: 'date_rating'}
];

function sanitizeCustomCss(css: string): string {
    if (!css || typeof css !== 'string') {
        return '';
    }
    return css
        .replace(/<\/style/gi, '<\\/style')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript\s*:/gi, '')
        .replace(/expression\s*\(/gi, '')
        .replace(/behavior\s*:/gi, '')
        .replace(/-moz-binding\s*:/gi, '')
        .replace(/@import\b/gi, '')
        .replace(/url\s*\(\s*(['"]?)\s*data:/gi, 'url($1')
        .replace(/url\s*\(\s*(['"]?)\s*javascript:/gi, 'url($1');
}

const CSS_PRESETS = [
    {
        name: 'Dark Elegance',
        css: `/* Modern Dark Aesthetic */
.ghost-form-container {
  background: #18181b !important;
  color: #f4f4f5 !important;
  border: 1px solid #27272a !important;
  border-radius: 16px !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4) !important;
  padding: 36px 32px !important;
}
.ghost-form-title {
  color: #fafafa !important;
  font-size: 26px !important;
  font-weight: 700 !important;
  line-height: 1.3 !important;
  margin-bottom: 10px !important;
}
.ghost-form-description {
  color: #a1a1aa !important;
  font-size: 16px !important;
  line-height: 1.5 !important;
  margin-bottom: 24px !important;
}
.ghost-form-label {
  color: #d4d4d8 !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  margin-bottom: 8px !important;
}
.ghost-form-input {
  background: #27272a !important;
  color: #ffffff !important;
  border: 1px solid #3f3f46 !important;
  border-radius: 8px !important;
  font-size: 16px !important;
  min-height: 48px !important;
  padding: 12px 16px !important;
}
.ghost-form-input:focus {
  border-color: #3b82f6 !important;
  outline: 2px solid rgba(59, 130, 246, 0.3) !important;
}
.ghost-form-btn {
  background: #3b82f6 !important;
  color: #ffffff !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  min-height: 50px !important;
  padding: 14px 28px !important;
}
.ghost-form-btn:hover {
  background: #2563eb !important;
}`
    },
    {
        name: 'Clean Minimalist',
        css: `/* Clean Minimalist */
.ghost-form-container {
  background: transparent !important;
  border: none !important;
  padding: 24px 0 !important;
  box-shadow: none !important;
  max-width: 100% !important;
}
.ghost-form-title {
  font-size: 26px !important;
  font-weight: 700 !important;
  line-height: 1.3 !important;
  margin-bottom: 10px !important;
}
.ghost-form-description {
  font-size: 16px !important;
  line-height: 1.5 !important;
  margin-bottom: 24px !important;
}
.ghost-form-label {
  font-size: 15px !important;
  font-weight: 600 !important;
  margin-bottom: 8px !important;
  color: #1e293b !important;
}
.ghost-form-input {
  border: none !important;
  border-bottom: 2px solid #e2e8f0 !important;
  border-radius: 0 !important;
  padding: 12px 0 !important;
  background: transparent !important;
  font-size: 16px !important;
  min-height: 48px !important;
}
.ghost-form-input:focus {
  border-bottom-color: #0f172a !important;
  outline: none !important;
}
.ghost-form-btn {
  background: #0f172a !important;
  color: #ffffff !important;
  border-radius: 9999px !important;
  padding: 14px 32px !important;
  min-height: 50px !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  letter-spacing: 0.02em !important;
}`
    },
    {
        name: 'Soft Rounded Card',
        css: `/* Soft Gradient & Rounded */
.ghost-form-container {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 24px !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.02) !important;
  padding: 36px 32px !important;
}
.ghost-form-title {
  font-size: 26px !important;
  font-weight: 700 !important;
  line-height: 1.3 !important;
  margin-bottom: 10px !important;
}
.ghost-form-description {
  font-size: 16px !important;
  line-height: 1.5 !important;
  margin-bottom: 24px !important;
}
.ghost-form-label {
  font-size: 15px !important;
  font-weight: 600 !important;
  margin-bottom: 8px !important;
  color: #1e293b !important;
}
.ghost-form-input {
  border-radius: 12px !important;
  border-color: #cbd5e1 !important;
  background: #f8fafc !important;
  font-size: 16px !important;
  min-height: 48px !important;
  padding: 12px 16px !important;
}
.ghost-form-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
  color: #ffffff !important;
  border-radius: 12px !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  min-height: 50px !important;
  padding: 14px 28px !important;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35) !important;
}`
    },
    {
        name: 'Accent Glow',
        css: `/* Vibrant Accent Border */
.ghost-form-container {
  border: 2px solid #06b6d4 !important;
  border-radius: 16px !important;
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.15) !important;
  padding: 36px 32px !important;
}
.ghost-form-title {
  font-size: 26px !important;
  font-weight: 700 !important;
  line-height: 1.3 !important;
  margin-bottom: 10px !important;
}
.ghost-form-description {
  font-size: 16px !important;
  line-height: 1.5 !important;
  margin-bottom: 24px !important;
}
.ghost-form-label {
  font-size: 15px !important;
  font-weight: 600 !important;
  margin-bottom: 8px !important;
  color: #1e293b !important;
}
.ghost-form-input {
  border-radius: 8px !important;
  font-size: 16px !important;
  min-height: 48px !important;
  padding: 12px 16px !important;
}
.ghost-form-btn {
  background: #06b6d4 !important;
  color: #ffffff !important;
  border-radius: 8px !important;
  font-weight: 700 !important;
  font-size: 16px !important;
  min-height: 50px !important;
  padding: 14px 28px !important;
}`
    }
];

export const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
    open,
    onOpenChange,
    form
}) => {
    const [currentForm, setCurrentForm] = useState<Form | null>(form || null);
    const activeFormId = currentForm?.id || '';
    const isEditing = Boolean(activeFormId);

    const {mutateAsync: createForm, isPending: isCreating} = useCreateForm();
    const {mutateAsync: editForm, isPending: isEditingPending} = useEditForm();
    const invalidateForms = useInvalidateForms();

    // Attach / Detach mutations
    const {mutateAsync: attachForm, isPending: isAttaching} = useAttachFormToPost();
    const {mutateAsync: detachForm, isPending: isDetaching} = useDetachFormFromPost();

    // Fetch posts and pages for direct embed
    const {data: postsData, isLoading: isLoadingPosts} = useBrowsePosts({
        searchParams: {limit: 'all', fields: 'id,title,slug,status,updated_at'}
    });
    const {data: pagesData, isLoading: isLoadingPages} = useBrowsePages({
        searchParams: {limit: 'all', fields: 'id,title,slug,status,updated_at'}
    });

    // Fetch posts currently with this form attached
    const {data: attachedData, isLoading: isLoadingAttached, refetch: refetchAttached} = useBrowseFormAttachedPosts(activeFormId, {
        enabled: Boolean(open && activeFormId)
    });

    const [activeTab, setActiveTab] = useState<'fields' | 'css' | 'embed' | 'preview'>('fields');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'active' | 'archived'>('active');
    const [fields, setFields] = useState<FormField[]>([]);
    const [customCss, setCustomCss] = useState('');
    const [nameError, setNameError] = useState('');
    const [successTitle, setSuccessTitle] = useState('Your form was successfully submitted!');
    const [successMessage, setSuccessMessage] = useState('Thank you! Your response has been recorded.');
    const [previewMode, setPreviewMode] = useState<'form' | 'success'>('form');

    // Embed & Attach state
    const [selectedTargetId, setSelectedTargetId] = useState<string>('');
    const [placement, setPlacement] = useState<'end' | 'start'>('end');
    const [copied, setCopied] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);

    const posts = postsData?.posts || [];
    const pages = pagesData?.pages || [];
    const attachedPosts = attachedData?.posts || [];
    const attachedIds = new Set(attachedPosts.map(p => p.id));
    const availablePosts = posts.filter(p => !attachedIds.has(p.id));
    const availablePages = pages.filter(p => !attachedIds.has(p.id));
    const isLoadingOptions = isLoadingPosts || isLoadingPages;

    useEffect(() => {
        setCurrentForm(form || null);
        setActiveTab('fields');
        setSelectedTargetId('');
        setStatusMessage(null);
        setPreviewMode('form');

        if (form) {
            setName(form.name || '');
            setDescription(form.description || '');
            setStatus(form.status || 'active');

            let parsed: FormSchema = {fields: []};
            if (typeof form.schema === 'string') {
                try {
                    parsed = JSON.parse(form.schema) as FormSchema;
                } catch {
                    parsed = {fields: []};
                }
            } else if (form.schema && Array.isArray(form.schema.fields)) {
                parsed = form.schema;
            }
            setFields(parsed.fields || []);
            setCustomCss(parsed.custom_css || form.custom_css || '');
            setSuccessTitle(parsed.success_title || 'Your form was successfully submitted!');
            setSuccessMessage(parsed.success_message || 'Thank you! Your response has been recorded.');
        } else {
            setName('');
            setDescription('');
            setStatus('active');
            setCustomCss('');
            setSuccessTitle('Your form was successfully submitted!');
            setSuccessMessage('Thank you! Your response has been recorded.');
            // Default fields for a starter contact form
            setFields([
                {id: 'field_name', name: 'name', label: 'Your Name', type: 'text', required: true, placeholder: 'Jane Doe'},
                {id: 'field_email', name: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'jane@example.com'},
                {id: 'field_message', name: 'message', label: 'Message', type: 'textarea', required: true, placeholder: 'How can we help you?'}
            ]);
        }
        setNameError('');
    }, [form, open]);

    const addField = (type: FormFieldType) => {
        const id = `field_${Date.now()}`;
        const count = fields.filter(f => f.type === type).length + 1;
        let defaultPlaceholder = '';
        let defaultOptions: string[] | undefined;

        if (type === 'select' || type === 'radio') {
            defaultOptions = ['Option 1', 'Option 2', 'Option 3'];
        } else if (type === 'phone') {
            defaultPlaceholder = '+1 (555) 000-0000';
        } else if (type === 'url') {
            defaultPlaceholder = 'https://example.com';
        } else if (type === 'date') {
            defaultPlaceholder = 'YYYY-MM-DD';
        } else if (type === 'time') {
            defaultPlaceholder = 'HH:MM';
        } else if (type === 'rating') {
            defaultPlaceholder = 'Rate 1 to 5 stars';
        }

        const newField: FormField = {
            id,
            name: `${type}_${count}`,
            label: `${FIELD_TYPES.find(ft => ft.type === type)?.label || 'Field'} ${count}`,
            type,
            required: false,
            placeholder: defaultPlaceholder,
            options: defaultOptions
        };
        setFields(prev => [...prev, newField]);
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        setFields(prev => prev.map(f => (f.id === id ? {...f, ...updates} : f)));
    };

    const removeField = (id: string) => {
        setFields(prev => prev.filter(f => f.id !== id));
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= fields.length) {
            return;
        }
        setFields((prev) => {
            const copy = [...prev];
            const item = copy.splice(index, 1)[0];
            copy.splice(targetIndex, 0, item);
            return copy;
        });
    };

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const smartScriptSnippet = activeFormId
        ? `<script src="${origin}/ghost/api/content/forms/${activeFormId}/embed.js" async></script>`
        : `<script src="${origin}/ghost/api/content/forms/[form-id]/embed.js" async></script>`;

    const smartDivSnippet = activeFormId
        ? `<div data-ghost-form="${activeFormId}"></div>\n<script src="${origin}/ghost/api/content/forms/${activeFormId}/embed.js" async></script>`
        : `<div data-ghost-form="[form-id]"></div>\n<script src="${origin}/ghost/api/content/forms/[form-id]/embed.js" async></script>`;

    const endpointUrl = activeFormId
        ? `${origin}/ghost/api/content/forms/${activeFormId}/submissions`
        : `${origin}/ghost/api/content/forms/[form-id]/submissions`;

    const handleCopy = (text: string, type: string) => {
        void navigator.clipboard.writeText(text);
        setCopied(type);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(null), 2000);
    };

    const handleSave = async (closeAfter: boolean = false) => {
        if (!name.trim()) {
            setNameError('Form name is required');
            setActiveTab('fields');
            return;
        }

        const schemaPayload: FormSchema = {
            fields: fields.map(f => ({
                id: f.id,
                name: f.name || f.id,
                label: f.label || 'Untitled Field',
                type: f.type,
                required: Boolean(f.required),
                placeholder: f.placeholder || '',
                options: (f.type === 'select' || f.type === 'radio') ? (f.options || []) : undefined
            })),
            custom_css: customCss.trim(),
            success_title: successTitle.trim() || undefined,
            success_message: successMessage.trim() || undefined
        };

        const payload = {
            name: name.trim(),
            description: description.trim(),
            status,
            schema: JSON.stringify(schemaPayload)
        };

        try {
            let savedForm: Form;
            if (isEditing && activeFormId) {
                const res = await editForm({id: activeFormId, ...payload});
                savedForm = res.forms[0] || {...currentForm!, ...payload};
            } else {
                const res = await createForm(payload);
                savedForm = res.forms[0];
            }

            // If a post or page was selected to attach to, attach it now
            if (selectedTargetId && savedForm?.id) {
                try {
                    await attachForm({
                        formId: savedForm.id,
                        postId: selectedTargetId,
                        placement
                    });
                    setSelectedTargetId('');
                    if (isEditing) {
                        await refetchAttached();
                    }
                } catch (attachErr: unknown) {
                    const msg = attachErr instanceof Error ? attachErr.message : 'Form created, but attaching to post failed.';
                    toast.error(msg);
                }
            }

            invalidateForms();

            if (closeAfter) {
                toast.success(isEditing ? 'Form updated successfully!' : 'Form created successfully!');
                onOpenChange(false);
            } else if (!isEditing) {
                // First-time creation: set current form, show toast, and show Embed tab
                setCurrentForm(savedForm);
                toast.success(selectedTargetId ? 'Form created and attached to post!' : 'Form created successfully!');
                setActiveTab('embed');
            } else {
                toast.success('Form updated successfully!');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to save form';
            toast.error(msg);
        }
    };

    const handleAttachCurrent = async () => {
        if (!selectedTargetId || !activeFormId) {
            return;
        }
        try {
            setStatusMessage(null);
            await attachForm({
                formId: activeFormId,
                postId: selectedTargetId,
                placement
            });
            await refetchAttached();
            setSelectedTargetId('');
            setStatusMessage({type: 'success', text: 'Form successfully attached to post!'});
            toast.success('Form attached to post successfully!');
            setTimeout(() => setStatusMessage(null), 4000);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to attach form to post.';
            setStatusMessage({type: 'error', text: msg});
            toast.error(msg);
        }
    };

    const handleDetachCurrent = async (postId: string) => {
        if (!activeFormId) {
            return;
        }
        try {
            setStatusMessage(null);
            await detachForm({
                formId: activeFormId,
                postId
            });
            await refetchAttached();
            setStatusMessage({type: 'success', text: 'Form successfully detached from post.'});
            toast.success('Form detached from post.');
            setTimeout(() => setStatusMessage(null), 4000);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to detach form.';
            setStatusMessage({type: 'error', text: msg});
            toast.error(msg);
        }
    };

    const isSaving = isCreating || isEditingPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
                <DialogHeader className="border-b border-border-default p-6 pb-2">
                    <DialogTitle>{isEditing ? `Edit Form: ${name || currentForm?.name}` : 'Create New Form'}</DialogTitle>
                    <DialogDescription>
                        Design your form fields, configure responses, and embed directly into any Ghost Post or Page.
                    </DialogDescription>
                </DialogHeader>

                <Tabs className="flex flex-1 flex-col overflow-hidden" value={activeTab} onValueChange={(val: string) => setActiveTab(val as 'fields' | 'css' | 'embed' | 'preview')}>
                    <div className="border-b border-border-default px-6">
                        <TabsList className="grid w-full max-w-lg grid-cols-4">
                            <TabsTrigger value="fields">Fields Builder</TabsTrigger>
                            <TabsTrigger value="css">Custom CSS</TabsTrigger>
                            <TabsTrigger value="embed">
                                Embed & Share
                                {attachedPosts.length > 0 && (
                                    <Badge className="ml-1.5 h-4 px-1 text-[10px]" variant="secondary">
                                        {attachedPosts.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="preview">Live Preview</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Tab 1: Fields Builder */}
                        <TabsContent className="m-0 space-y-6" value="fields">
                            {/* General Settings */}
                            <Card className="border border-border-default">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Form Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-name">Form Name <span className="text-destructive">*</span></Label>
                                            <Input
                                                id="form-name"
                                                placeholder="e.g. Contact Us, Survey, Feedback"
                                                value={name}
                                                onChange={(e) => {
                                                    setName(e.target.value);
                                                    if (e.target.value) {
                                                        setNameError('');
                                                    }
                                                }}
                                            />
                                            {nameError && <Text className="text-destructive" size="sm">{nameError}</Text>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-status">Status</Label>
                                            <Select value={status} onValueChange={(val: 'active' | 'archived') => setStatus(val)}>
                                                <SelectTrigger id="form-status">
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">Active (Accepting Submissions)</SelectItem>
                                                    <SelectItem value="archived">Archived (Closed)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="form-desc">Description (Optional)</Label>
                                        <Input
                                            id="form-desc"
                                            placeholder="A short subtitle or instructions displayed above the fields"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                        />
                                    </div>

                                    {/* Quick Embed Option at Form Creation */}
                                    <div className="bg-surface-elevated-1 space-y-1.5 rounded-lg border border-border-default p-3.5">
                                        <Inline align="center" gap="xs">
                                            <LucideIcon.Link className="size-4 text-primary" />
                                            <Label className="text-xs font-semibold" htmlFor="quick-attach-select">
                                                Quick Attach to Post or Page (Optional)
                                            </Label>
                                        </Inline>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <div className="sm:col-span-2">
                                                <Select
                                                    disabled={isLoadingOptions}
                                                    value={selectedTargetId}
                                                    onValueChange={setSelectedTargetId}
                                                >
                                                    <SelectTrigger id="quick-attach-select">
                                                        <SelectValue placeholder={isLoadingOptions ? 'Loading posts and pages...' : 'Choose a post or page...'} />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-60">
                                                        <SelectItem value="none">-- None (Don&apos;t attach yet) --</SelectItem>
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
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Select value={placement} onValueChange={(val: 'end' | 'start') => setPlacement(val)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="end">End of Content</SelectItem>
                                                        <SelectItem value="start">Top of Content</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <Text size="xs" tone="secondary">
                                            {selectedTargetId && selectedTargetId !== 'none'
                                                ? 'Form will be automatically embedded and published on the selected post/page upon creation.'
                                                : 'You can choose to attach it directly here or customize dynamic script tags in the Embed & Share tab.'}
                                        </Text>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Submission Success Screen */}
                            <Card className="border border-border-default">
                                <CardHeader className="pb-3">
                                    <Inline align="center" gap="xs">
                                        <LucideIcon.CheckCircle2 className="size-4 text-green-600" />
                                        <CardTitle className="text-base">Submission Success Screen</CardTitle>
                                    </Inline>
                                    <Text size="xs" tone="secondary">
                                        Customize the celebration title and thank-you message displayed to visitors immediately upon form submission.
                                    </Text>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="form-success-title">Success Title</Label>
                                        <Input
                                            id="form-success-title"
                                            placeholder="Your form was successfully submitted!"
                                            value={successTitle}
                                            onChange={e => setSuccessTitle(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="form-success-message">Success Message</Label>
                                        <Input
                                            id="form-success-message"
                                            placeholder="Thank you! Your response has been recorded."
                                            value={successMessage}
                                            onChange={e => setSuccessMessage(e.target.value)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Active Content Embeds (Displays where this form is live) */}
                            {activeFormId && (
                                <Card className="bg-surface-elevated-1 border border-border-default">
                                    <CardHeader className="pb-3">
                                        <Inline align="center" justify="between">
                                            <Inline align="center" gap="xs">
                                                <LucideIcon.CheckCircle2 className="size-4 text-green-600" />
                                                <CardTitle className="text-sm font-semibold">
                                                    Embedded In Content ({attachedPosts.length})
                                                </CardTitle>
                                            </Inline>
                                            <Button
                                                className="h-7 text-xs"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setActiveTab('embed')}
                                            >
                                                Manage Embeds
                                                <LucideIcon.ArrowRight className="ml-1 size-3" />
                                            </Button>
                                        </Inline>
                                        <Text size="xs" tone="secondary">
                                            Posts and pages where this form is currently embedded and collecting responses.
                                        </Text>
                                    </CardHeader>
                                    <CardContent className="space-y-2 pt-0">
                                        {isLoadingAttached ? (
                                            <div className="flex justify-center p-3">
                                                <LoadingIndicator size="sm" />
                                            </div>
                                        ) : attachedPosts.length === 0 ? (
                                            <div className="rounded-md border border-dashed border-border-default p-3 text-center">
                                                <Text size="xs" tone="secondary">
                                                    Not currently embedded in any posts or pages. Use &ldquo;Quick Attach&rdquo; above or the Embed &amp; Share tab.
                                                </Text>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {attachedPosts.map(p => (
                                                    <div
                                                        key={p.id}
                                                        className="flex items-center justify-between rounded-md border border-border-default bg-background p-2.5 shadow-xs"
                                                    >
                                                        <Inline align="center" gap="sm">
                                                            <Badge className="text-[10px] capitalize" variant="secondary">
                                                                {p.type || 'post'}
                                                            </Badge>
                                                            <Text className="text-xs font-semibold">
                                                                {p.title || '(Untitled)'}
                                                            </Text>
                                                            <Badge
                                                                className="text-[10px] capitalize"
                                                                variant={p.status === 'published' ? 'default' : 'outline'}
                                                            >
                                                                {p.status}
                                                            </Badge>
                                                        </Inline>
                                                        <Inline align="center" gap="xs">
                                                            <Button
                                                                className="h-7 text-xs"
                                                                size="sm"
                                                                variant="outline"
                                                                asChild
                                                            >
                                                                <a
                                                                    href={`#/editor/${p.type || 'post'}/${p.id}`}
                                                                    rel="noreferrer"
                                                                    target="_blank"
                                                                >
                                                                    <LucideIcon.ExternalLink className="mr-1 size-3" />
                                                                    Edit in Editor
                                                                </a>
                                                            </Button>
                                                            <Button
                                                                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                                                disabled={isDetaching}
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => void handleDetachCurrent(p.id)}
                                                            >
                                                                <LucideIcon.Trash2 className="mr-1 size-3" />
                                                                Detach
                                                            </Button>
                                                        </Inline>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Fields List */}
                            <div className="space-y-3">
                                <Inline align="center" justify="between">
                                    <div>
                                        <Text weight="semibold">Form Fields</Text>
                                        <Text size="sm" tone="secondary">Add, configure, and order the fields for this form.</Text>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="sm">
                                                <LucideIcon.Plus className="mr-1.5 size-4" />
                                                Add Field
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                Text & Contact
                                            </DropdownMenuLabel>
                                            {FIELD_TYPES.filter(ft => ft.category === 'text').map(ft => (
                                                <DropdownMenuItem
                                                    key={ft.type}
                                                    className="flex cursor-pointer items-center gap-2"
                                                    onClick={() => addField(ft.type)}
                                                >
                                                    {ft.icon}
                                                    <span>{ft.label}</span>
                                                </DropdownMenuItem>
                                            ))}

                                            <DropdownMenuSeparator />

                                            <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                Choices & Selection
                                            </DropdownMenuLabel>
                                            {FIELD_TYPES.filter(ft => ft.category === 'choice').map(ft => (
                                                <DropdownMenuItem
                                                    key={ft.type}
                                                    className="flex cursor-pointer items-center gap-2"
                                                    onClick={() => addField(ft.type)}
                                                >
                                                    {ft.icon}
                                                    <span>{ft.label}</span>
                                                </DropdownMenuItem>
                                            ))}

                                            <DropdownMenuSeparator />

                                            <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                Date & Rating
                                            </DropdownMenuLabel>
                                            {FIELD_TYPES.filter(ft => ft.category === 'date_rating').map(ft => (
                                                <DropdownMenuItem
                                                    key={ft.type}
                                                    className="flex cursor-pointer items-center gap-2"
                                                    onClick={() => addField(ft.type)}
                                                >
                                                    {ft.icon}
                                                    <span>{ft.label}</span>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </Inline>

                                {fields.length === 0 ? (
                                    <Box className="rounded-lg border border-dashed border-border-default p-8 text-center">
                                        <Text tone="secondary">No fields yet. Click &ldquo;Add Field&rdquo; above to get started.</Text>
                                    </Box>
                                ) : (
                                    <div className="space-y-3">
                                        {fields.map((field, idx) => (
                                            <Card key={field.id} className="bg-surface-elevated-1 border border-border-default">
                                                <CardContent className="space-y-3 p-4">
                                                    <Inline align="center" justify="between">
                                                        <Inline align="center" gap="sm">
                                                            <Badge className="font-mono text-xs capitalize" variant="secondary">
                                                                {field.type}
                                                            </Badge>
                                                            <Text size="sm" weight="medium">{field.label || 'Untitled Field'}</Text>
                                                            {field.required && (
                                                                <Badge className="text-[10px] text-destructive" variant="outline">
                                                                    Required
                                                                </Badge>
                                                            )}
                                                        </Inline>

                                                        <Inline align="center" gap="xs">
                                                            <Button
                                                                className="size-7 p-0"
                                                                disabled={idx === 0}
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => moveField(idx, 'up')}
                                                            >
                                                                <LucideIcon.ArrowUp className="size-3.5" />
                                                            </Button>
                                                            <Button
                                                                className="size-7 p-0"
                                                                disabled={idx === fields.length - 1}
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => moveField(idx, 'down')}
                                                            >
                                                                <LucideIcon.ArrowDown className="size-3.5" />
                                                            </Button>
                                                            <Button
                                                                className="size-7 p-0 text-muted-foreground hover:text-destructive"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => removeField(field.id)}
                                                            >
                                                                <LucideIcon.Trash2 className="size-3.5" />
                                                            </Button>
                                                        </Inline>
                                                    </Inline>

                                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Field Label</Label>
                                                            <Input
                                                                className="h-8 text-xs"
                                                                placeholder="Label shown to user"
                                                                value={field.label}
                                                                onChange={e => updateField(field.id, {label: e.target.value})}
                                                            />
                                                        </div>

                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Field Key</Label>
                                                            <Input
                                                                className="h-8 font-mono text-xs"
                                                                placeholder="field_key"
                                                                value={field.name}
                                                                onChange={e => updateField(field.id, {name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '_')})}
                                                            />
                                                        </div>

                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Placeholder</Label>
                                                            <Input
                                                                className="h-8 text-xs"
                                                                placeholder="Placeholder hint text"
                                                                value={field.placeholder || ''}
                                                                onChange={e => updateField(field.id, {placeholder: e.target.value})}
                                                            />
                                                        </div>
                                                    </div>

                                                    {(field.type === 'select' || field.type === 'radio') && (
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">
                                                                {field.type === 'radio' ? 'Choices (comma-separated)' : 'Options (comma-separated)'}
                                                            </Label>
                                                            <Input
                                                                className="h-8 text-xs"
                                                                placeholder="Option 1, Option 2, Option 3"
                                                                value={(field.options || []).join(', ')}
                                                                onChange={e => updateField(field.id, {
                                                                    options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                                                })}
                                                            />
                                                        </div>
                                                    )}

                                                    {field.type === 'rating' && (
                                                        <div className="rounded border border-border-default/60 bg-surface-elevated-2 p-2">
                                                            <Inline align="center" gap="xs">
                                                                <LucideIcon.Star className="size-3.5 fill-amber-400 text-amber-400" />
                                                                <Text size="xs" tone="secondary">5-star rating scale from 1 (lowest) to 5 (highest)</Text>
                                                            </Inline>
                                                        </div>
                                                    )}

                                                    <Inline align="center" gap="sm">
                                                        <Switch
                                                            checked={field.required}
                                                            id={`req-${field.id}`}
                                                            onCheckedChange={checked => updateField(field.id, {required: checked})}
                                                        />
                                                        <Label className="cursor-pointer text-xs" htmlFor={`req-${field.id}`}>
                                                            Required field
                                                        </Label>
                                                    </Inline>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* Tab 2: Custom CSS */}
                        <TabsContent className="m-0 space-y-6" value="css">
                            <Card className="border border-border-default">
                                <CardHeader className="pb-3">
                                    <Inline align="center" justify="between">
                                        <div>
                                            <CardTitle className="text-base">Custom CSS Styling</CardTitle>
                                            <Text size="xs" tone="secondary">Add custom styles to change colors, fonts, borders, and animations for this form.</Text>
                                        </div>
                                        {customCss && (
                                            <Button
                                                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setCustomCss('')}
                                            >
                                                <LucideIcon.Trash2 className="mr-1 size-3.5" />
                                                Clear CSS
                                            </Button>
                                        )}
                                    </Inline>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Text size="xs" weight="medium">Style Presets (click to apply):</Text>
                                        <div className="flex flex-wrap gap-2">
                                            {CSS_PRESETS.map(preset => (
                                                <Button
                                                    key={preset.name}
                                                    className="h-7 text-xs"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setCustomCss(preset.css)}
                                                >
                                                    <LucideIcon.Sparkles className="mr-1 size-3 text-primary" />
                                                    {preset.name}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs" htmlFor="form-custom-css">CSS Code</Label>
                                        <Textarea
                                            className="min-h-[220px] font-mono text-xs leading-relaxed"
                                            id="form-custom-css"
                                            placeholder={`/* Enter custom CSS rules here */\n.ghost-form-container {\n  background: #ffffff;\n  border-radius: 12px;\n}\n.ghost-form-btn {\n  background: #111827;\n}`}
                                            spellCheck={false}
                                            value={customCss}
                                            onChange={e => setCustomCss(e.target.value)}
                                        />
                                    </div>

                                    <div className="bg-surface-elevated-1 rounded-md border border-border-default p-3">
                                        <Text className="mb-2 block text-xs font-semibold">Available CSS Selectors Reference:</Text>
                                        <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                                            <div><code className="font-mono font-semibold text-primary">.ghost-form-container</code> - Outer card box</div>
                                            <div><code className="font-mono font-semibold text-primary">.ghost-form-title</code> - Form header title</div>
                                            <div><code className="font-mono font-semibold text-primary">.ghost-form-description</code> - Description text</div>
                                            <div><code className="font-mono font-semibold text-primary">.ghost-form-group</code> - Field container wrapper</div>
                                            <div><code className="font-mono font-semibold text-primary">.ghost-form-label</code> - Field labels</div>
                                            <div><code className="font-mono font-semibold text-primary">.ghost-form-input</code> - Inputs, textareas, selects</div>
                                            <div><code className="font-mono font-semibold text-primary">.ghost-form-btn</code> - Submit button</div>
                                            <div><code className="font-mono font-semibold text-primary">.ghost-form-msg</code> - Success/error message</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 3: Embed & Share */}
                        <TabsContent className="m-0 space-y-6" value="embed">
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

                            {/* Section 1: 1-Click Direct Post / Page Attachment */}
                            <Card className="border border-border-default">
                                <CardHeader className="pb-3">
                                    <Inline align="center" justify="between">
                                        <div>
                                            <CardTitle className="text-base">Attach Directly to Post or Page</CardTitle>
                                            <Text size="xs" tone="secondary">
                                                Embed this form directly into any Ghost post or page with zero copy-pasting. Safe lifecycle management automatically cleans up attachments if this form is removed.
                                            </Text>
                                        </div>
                                    </Inline>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div className="sm:col-span-2">
                                            <Label className="mb-1 block text-xs font-medium" htmlFor="embed-attach-select">
                                                Select Post or Page
                                            </Label>
                                            <Select
                                                disabled={isLoadingOptions}
                                                value={selectedTargetId}
                                                onValueChange={setSelectedTargetId}
                                            >
                                                <SelectTrigger className="w-full" id="embed-attach-select">
                                                    <SelectValue placeholder={isLoadingOptions ? 'Loading posts and pages...' : 'Choose a post or page...'} />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60">
                                                    <SelectItem value="none">-- None / Select a target --</SelectItem>
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
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label className="mb-1 block text-xs font-medium">Placement</Label>
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

                                    {activeFormId ? (
                                        <div className="flex justify-end">
                                            <Button
                                                disabled={!selectedTargetId || selectedTargetId === 'none' || isAttaching}
                                                size="sm"
                                                onClick={() => void handleAttachCurrent()}
                                            >
                                                {isAttaching ? (
                                                    <>
                                                        <LoadingIndicator size="sm" />
                                                        Attaching...
                                                    </>
                                                ) : (
                                                    <>
                                                        <LucideIcon.Plus className="mr-1 size-3.5" />
                                                        Attach to Post/Page
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Text size="xs" tone="secondary">
                                            When you click &ldquo;Create Form&rdquo; below, the form will be automatically saved and attached to this selection.
                                        </Text>
                                    )}

                                    {/* Active attachments list for this form */}
                                    {activeFormId && (
                                        <Stack className="pt-2" gap="xs">
                                            <Text className="font-semibold" size="xs">
                                                Active Content Attachments ({attachedPosts.length})
                                            </Text>
                                            {isLoadingAttached ? (
                                                <div className="flex justify-center p-4">
                                                    <LoadingIndicator size="sm" />
                                                </div>
                                            ) : attachedPosts.length === 0 ? (
                                                <Text size="xs" tone="secondary">
                                                    Not currently attached to any posts or pages.
                                                </Text>
                                            ) : (
                                                <div className="bg-surface-elevated-1 overflow-hidden rounded-md border border-border-default">
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
                                                                    <TableCell className="text-xs font-medium">
                                                                        {p.title || '(Untitled)'}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge className="text-[10px] capitalize" variant="secondary">
                                                                            {p.type || 'post'}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge
                                                                            className="text-[10px] capitalize"
                                                                            variant={p.status === 'published' ? 'default' : 'outline'}
                                                                        >
                                                                            {p.status}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Inline align="center" gap="xs" justify="end">
                                                                            <Button
                                                                                className="h-7 text-xs"
                                                                                size="sm"
                                                                                variant="outline"
                                                                                asChild
                                                                            >
                                                                                <a
                                                                                    href={`#/editor/${p.type || 'post'}/${p.id}`}
                                                                                    rel="noreferrer"
                                                                                    target="_blank"
                                                                                >
                                                                                    <LucideIcon.ExternalLink className="mr-1 size-3" />
                                                                                    Edit in Editor
                                                                                </a>
                                                                            </Button>
                                                                            <Button
                                                                                className="h-7 text-xs"
                                                                                disabled={isDetaching}
                                                                                size="sm"
                                                                                variant="destructive"
                                                                                onClick={() => void handleDetachCurrent(p.id)}
                                                                            >
                                                                                <LucideIcon.Trash2 className="mr-1 size-3" />
                                                                                Detach
                                                                            </Button>
                                                                        </Inline>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </Stack>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Section 2: Smart Dynamic Script Embed */}
                            <Card className="border border-border-default">
                                <CardHeader className="pb-3">
                                    <Inline align="center" gap="xs">
                                        <LucideIcon.Code className="size-4 text-primary" />
                                        <CardTitle className="text-base">Smart Dynamic Embed Script</CardTitle>
                                    </Inline>
                                    <Text size="xs" tone="secondary">
                                        Insert this 1-line script into any Ghost HTML card, theme file, or external website. It loads asynchronously, renders custom CSS, and syncs form field updates automatically.
                                    </Text>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Stack gap="xs">
                                        <Text className="text-xs font-semibold text-muted-foreground uppercase">
                                            Single-Line Script (Auto-places form right where inserted)
                                        </Text>
                                        <div className="relative rounded-md border border-border-default bg-surface-elevated-2 p-3 font-mono text-xs">
                                            <pre className="overflow-x-auto whitespace-pre-wrap">{smartScriptSnippet}</pre>
                                            <Button
                                                className="absolute top-2 right-2 h-7 text-xs"
                                                disabled={!activeFormId}
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
                                            Explicit Container Snippet (For targeted layout placement)
                                        </Text>
                                        <div className="relative rounded-md border border-border-default bg-surface-elevated-2 p-3 font-mono text-xs">
                                            <pre className="overflow-x-auto whitespace-pre-wrap">{smartDivSnippet}</pre>
                                            <Button
                                                className="absolute top-2 right-2 h-7 text-xs"
                                                disabled={!activeFormId}
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
                                </CardContent>
                            </Card>

                            {/* Section 3: REST API Endpoint */}
                            <Card className="border border-border-default">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">REST API Endpoint</CardTitle>
                                    <Text size="xs" tone="secondary">
                                        Submit responses programmatically from React/Next.js frontends or mobile apps.
                                    </Text>
                                </CardHeader>
                                <CardContent>
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
                                            className="absolute top-2 right-2 h-7 text-xs"
                                            disabled={!activeFormId}
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
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 4: Live Preview */}
                        <TabsContent className="m-0 flex flex-col items-center py-4" value="preview">
                            {/* Toggle between Form View and Success Screen View */}
                            <div className="bg-surface-elevated-1 mb-5 inline-flex rounded-lg border border-border-default p-1">
                                <Button
                                    className="h-8 px-4 text-xs font-medium"
                                    size="sm"
                                    variant={previewMode === 'form' ? 'secondary' : 'ghost'}
                                    onClick={() => setPreviewMode('form')}
                                >
                                    Form View
                                </Button>
                                <Button
                                    className="h-8 px-4 text-xs font-medium"
                                    size="sm"
                                    variant={previewMode === 'success' ? 'secondary' : 'ghost'}
                                    onClick={() => setPreviewMode('success')}
                                >
                                    <LucideIcon.CheckCircle2 className="mr-1.5 size-3.5 text-green-600" />
                                    Celebration Success Screen
                                </Button>
                            </div>

                            <div className="ghost-form-preview-wrapper w-full max-w-xl">
                                {customCss && (
                                    <style dangerouslySetInnerHTML={{__html: sanitizeCustomCss(customCss)}} />
                                )}
                                <div className="ghost-form-container rounded-2xl border border-border-default bg-card p-8 text-card-foreground shadow-sm">
                                    {previewMode === 'form' ? (
                                        <>
                                            <div className="mb-6 space-y-1.5">
                                                <h3 className="ghost-form-title text-2xl font-bold">{name || 'Untitled Form'}</h3>
                                                {description && <p className="ghost-form-description text-base text-muted-foreground">{description}</p>}
                                            </div>
                                            <div className="ghost-form space-y-5">
                                                {fields.length === 0 ? (
                                                    <Text className="block py-6 text-center" size="sm" tone="secondary">
                                                        No fields to preview. Add fields in the Fields Builder tab.
                                                    </Text>
                                                ) : (
                                                    fields.map(f => (
                                                        <div key={f.id} className="ghost-form-group space-y-2">
                                                            {f.type !== 'checkbox' && (
                                                                <Label className="ghost-form-label text-[15px] font-semibold text-foreground">
                                                                    {f.label || f.name}
                                                                    {f.required && <span className="ml-0.5 text-destructive">*</span>}
                                                                </Label>
                                                            )}

                                                            {f.type === 'textarea' ? (
                                                                <Textarea className="ghost-form-input min-h-[120px] text-base" placeholder={f.placeholder} rows={4} disabled />
                                                            ) : f.type === 'select' ? (
                                                                <Select disabled>
                                                                    <SelectTrigger className="ghost-form-input min-h-[48px] text-base">
                                                                        <SelectValue placeholder={f.placeholder || 'Select an option'} />
                                                                    </SelectTrigger>
                                                                </Select>
                                                            ) : f.type === 'checkbox' ? (
                                                                <Inline align="center" gap="sm">
                                                                    <Checkbox className="ghost-form-checkbox size-5" id={`prev-${f.id}`} disabled />
                                                                    <Label className="ghost-form-label cursor-pointer text-[15px] font-medium text-foreground" htmlFor={`prev-${f.id}`}>
                                                                        {f.label || f.name}
                                                                        {f.required && <span className="ml-0.5 text-destructive">*</span>}
                                                                    </Label>
                                                                </Inline>
                                                            ) : f.type === 'radio' ? (
                                                                <div className="space-y-2 pt-1">
                                                                    {(f.options && f.options.length > 0 ? f.options : ['Option 1', 'Option 2', 'Option 3']).map(opt => (
                                                                        <Inline key={`prev-radio-${f.id}-${opt}`} align="center" gap="sm">
                                                                            <input
                                                                                className="size-4.5 accent-foreground"
                                                                                name={`prev-radio-${f.id}`}
                                                                                type="radio"
                                                                                disabled
                                                                            />
                                                                            <span className="text-[15px]">{opt}</span>
                                                                        </Inline>
                                                                    ))}
                                                                </div>
                                                            ) : f.type === 'rating' ? (
                                                                <Inline align="center" className="pt-1" gap="xs">
                                                                    {[1, 2, 3, 4, 5].map(star => (
                                                                        <LucideIcon.Star
                                                                            key={star}
                                                                            className="size-7 fill-amber-400 text-amber-400"
                                                                        />
                                                                    ))}
                                                                </Inline>
                                                            ) : (
                                                                <Input
                                                                    className="ghost-form-input min-h-[48px] text-base"
                                                                    placeholder={f.placeholder}
                                                                    type={f.type === 'phone' ? 'tel' : f.type}
                                                                    disabled
                                                                />
                                                            )}
                                                        </div>
                                                    ))
                                                )}

                                                {fields.length > 0 && (
                                                    <Button className="ghost-form-btn mt-6 min-h-[50px] w-full text-base font-semibold" disabled>
                                                        Submit
                                                    </Button>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="ghost-form-success flex flex-col items-center py-4 text-center">
                                            <svg
                                                className="mx-auto block"
                                                fill="none"
                                                height="140"
                                                viewBox="0 0 200 200"
                                                width="140"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <circle cx="100" cy="100" fill="#f0f7ff" r="92" stroke="#e0f2fe" strokeWidth="1.5" />
                                                <path d="M 44 46 C 49 40, 55 40, 60 46 C 65 52, 71 52, 76 46" fill="none" stroke="#2dd4bf" strokeLinecap="round" strokeWidth="3" />
                                                <path d="M 148 64 C 153 58, 159 58, 164 64 C 169 70, 175 70, 180 64" fill="none" stroke="#38bdf8" strokeLinecap="round" strokeWidth="2.5" />
                                                <path d="M 28 92 C 32 89, 36 87, 37 84" fill="none" stroke="#38bdf8" strokeLinecap="round" strokeWidth="2.5" />
                                                <circle cx="42" cy="100" fill="none" r="5" stroke="#f472b6" strokeWidth="2" />
                                                <circle cx="158" cy="106" fill="none" r="5.5" stroke="#f472b6" strokeWidth="2" />
                                                <circle cx="126" cy="154" fill="none" r="5" stroke="#67e8f9" strokeWidth="2" />
                                                <circle cx="97" cy="42" fill="#f472b6" r="2.5" />
                                                <circle cx="48" cy="78" fill="#f472b6" r="2.5" />
                                                <circle cx="68" cy="138" fill="#f472b6" r="2.5" />
                                                <circle cx="51" cy="120" fill="#5eead4" fillOpacity="0.9" r="7" />
                                                <circle cx="147" cy="76" fill="#fde047" r="2" />
                                                <circle cx="157" cy="124" fill="#fde047" r="2" />
                                                <polygon fill="#38bdf8" points="110,26 117,33 108,37" />
                                                <polygon fill="#fde047" points="132,46 140,54 126,55" />
                                                <polygon fill="#6ee7b7" points="56,60 52,68 62,67" />
                                                <polygon fill="#6ee7b7" points="144,136 150,144 140,145" />
                                                <polygon fill="#fde047" points="168,88 174,96 166,101 160,93" />
                                                <circle cx="100" cy="100" fill="#e8fdf0" r="46" stroke="#22c55e" strokeWidth="7" />
                                                <path d="M 80 100 L 94 114 L 122 84" fill="none" stroke="#22c55e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
                                            </svg>
                                            <h3 className="ghost-form-success-title mt-6 text-2xl font-bold text-foreground">
                                                {successTitle || 'Your form was successfully submitted!'}
                                            </h3>
                                            <p className="ghost-form-success-desc mt-2 text-base text-muted-foreground">
                                                {successMessage || 'Thank you! Your response has been recorded.'}
                                            </p>
                                            <Button
                                                className="ghost-form-reset-btn mt-6"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setPreviewMode('form')}
                                            >
                                                Submit another response
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </div>

                    <DialogFooter className="border-t border-border-default p-4">
                        <Inline align="center" className="w-full" justify="between">
                            <div>
                                {activeFormId ? (
                                    <Text size="xs" tone="secondary">
                                        Form ID: <code className="font-mono font-semibold text-foreground">{activeFormId}</code>
                                    </Text>
                                ) : (
                                    <Text size="xs" tone="secondary">
                                        {selectedTargetId && selectedTargetId !== 'none'
                                            ? 'Ready to create and attach to selected content'
                                            : 'Configure fields & optional embed targets'}
                                    </Text>
                                )}
                            </div>
                            <Inline gap="sm">
                                <Button variant="outline" onClick={() => onOpenChange(false)}>
                                    {activeFormId && activeTab === 'embed' ? 'Close' : 'Cancel'}
                                </Button>
                                {!activeFormId ? (
                                    <Button disabled={isSaving} onClick={() => { void handleSave(true); }}>
                                        {isSaving ? 'Creating...' : 'Create Form'}
                                    </Button>
                                ) : activeTab === 'embed' ? (
                                    <Button onClick={() => onOpenChange(false)}>
                                        Done
                                    </Button>
                                ) : (
                                    <Button disabled={isSaving} onClick={() => { void handleSave(true); }}>
                                        {isSaving ? 'Saving...' : 'Update Form'}
                                    </Button>
                                )}
                            </Inline>
                        </Inline>
                    </DialogFooter>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default FormBuilderModal;
