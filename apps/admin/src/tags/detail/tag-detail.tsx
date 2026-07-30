import React from 'react';
import TagDeleteModal from './tag-delete-modal';
import TagDetailForm from './tag-detail-form';
import {Box, Container} from '@tryghost/shade/primitives';
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, type ButtonProps, LoadingIndicator, Skeleton} from '@tryghost/shade/components';
import {DetailPage} from '@tryghost/shade/page-templates';
import {DirtyConfirmDialog, PageHeader} from '@tryghost/shade/patterns';
import {Link, useConfirmUnload, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {LucideIcon} from '@tryghost/shade/utils';
import {NotFound} from '@/not-found';
import {buildTagSavePayload, generateSlugFromName, getTagEditableSlice, getTagUrl, normalizeTagDraft, validateTagDraft} from './tag-detail-edit';
import {dequal} from 'dequal';
import {getTagBySlug, useAddTag, useEditTag} from '@tryghost/admin-x-framework/api/tags';
import {toast} from 'sonner';
import {useBlocker} from 'react-router';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useHashLinkNavigationGuard} from '@/hooks/use-hash-link-navigation-guard';
import type {TagEditableFields, TagFieldName} from './tag-detail-edit';

// The create screen reuses this route with the sentinel slug "new". Safe
// because Ember's router declared `/tags/new` before `/tags/:tag_slug`, so a
// tag with the literal slug "new" was already unreachable in the admin.
const CREATE_SLUG = 'new';

type TagFieldErrors = Partial<Record<TagFieldName, string>>;

