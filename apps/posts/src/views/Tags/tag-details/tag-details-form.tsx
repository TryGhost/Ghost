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
import {JSONError} from '@tryghost/admin-x-framework/errors';
import {Link, useBlocker, useConfirmUnload, useNavigate} from '@tryghost/admin-x-framework';
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

type SaveState = 'idle' | 'saved' | 'error';

function apiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof JSONError && error.data?.errors?.[0]?.message) {
        return error.data.errors[0].message;
    }
    return fallback;
}

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
    const slugManuallyEditedRef = useRef(false);
    // The Ember implementation used a drop-concurrency save task; this guards
    // against re-entrant submits (e.g. cmd+S key repeat) creating duplicates.
    const submitInFlightRef = useRef(false);

    const form = useForm<TagFormValues>({
        resolver: zodResolver(tagFormSchema),
        defaultValues: tagToFormValues(tag)
    });
    const {isDirty, isSubmitting} = form.formState;

    const siteUrl = configData?.config.blogUrl ?? '';
    const tagUrl = tag?.url ?? (siteUrl ? `${siteUrl.replace(/\/$/, '')}/tag/${form.watch('slug') || ''}/` : '');
    // the View button prefers the canonical URL, matching the Ember controller
    const viewUrl = tag?.canonical_url || tagUrl;

    // A save can resolve after the user has navigated away (the blocker lets
    // navigation through while a save is in flight, since it completes either
    // way) — don't yank them back to the tag screen in that case.
    const unmountedRef = useRef(false);
    useEffect(() => {
        // re-arm on mount: StrictMode runs mount → unmount → mount, and the
        // cleanup from the throwaway pass must not leave the ref stuck on true
        unmountedRef.current = false;
        return () => {
            unmountedRef.current = true;
        };
    }, []);

    // Reads form state at navigation time (not via closed-over deps) so that
    // form.reset(...) before a programmatic navigate immediately disarms the
    // guard, and an in-flight save (which completes regardless) doesn't show
    // a spurious dialog.
    const blocker = useBlocker(
        useCallback(({currentLocation, nextLocation}: {
            currentLocation: {pathname: string};
            nextLocation: {pathname: string};
        }) => {
            const {isDirty: dirtyNow, isSubmitting: submittingNow} = form.formState;
            return dirtyNow && !submittingNow && currentLocation.pathname !== nextLocation.pathname;
        }, [form])
    );

    useConfirmUnload(isDirty);

    const onSubmit = async (values: TagFormValues) => {
        if (submitInFlightRef.current) {
            return;
        }
        submitInFlightRef.current = true;
        setSaveState('idle');

        try {
            const payload = formValuesToTagPayload(values);

            if (isNew) {
                const response = await addTag(payload);
                const createdTag = response.tags[0];
                if (unmountedRef.current) {
                    return;
                }
                form.reset(tagToFormValues(createdTag));
                navigate(`/tags/${createdTag.slug}`, {replace: true, state: {justSaved: true}});
            } else {
                const response = await editTag({id: tag.id, ...payload});
                const updatedTag = response.tags[0];
                if (unmountedRef.current) {
                    return;
                }
                form.reset(tagToFormValues(updatedTag));
                setSaveState('saved');

                if (updatedTag.slug !== tag.slug) {
                    navigate(`/tags/${updatedTag.slug}`, {replace: true, state: {justSaved: true}});
                }
            }
        } catch (error) {
            if (!unmountedRef.current) {
                setSaveState('error');
                toast.error(apiErrorMessage(error, 'Failed to save tag'));
            }
        } finally {
            submitInFlightRef.current = false;
        }
    };

    const handleDelete = async () => {
        try {
            await deleteTag(tag!.id);
            setDeleteDialogOpen(false);
            // discard any unsaved edits so the blocker lets the navigation through
            form.reset();
            navigate('/tags');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Failed to delete tag'));
        }
    };

    const handleNameChange = (value: string) => {
        if (isNew && !slugManuallyEditedRef.current) {
            form.setValue('slug', slugifyTagName(value));
        }
    };

    // Match the Ember admin's cmd/ctrl+s shortcut
    const submitRef = useRef<() => void>(() => {});
    submitRef.current = () => form.handleSubmit(onSubmit)();
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault();
                submitRef.current();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    let saveLabel = 'Save';
    if (isSubmitting) {
        saveLabel = 'Saving...';
    } else if (saveState === 'saved' && !isDirty) {
        saveLabel = 'Saved';
    } else if (saveState === 'error') {
        saveLabel = 'Retry';
    }

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
                                        <a href={viewUrl} rel="noopener noreferrer" target="_blank">
                                            View
                                            <LucideIcon.ArrowUpRight className="size-4" />
                                        </a>
                                    </Button>
                                )}
                                <Button disabled={isSubmitting} type="submit">
                                    {saveLabel}
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
                                                            onBlur={(event) => {
                                                                // the Ember form accepted bare hex and prepended the #
                                                                const value = event.target.value.trim();
                                                                if (/^[0-9A-Fa-f]{6}$/.test(value)) {
                                                                    field.onChange(`#${value}`);
                                                                }
                                                                field.onBlur();
                                                            }}
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
