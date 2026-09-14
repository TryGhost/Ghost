import React, {useState, useEffect} from 'react';
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Textarea} from '@tryghost/shade/components';
import {Box, Inline, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {useCreateForm, useEditForm, useInvalidateForms, type Form, type FormField, type FormFieldType, type FormSchema} from '@tryghost/admin-x-framework/api/forms';

interface FormBuilderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form?: Form | null;
}

const FIELD_TYPES: {type: FormFieldType; label: string; icon: React.ReactNode}[] = [
    {type: 'text', label: 'Short Text', icon: <LucideIcon.Type className="size-4" />},
    {type: 'email', label: 'Email Address', icon: <LucideIcon.Mail className="size-4" />},
    {type: 'textarea', label: 'Long Text', icon: <LucideIcon.AlignLeft className="size-4" />},
    {type: 'number', label: 'Number', icon: <LucideIcon.Hash className="size-4" />},
    {type: 'select', label: 'Dropdown Select', icon: <LucideIcon.ListFilter className="size-4" />},
    {type: 'checkbox', label: 'Checkbox', icon: <LucideIcon.CheckSquare className="size-4" />}
];

const CSS_PRESETS = [
    {
        name: 'Dark Elegance',
        css: `/* Modern Dark Aesthetic */
.ghost-form-container {
  background: #18181b !important;
  color: #f4f4f5 !important;
  border: 1px solid #27272a !important;
  border-radius: 1rem !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4) !important;
}
.ghost-form-title {
  color: #fafafa !important;
}
.ghost-form-description {
  color: #a1a1aa !important;
}
.ghost-form-label {
  color: #d4d4d8 !important;
}
.ghost-form-input {
  background: #27272a !important;
  color: #ffffff !important;
  border: 1px solid #3f3f46 !important;
  border-radius: 0.5rem !important;
}
.ghost-form-input:focus {
  border-color: #3b82f6 !important;
  outline: 2px solid rgba(59, 130, 246, 0.3) !important;
}
.ghost-form-btn {
  background: #3b82f6 !important;
  color: #ffffff !important;
  border-radius: 0.5rem !important;
  font-weight: 600 !important;
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
  padding: 1.5rem 0 !important;
  box-shadow: none !important;
}
.ghost-form-input {
  border: none !important;
  border-bottom: 2px solid #e2e8f0 !important;
  border-radius: 0 !important;
  padding-left: 0 !important;
  background: transparent !important;
}
.ghost-form-input:focus {
  border-bottom-color: #0f172a !important;
  outline: none !important;
}
.ghost-form-btn {
  background: #0f172a !important;
  color: #ffffff !important;
  border-radius: 9999px !important;
  letter-spacing: 0.05em !important;
  text-transform: uppercase !important;
  font-size: 0.75rem !important;
}`
    },
    {
        name: 'Soft Rounded Card',
        css: `/* Soft Gradient & Rounded */
.ghost-form-container {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 1.5rem !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.02) !important;
  padding: 2.25rem !important;
}
.ghost-form-input {
  border-radius: 0.75rem !important;
  border-color: #cbd5e1 !important;
  background: #f8fafc !important;
}
.ghost-form-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
  color: #ffffff !important;
  border-radius: 0.75rem !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35) !important;
}`
    },
    {
        name: 'Accent Glow',
        css: `/* Vibrant Accent Border */
.ghost-form-container {
  border: 2px solid #06b6d4 !important;
  border-radius: 1rem !important;
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.15) !important;
}
.ghost-form-btn {
  background: #06b6d4 !important;
  color: #ffffff !important;
  border-radius: 0.5rem !important;
  font-weight: 700 !important;
}`
    }
];