const TagDetail: React.FC = () => {
    const {tagSlug = ''} = useParams<{tagSlug: string}>();
    const navigate = useNavigate();
    const isCreating = tagSlug === CREATE_SLUG;

    // `include=count.posts` mirrors the Ember route so the delete modal can
    // report how many posts the tag will be removed from.
    const {data, isLoading, error, refetch} = getTagBySlug(tagSlug, {
        enabled: !!tagSlug && !isCreating,
        searchParams: {include: 'count.posts'},
        defaultErrorHandler: false
    });
    const tag = data?.tags?.[0];
    const notFound = !isCreating && !isLoading && (error as {response?: Response} | null)?.response?.status === 404;
    const loadError = !isCreating && !isLoading && !!error && !notFound;

    const {data: configData} = useBrowseConfig();
    const blogUrl = configData?.config?.blogUrl ?? '';

    const editMutation = useEditTag();
    const addMutation = useAddTag();
    const activeMutation = isCreating ? addMutation : editMutation;

    // Draft holds the user's in-progress edits; the query cache stays server truth.
    const [draft, setDraft] = React.useState<TagEditableFields | undefined>(undefined);
    const [errors, setErrors] = React.useState<TagFieldErrors>({});
    const draftTagIdRef = React.useRef<string | undefined>(undefined);
    const lastServerSliceRef = React.useRef<TagEditableFields | undefined>(undefined);
    // Whether the user has manually edited the slug on the create screen —
    // once they have, name changes stop regenerating it (Ember `tag-form.js`
    // `hasChangedSlug`). Clearing the slug re-enables regeneration.
    const hasChangedSlugRef = React.useRef(false);
    // Lets our own post-save redirect through the unsaved-changes blocker.
    const bypassGuardRef = React.useRef(false);

    React.useEffect(() => {
        if (isCreating) {
            if (draftTagIdRef.current !== CREATE_SLUG) {
                draftTagIdRef.current = CREATE_SLUG;
                hasChangedSlugRef.current = false;
                const empty = getTagEditableSlice({});
                lastServerSliceRef.current = empty;
                setDraft(empty);
                setErrors({});
            }
            return;
        }
        if (!tag) {
            return;
        }
        const nextServerSlice = getTagEditableSlice(tag);
        if (draftTagIdRef.current !== tag.id) {
            draftTagIdRef.current = tag.id;
            lastServerSliceRef.current = nextServerSlice;
            setDraft(nextServerSlice);
            setErrors({});
            return;
        }
        // Same tag, fresh server data: adopt it only if the user hasn't edited.
        const previousServerSlice = lastServerSliceRef.current;
        lastServerSliceRef.current = nextServerSlice;
        setDraft(prev => ((!prev || (previousServerSlice && dequal(normalizeTagDraft(prev), previousServerSlice))) ? nextServerSlice : prev));
    }, [tag, isCreating]);

    // Reset the post-save redirect bypass whenever the route target changes.
    React.useEffect(() => {
        bypassGuardRef.current = false;
    }, [tagSlug]);

    const serverSlice = isCreating ? lastServerSliceRef.current : (tag ? getTagEditableSlice(tag) : undefined);
    const hasUnsavedChanges = !!draft && !!serverSlice && !dequal(normalizeTagDraft(draft), serverSlice);

    const onFieldChange = (patch: Partial<TagEditableFields>) => {
        if (activeMutation.isError) {
            activeMutation.reset();
        }
        if (isCreating && patch.name !== undefined && !hasChangedSlugRef.current) {
            patch = {...patch, slug: generateSlugFromName(patch.name)};
        }
        if (patch.slug !== undefined) {
            hasChangedSlugRef.current = !!patch.slug;
        }
        setDraft(prev => (prev ? {...prev, ...patch} : prev));
    };

    const onFieldError = (field: TagFieldName, message: string | null) => {
        setErrors((prev) => {
            if (message === null) {
                if (!(field in prev)) {
                    return prev;
                }
                const rest = {...prev};
                delete rest[field];
                return rest;
            }
            return {...prev, [field]: message};
        });
    };

    const onSave = React.useCallback(() => {
        if (!draft || activeMutation.isPending) {
            return;
        }
        const validationErrors: TagFieldErrors = {...validateTagDraft(draft)};
        // The colour field validates itself on input/blur; a lingering error
        // there blocks saving exactly like Ember's pre-save errors check.
        if (errors.accentColor) {
            validationErrors.accentColor = errors.accentColor;
        }
        setErrors(validationErrors);
        const firstError = Object.values(validationErrors)[0];
        if (firstError) {
            toast.error(firstError);
            return;
        }

        const onSuccess = (response: {tags?: {slug: string}[]}) => {
            const saved = response.tags?.[0];
            if (!saved) {
                toast.error('Couldn’t save the tag.');
                return;
            }
            // Ember replaces the route with the saved tag's slug after every
            // save (`controllers/tag.js` `saveTask`), which moves `/tags/new`
            // to the new slug and follows slug renames.
            bypassGuardRef.current = true;
            navigate(`/tags/${saved.slug}`, {replace: true});
        };
        const onError = (saveError: unknown) => {
            const apiMessage = (saveError as {data?: {errors?: {message?: string | null}[]}} | null)?.data?.errors?.[0]?.message;
            toast.error(apiMessage || 'Couldn’t save the tag.');
        };

        if (isCreating) {
            addMutation.mutate(buildTagSavePayload(draft, null), {onSuccess, onError});
            return;
        }
        if (!tag || draftTagIdRef.current !== tag.id) {
            return;
        }
        editMutation.mutate({id: tag.id, ...buildTagSavePayload(draft, getTagEditableSlice(tag).name)}, {
            onSuccess: (response) => {
                const saved = response.tags?.[0];
                if (saved) {
                    const savedSlice = getTagEditableSlice(saved);
                    lastServerSliceRef.current = savedSlice;
                    setDraft(savedSlice);
                }
                onSuccess(response);
            },
            onError
        });
    }, [draft, errors.accentColor, isCreating, tag, activeMutation.isPending, addMutation, editMutation, navigate]);

    // Cmd/Ctrl+S saves, matching the `{{on-key "cmd+s"}}` binding on the
    // Ember save button.
    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault();
                onSave();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onSave]);

    useConfirmUnload(activeMutation.isPending || hasUnsavedChanges);
    const blocker = useBlocker(({currentLocation, nextLocation}) => !bypassGuardRef.current && hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname);
    // Native `<a href="#/…">` navigations (the sidebar, links into Ember
    // routes) never reach the react-router blocker above. Ember's own guard
    // can't cover this screen either: with `tagDetailsReact` on, the Ember tag
    // route aborts and never registers into the `unsaved-changes` service.
    const anchorGuard = useHashLinkNavigationGuard(hasUnsavedChanges);
    const isBlocked = blocker.state === 'blocked' || anchorGuard.isBlocked;
    // DirtyConfirmDialog's confirm action auto-closes the dialog, firing
    // onOpenChange(false) while the blocker still reads as blocked; without
    // this flag the close handler would reset the very navigation the user
    // just confirmed.
    const leaveConfirmedRef = React.useRef(false);

    const [showDelete, setShowDelete] = React.useState(false);

    // Save button state (Save / Saving / Saved / Retry), mirroring the Ember
    // task button. Unlike the member screen, the button stays enabled with no
    // unsaved changes — Ember lets a clean tag be re-saved.
    let saveLabel: React.ReactNode = 'Save';
    let saveVariant: ButtonProps['variant'] = 'default';
    if (activeMutation.isPending) {
        saveLabel = <><LoadingIndicator size='sm' /><span className='sr-only'>Saving</span></>;
    } else if (activeMutation.isError) {
        saveLabel = 'Retry';
        saveVariant = 'destructive';
    } else if (activeMutation.isSuccess && !hasUnsavedChanges) {
        saveLabel = 'Saved';
    }

    const showEditor = !!draft && (isCreating || !!tag);
    let title = '';
    if (isCreating) {
        title = 'New tag';
    } else if (draft && showEditor) {
        title = draft.name;
    } else if (tag) {
        title = tag.name;
    }

    if (notFound) {
        return <NotFound />;
    }

    return (
        <Box className='size-full'><Container className='relative flex h-full flex-col' size='page'>
            <DetailPage data-testid='tag-detail'>
                <DetailPage.Header>
                    <PageHeader blurredBackground={false} sticky={false}>
                        <PageHeader.Left>
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink asChild>
                                            <Link data-test-link='tags-back' to='/tags'>Tags</Link>
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        {!isCreating && isLoading ? (
                                            <Skeleton className='h-4 w-40' />
                                        ) : (
                                            <BreadcrumbPage className='truncate' data-testid='tag-detail-title'>
                                                {title}
                                            </BreadcrumbPage>
                                        )}
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </PageHeader.Left>
                        {showEditor && draft && (
                            <PageHeader.Actions>
                                <PageHeader.ActionGroup>
                                    <Button variant='outline' asChild>
                                        <a href={getTagUrl(draft, blogUrl)} rel='noopener noreferrer' target='_blank'>
                                            View
                                            <LucideIcon.ExternalLink />
                                        </a>
                                    </Button>
                                    <Button className='min-w-16' disabled={activeMutation.isPending} variant={saveVariant} onClick={onSave}>
                                        {saveLabel}
                                    </Button>
                                </PageHeader.ActionGroup>
                            </PageHeader.Actions>
                        )}
                    </PageHeader>
                </DetailPage.Header>

                <DetailPage.Body>
                    {loadError && (
                        <div className='flex flex-1 flex-col items-center justify-center gap-3' data-testid='tag-detail-load-error'>
                            <p className='text-muted-foreground'>Couldn’t load this tag.</p>
                            <Button variant='outline' onClick={() => void refetch()}>Retry</Button>
                        </div>
                    )}

                    {showEditor && draft && (
                        <div className='flex flex-col gap-8'>
                            <TagDetailForm
                                blogUrl={blogUrl}
                                disabled={activeMutation.isPending}
                                draft={draft}
                                errors={errors}
                                onChange={onFieldChange}
                                onFieldError={onFieldError}
                            />
                            {!isCreating && tag && (
                                <div>
                                    <Button variant='destructive' onClick={() => setShowDelete(true)}>Delete tag</Button>
                                </div>
                            )}
                        </div>
                    )}
                </DetailPage.Body>

                {!isCreating && tag && (
                    <TagDeleteModal
                        allowLeaveWithUnsavedChanges={() => {
                            bypassGuardRef.current = true;
                        }}
                        open={showDelete}
                        tag={tag}
                        onOpenChange={setShowDelete}
                    />
                )}

                <DirtyConfirmDialog
                    open={isBlocked}
                    onConfirm={() => {
                        leaveConfirmedRef.current = true;
                        if (anchorGuard.isBlocked) {
                            anchorGuard.proceed();
                        } else {
                            blocker.proceed?.();
                        }
                    }}
                    onOpenChange={(open) => {
                        if (open) {
                            return;
                        }
                        if (leaveConfirmedRef.current) {
                            leaveConfirmedRef.current = false;
                            return;
                        }
                        if (isBlocked) {
                            blocker.reset?.();
                            anchorGuard.reset();
                        }
                    }}
                />
            </DetailPage>
        </Container></Box>
    );
};

export default TagDetail;
