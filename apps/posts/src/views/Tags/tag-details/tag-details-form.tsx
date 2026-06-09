import MainLayout from '@components/layout/main-layout';
import {
    Button,
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
    Textarea
} from '@tryghost/shade/components';
import {CharCountdown} from './components/char-countdown';
import {DeleteTagDialog} from './components/delete-tag-dialog';
import {ImageUploadField} from './components/image-upload-field';
import {Link, useBlocker, useNavigate} from '@tryghost/admin-x-framework';
import {LucideIcon} from '@tryghost/shade/utils';
import {Tag, useAddTag, useDeleteTag, useEditTag} from '@tryghost/admin-x-framework/api/tags';
import {TagExpandableSections} from './components/tag-expandable-sections';
import {
    TagFormValues,
    formValuesToTagPayload,
    slugifyTagName,
    tagFormSchema,
    tagToFormValues
} from './tag-form-schema';
import {UnsavedChangesDialog} from './components/unsaved-changes-dialog';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {toast} from 'sonner';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const SAVE_BUTTON_TEXT: Record<SaveState, string> = {
    idle: 'Save',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Retry'
};

export function TagDetailsForm({tag, initialSaveState = 'idle'}: {
    tag?: Tag;
    initialSaveState?: SaveState;
}) {
    const isNew = !tag;
    const navigate = useNavigate();
    const {data: configData} = useBrowseConfig();
    const {data: settingsData} = useBrowseSettings();
    const siteTitle = getSettingValue<string>(settingsData?.settings ?? null, 'title') ?? '';
    const {mutateAsync: addTag} = useAddTag();
    const {mutateAsync: editTag} = useEditTag();
    const {mutateAsync: deleteTag} = useDeleteTag();

    const [saveState, setSaveState] = useState<SaveState>(initialSaveState);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    // Set when a navigation must skip the unsaved-changes guard (after
    // creating a tag we redirect to its edit URL; after deleting we leave).
    const bypassBlockerRef = useRef(false);
    const slugManuallyEditedRef = useRef(!isNew);

    const form = useForm<TagFormValues>({
        resolver: zodResolver(tagFormSchema),
        defaultValues: tagToFormValues(tag)
    });
    const {isDirty} = form.formState;

    const siteUrl = configData?.config.blogUrl ?? '';
    const tagUrl = tag?.url ?? (siteUrl ? `${siteUrl.replace(/\/$/, '')}/tag/${form.watch('slug') || ''}/` : '');

    const blocker = useBlocker(
        useCallback(({currentLocation, nextLocation}: {
            currentLocation: {pathname: string};
            nextLocation: {pathname: string};
        }) => {
            if (bypassBlockerRef.current) {
                return false;
            }
            return isDirty && currentLocation.pathname !== nextLocation.pathname;
        }, [isDirty])
    );

    const onSubmit = async (values: TagFormValues) => {
        setSaveState('saving');
        try {
            const payload = formValuesToTagPayload(values);

            if (isNew) {
                const response = await addTag(payload);
                const createdTag = response.tags[0];
                form.reset(tagToFormValues(createdTag));
                bypassBlockerRef.current = true;
                navigate(`/tags/${createdTag.slug}`, {replace: true, state: {justSaved: true}});
            } else {
                const response = await editTag({id: tag.id, ...payload});
                const updatedTag = response.tags[0];
                form.reset(tagToFormValues(updatedTag));
                setSaveState('saved');

                if (updatedTag.slug !== tag.slug) {
                    bypassBlockerRef.current = true;
                    navigate(`/tags/${updatedTag.slug}`, {replace: true, state: {justSaved: true}});
                }
            }
        } catch {
            setSaveState('error');
            toast.error('Failed to save tag');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteTag(tag!.id);
            setDeleteDialogOpen(false);
            bypassBlockerRef.current = true;
            navigate('/tags');
        } catch {
            toast.error('Failed to delete tag');
        }
    };

    const handleNameChange = (value: string) => {
        if (isNew && !slugManuallyEditedRef.current) {
            form.setValue('slug', slugifyTagName(value));
        }
    };

    // Match the Ember admin's cmd/ctrl+s shortcut
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault();
                form.handleSubmit(onSubmit)();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    });

    // Leave the "Saved"/"Retry" state as soon as the user edits again
    useEffect(() => {
        const subscription = form.watch((_, {type}) => {
            if (type === 'change') {
                setSaveState(current => (current === 'saved' || current === 'error' ? 'idle' : current));
            }
        });
        return () => subscription.unsubscribe();
    }, [form]);

    return (
        <MainLayout data-testid="tag-details-page">
            <div className="mx-auto w-full max-w-4xl px-6 py-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <header className="mb-8 flex items-center justify-between gap-4">
                            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-base">
                                <Link className="font-semibold text-muted-foreground hover:text-foreground" data-testid="tags-back" to="/tags">
                                    Tags
                                </Link>
                                <LucideIcon.ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                                <span className="truncate font-semibold" data-testid="tag-details-title">
                                    {isNew ? 'New tag' : tag.name}
                                </span>
                            </nav>
                            <div className="flex shrink-0 items-center gap-2">
                                {!isNew && (
                                    <Button variant="outline" asChild>
                                        <a href={tagUrl} rel="noopener noreferrer" target="_blank">
                                            View
                                            <LucideIcon.ArrowUpRight className="size-4" />
                                        </a>
                                    </Button>
                                )}
                                <Button disabled={saveState === 'saving'} type="submit">
                                    {SAVE_BUTTON_TEXT[saveState]}
                                </Button>
                            </div>
                        </header>

                        <div className="grid gap-8 md:grid-cols-2">
                            <div className="flex flex-col gap-5">
                                <div className="flex items-start gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({field}) => (
                                            <FormItem className="flex-1">
                                                <FormLabel>Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        onChange={(event) => {
                                                            field.onChange(event);
                                                            handleNameChange(event.target.value);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Start with # to create internal tags.{' '}
                                                    <a className="underline" href="https://ghost.org/help/organising-content/#private-tags" rel="noopener noreferrer" target="_blank">
                                                        Learn more
                                                    </a>
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="accentColor"
                                        render={({field}) => (
                                            <FormItem className="w-36">
                                                <FormLabel>Color</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            {...field}
                                                            aria-label="Accent color hex value"
                                                            className="pr-10"
                                                            maxLength={7}
                                                            placeholder="#15171A"
                                                        />
                                                        <input
                                                            aria-label="Accent color picker"
                                                            className="absolute top-1/2 right-2 size-6 -translate-y-1/2 cursor-pointer appearance-none rounded border-none bg-transparent p-0"
                                                            type="color"
                                                            value={/^#[0-9A-Fa-f]{6}$/.test(field.value) ? field.value : '#ffffff'}
                                                            onChange={event => field.onChange(event.target.value)}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Slug</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    onChange={(event) => {
                                                        slugManuallyEditedRef.current = event.target.value !== '';
                                                        field.onChange(event);
                                                    }}
                                                />
                                            </FormControl>
                                            {tagUrl && <FormDescription className="truncate">{tagUrl}</FormDescription>}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea className="min-h-24" {...field} />
                                            </FormControl>
                                            <CharCountdown label="Maximum" max={500} value={field.value} />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <ImageUploadField label="Tag image" name="featureImage" uploadText="Upload tag image" />
                        </div>

                        <div className="mt-10">
                            <TagExpandableSections
                                siteTitle={siteTitle}
                                siteUrl={siteUrl}
                                tagUrl={tagUrl}
                            />
                        </div>
                    </form>
                </Form>

                {!isNew && (
                    <div className="mt-10">
                        <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                            Delete tag
                        </Button>
                        <DeleteTagDialog
                            open={deleteDialogOpen}
                            tag={tag}
                            onConfirm={handleDelete}
                            onOpenChange={setDeleteDialogOpen}
                        />
                    </div>
                )}

                <UnsavedChangesDialog
                    open={blocker.state === 'blocked'}
                    onLeave={() => {
                        form.reset();
                        blocker.proceed?.();
                    }}
                    onStay={() => blocker.reset?.()}
                />
            </div>
        </MainLayout>
    );
}