export const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
    open,
    onOpenChange,
    form
}) => {
    const isEditing = Boolean(form?.id);
    const {mutateAsync: createForm, isPending: isCreating} = useCreateForm();
    const {mutateAsync: editForm, isPending: isEditingPending} = useEditForm();
    const invalidateForms = useInvalidateForms();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'active' | 'archived'>('active');
    const [fields, setFields] = useState<FormField[]>([]);
    const [customCss, setCustomCss] = useState('');
    const [nameError, setNameError] = useState('');

    useEffect(() => {
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
        } else {
            setName('');
            setDescription('');
            setStatus('active');
            setCustomCss('');
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
        const newField: FormField = {
            id,
            name: `${type}_${count}`,
            label: `${FIELD_TYPES.find(ft => ft.type === type)?.label || 'Field'} ${count}`,
            type,
            required: false,
            placeholder: '',
            options: type === 'select' ? ['Option 1', 'Option 2', 'Option 3'] : undefined
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

    const handleSave = async () => {
        if (!name.trim()) {
            setNameError('Form name is required');
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
                options: f.type === 'select' ? (f.options || []) : undefined
            })),
            custom_css: customCss.trim()
        };

        const payload = {
            name: name.trim(),
            description: description.trim(),
            status,
            schema: JSON.stringify(schemaPayload)
        };

        try {
            if (isEditing && form?.id) {
                await editForm({id: form.id, ...payload});
            } else {
                await createForm(payload);
            }
            invalidateForms();
            onOpenChange(false);
        } catch {
            // Handled by react-query error state
        }
    };

    const isSaving = isCreating || isEditingPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
                <DialogHeader className="border-b border-border-default p-6 pb-2">
                    <DialogTitle>{isEditing ? `Edit Form: ${form?.name}` : 'Create New Form'}</DialogTitle>
                    <DialogDescription>
                        Design your form fields, configure responses, and collect user submissions natively.
                    </DialogDescription>
                </DialogHeader>

                <Tabs className="flex flex-1 flex-col overflow-hidden" defaultValue="fields">
                    <div className="border-b border-border-default px-6">
                        <TabsList className="grid w-full max-w-md grid-cols-3">
                            <TabsTrigger value="fields">Fields Builder</TabsTrigger>
                            <TabsTrigger value="css">Custom CSS</TabsTrigger>
                            <TabsTrigger value="preview">Live Preview</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
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
                                </CardContent>
                            </Card>

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
                                        <DropdownMenuContent align="end" className="w-48">
                                            {FIELD_TYPES.map(ft => (
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

                                                    {field.type === 'select' && (
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Options (comma-separated)</Label>
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

                        {/* Custom CSS Tab */}
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

                        {/* Live Preview */}
                        <TabsContent className="m-0 flex justify-center py-6" value="preview">
                            <div className="ghost-form-preview-wrapper w-full max-w-lg">
                                {customCss && (
                                    <style dangerouslySetInnerHTML={{__html: customCss}} />
                                )}
                                <div className="ghost-form-container rounded-lg border border-border-default bg-card p-6 text-card-foreground shadow-sm">
                                    <div className="mb-4 space-y-1">
                                        <h3 className="ghost-form-title text-xl font-bold">{name || 'Untitled Form'}</h3>
                                        {description && <p className="ghost-form-description text-sm text-muted-foreground">{description}</p>}
                                    </div>
                                    <div className="ghost-form space-y-4">
                                        {fields.length === 0 ? (
                                            <Text className="block py-6 text-center" size="sm" tone="secondary">
                                                No fields to preview. Add fields in the Fields Builder tab.
                                            </Text>
                                        ) : (
                                            fields.map(f => (
                                                <div key={f.id} className="ghost-form-group space-y-1.5">
                                                    {f.type !== 'checkbox' && (
                                                        <Label className="ghost-form-label text-sm font-medium">
                                                            {f.label || f.name}
                                                            {f.required && <span className="ml-0.5 text-destructive">*</span>}
                                                        </Label>
                                                    )}

                                                    {f.type === 'textarea' ? (
                                                        <Textarea className="ghost-form-input" placeholder={f.placeholder} rows={3} disabled />
                                                    ) : f.type === 'select' ? (
                                                        <Select disabled>
                                                            <SelectTrigger className="ghost-form-input">
                                                                <SelectValue placeholder={f.placeholder || 'Select an option'} />
                                                            </SelectTrigger>
                                                        </Select>
                                                    ) : f.type === 'checkbox' ? (
                                                        <Inline align="center" gap="sm">
                                                            <Checkbox className="ghost-form-checkbox" id={`prev-${f.id}`} disabled />
                                                            <Label className="ghost-form-label cursor-pointer text-sm font-medium" htmlFor={`prev-${f.id}`}>
                                                                {f.label || f.name}
                                                                {f.required && <span className="ml-0.5 text-destructive">*</span>}
                                                            </Label>
                                                        </Inline>
                                                    ) : (
                                                        <Input className="ghost-form-input" placeholder={f.placeholder} type={f.type} disabled />
                                                    )}
                                                </div>
                                            ))
                                        )}

                                        {fields.length > 0 && (
                                            <Button className="ghost-form-btn mt-4 w-full" disabled>
                                                Submit
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </div>

                    <DialogFooter className="border-t border-border-default p-4">
                        <Inline gap="sm" justify="end">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button disabled={isSaving} onClick={() => { void handleSave(); }}>
                                {isSaving ? 'Saving...' : isEditing ? 'Update Form' : 'Create Form'}
                            </Button>
                        </Inline>
                    </DialogFooter>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
