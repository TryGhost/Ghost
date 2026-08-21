import React from 'react';
import TagDeleteModal from './tag-delete-modal';
import TagDetailForm from './tag-detail-form';
import {Box, Container} from '@tryghost/shade/primitives';
import {Badge, Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, type ButtonProps, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, LoadingIndicator, Skeleton} from '@tryghost/shade/components';
import {DetailPage} from '@tryghost/shade/page-templates';
import {DirtyConfirmDialog, PageHeader} from '@tryghost/shade/patterns';
import {Link, useHandleError, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {LucideIcon} from '@tryghost/shade/utils';
import {NotFound} from '@/not-found';
import {buildTagSavePayload, generateSlugFromName, getTagEditableSlice, getTagUrl, normalizeTagDraft, validateTagDraft} from './tag-detail-edit';
import {dequal} from 'dequal';
import {getTagBySlug, useAddTag, useEditTag} from '@tryghost/admin-x-framework/api/tags';
import {toast} from 'sonner';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useUnsavedChangesGuard} from '@/hooks/use-unsaved-changes-guard';
import type {TagsResponseType} from '@tryghost/admin-x-framework/api/tags';
import type {TagEditableFields, TagFieldName} from './tag-detail-edit';

// The create screen reuses this route with the sentinel slug "new". Safe
// because Ember's router declared `/tags/new` before `/tags/:tag_slug`, so a
// tag with the literal slug "new" was already unreachable in the admin.
const CREATE_SLUG = 'new';

type TagFieldErrors = Partial<Record<TagFieldName, string>>;
type TagImageFieldName = 'featureImage' | 'twitterImage' | 'ogImage';
type SaveStatus = 'idle' | 'pending' | 'success' | 'error';

const TagDetail: React.FC = () => {
    const {tagSlug = ''} = useParams<{tagSlug: string}>();
    const navigate = useNavigate();
    const handleError = useHandleError();
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

    // `blogUrl` is not part of the config API response — Ember derives it
    // client-side from the site endpoint's `url` (`config-manager.js`).
    const {data: siteData} = useBrowseSite();
    const blogUrl = siteData?.site.url.replace(/\/$/, '') ?? '';

    const editMutation = useEditTag();
    const addMutation = useAddTag();
    const activeMutation = isCreating ? addMutation : editMutation;

    // Draft holds the user's in-progress edits; the query cache stays server truth.
    const [draft, setDraft] = React.useState<TagEditableFields | undefined>(undefined);
    const [errors, setErrors] = React.useState<TagFieldErrors>({});
    const draftTagIdRef = React.useRef<string | undefined>(undefined);
    const lastServerSliceRef = React.useRef<TagEditableFields | undefined>(undefined);
    const touchedFieldsRef = React.useRef<Set<TagFieldName>>(new Set());
    const routeKeyRef = React.useRef(tagSlug);
    routeKeyRef.current = tagSlug;
    const savedRouteRef = React.useRef<string | null>(null);
    // Whether the user has manually edited the slug on the create screen —
    // once they have, name changes stop regenerating it (Ember `tag-form.js`
    // `hasChangedSlug`). Clearing the slug re-enables regeneration.
    const hasChangedSlugRef = React.useRef(false);
    const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('idle');
    const [showDelete, setShowDelete] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [busyImageFields, setBusyImageFields] = React.useState<Set<TagImageFieldName>>(new Set());
    const [uploadingImageFields, setUploadingImageFields] = React.useState<Set<TagImageFieldName>>(new Set());

    React.useEffect(() => {
        if (isCreating) {
            if (draftTagIdRef.current !== CREATE_SLUG) {
                draftTagIdRef.current = CREATE_SLUG;
                hasChangedSlugRef.current = false;
                touchedFieldsRef.current.clear();
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
            touchedFieldsRef.current.clear();
            lastServerSliceRef.current = nextServerSlice;
            setDraft(nextServerSlice);
            setErrors({});
            return;
        }
        // Same tag, fresh server data: adopt it only if the user hasn't edited.
        const previousServerSlice = lastServerSliceRef.current;
        lastServerSliceRef.current = nextServerSlice;
        setDraft(prev => ((!prev || (previousServerSlice && dequal(normalizeTagDraft(prev, touchedFieldsRef.current), previousServerSlice))) ? nextServerSlice : prev));
    }, [tag, isCreating]);

    // Reset route-scoped UI and mutation state whenever the target changes.
    // Preserve the successful state only across our own post-save slug redirect.
    React.useEffect(() => {
        setShowDelete(false);
        setIsDeleting(false);
        setBusyImageFields(new Set());
        setUploadingImageFields(new Set());
        setSaveStatus(savedRouteRef.current === tagSlug ? 'success' : 'idle');
        savedRouteRef.current = null;
        addMutation.reset();
        editMutation.reset();
    }, [tagSlug]);

    const serverSlice = lastServerSliceRef.current;
    const hasUnsavedChanges = !!draft && !!serverSlice && !dequal(normalizeTagDraft(draft, touchedFieldsRef.current), serverSlice);
    const hasBusyImageField = busyImageFields.size > 0;
    const hasPendingImageUpload = uploadingImageFields.size > 0;
    const isBusy = activeMutation.isPending || hasBusyImageField || isDeleting || showDelete;

    const {dialogProps, bypassNextNavigation, resumeBlockedNavigationAfterSave} = useUnsavedChangesGuard({
        when: activeMutation.isPending || hasPendingImageUpload || isDeleting || hasUnsavedChanges,
        isSaving: activeMutation.isPending
    });

    const onImageBusyChange = React.useCallback((field: TagImageFieldName, busy: boolean) => {
        setBusyImageFields((current) => {
            if (current.has(field) === busy) {
                return current;
            }
            const next = new Set(current);
            if (busy) {
                next.add(field);
            } else {
                next.delete(field);
            }
            return next;
        });
    }, []);

    const onImageUploadPendingChange = React.useCallback((field: TagImageFieldName, pending: boolean) => {
        setUploadingImageFields((current) => {
            if (current.has(field) === pending) {
                return current;
            }
            const next = new Set(current);
            if (pending) {
                next.add(field);
            } else {
                next.delete(field);
            }
            return next;
        });
    }, []);

    const onFieldChange = (patch: Partial<TagEditableFields>) => {
        if (saveStatus === 'error') {
            activeMutation.reset();
        }
        setSaveStatus('idle');
        const manuallyChangedSlug = patch.slug !== undefined;
        for (const field of Object.keys(patch) as TagFieldName[]) {
            touchedFieldsRef.current.add(field);
        }
        if (isCreating && patch.name !== undefined && !hasChangedSlugRef.current) {
            patch = {...patch, slug: generateSlugFromName(patch.name)};
        }
        if (manuallyChangedSlug) {
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
        if (!draft || isBusy || (!isCreating && (!tag || draftTagIdRef.current !== tag.id))) {
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
            setSaveStatus('idle');
            toast.error(firstError);
            return;
        }

        const submittedRoute = tagSlug;
        const submittedTagId = tag?.id;
        setSaveStatus('pending');
        const onSuccess = (response: TagsResponseType) => {
            if (routeKeyRef.current !== submittedRoute) {
                return;
            }
            const saved = response.tags?.[0];
            if (!saved) {
                setSaveStatus('error');
                toast.error('Couldn’t save the tag.');
                return;
            }
            const savedSlice = getTagEditableSlice(saved);
            lastServerSliceRef.current = savedSlice;
            setDraft(savedSlice);
            touchedFieldsRef.current.clear();
            setSaveStatus('success');
            if (resumeBlockedNavigationAfterSave()) {
                return;
            }
            // Move `/tags/new` to the saved tag and follow slug renames. A
            // same-slug save needs no navigation; setting the bypass in that
            // case would leave the unsaved-changes guard disabled indefinitely.
            if (saved.slug !== tagSlug) {
                savedRouteRef.current = saved.slug;
                bypassNextNavigation();
                navigate(`/tags/${saved.slug}`, {replace: true});
            }
        };
        const onError = (saveError: unknown) => {
            if (routeKeyRef.current !== submittedRoute) {
                return;
            }
            setSaveStatus('error');
            handleError(saveError);
        };

        if (isCreating) {
            addMutation.mutate(buildTagSavePayload(draft, null, touchedFieldsRef.current), {onSuccess, onError});
            return;
        }
        if (!tag) {
            return;
        }
        editMutation.mutate({id: tag.id, ...buildTagSavePayload(draft, getTagEditableSlice(tag).name, touchedFieldsRef.current)}, {
            onSuccess: (response) => {
                if (routeKeyRef.current !== submittedRoute || draftTagIdRef.current !== submittedTagId) {
                    return;
                }
                onSuccess(response);
            },
            onError
        });
    }, [draft, errors.accentColor, isCreating, tag, tagSlug, isBusy, addMutation, editMutation, navigate, handleError, bypassNextNavigation, resumeBlockedNavigationAfterSave]);

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

    // Save button state (Save / Saving / Saved / Retry), mirroring the Ember
    // task button. Unlike the member screen, the button stays enabled with no
    // unsaved changes — Ember lets a clean tag be re-saved.
    let saveLabel: React.ReactNode = 'Save';
    let saveVariant: ButtonProps['variant'] = 'default';
    if (saveStatus === 'pending') {
        saveLabel = <><LoadingIndicator size='sm' /><span className='sr-only'>Saving</span></>;
    } else if (saveStatus === 'error') {
        saveLabel = 'Retry';
        saveVariant = 'destructive';
    } else if (saveStatus === 'success' && !hasUnsavedChanges) {
        saveLabel = 'Saved';
    }

    // Holding on `blogUrl` keeps host-less URL previews from ever painting;
    // the shell's sidebar has normally warmed the site query already.
    const showEditor = !!draft && !!blogUrl && (isCreating || !!tag);
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
                                    <BreadcrumbItem className='gap-2'>
                                        {!isCreating && isLoading ? (
                                            <Skeleton className='h-4 w-40' />
                                        ) : (
                                            <BreadcrumbPage className='truncate' data-testid='tag-detail-title'>
                                                {title}
                                            </BreadcrumbPage>
                                        )}
                                        {tag?.visibility === 'internal' && (
                                            <Badge className='px-1 py-px text-[10px] leading-none tracking-wider' data-testid='tag-detail-internal-badge' variant='secondary'>INTERNAL</Badge>
                                        )}
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </PageHeader.Left>
                        {showEditor && draft && (
                            <PageHeader.Actions>
                                <PageHeader.ActionGroup>
                                    {!isCreating && tag && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-label='Tag actions' className='size-(--control-height)' size='icon' variant='outline'>
                                                    <LucideIcon.Ellipsis size={16} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align='end'>
                                                <DropdownMenuItem asChild>
                                                    <a href={getTagUrl(draft, blogUrl)} rel='noopener noreferrer' target='_blank'>
                                                        <LucideIcon.ExternalLink />
                                                        View posts
                                                    </a>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className='text-destructive focus:text-destructive'
                                                    disabled={activeMutation.isPending || hasBusyImageField}
                                                    onSelect={() => setShowDelete(true)}
                                                >
                                                    <LucideIcon.Trash />
                                                    Delete tag
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                    <Button className='min-w-16' disabled={isBusy} variant={saveVariant} onClick={onSave}>
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
                                key={isCreating ? CREATE_SLUG : tag?.id}
                                blogUrl={blogUrl}
                                disabled={activeMutation.isPending || isDeleting}
                                draft={draft}
                                errors={errors}
                                onChange={onFieldChange}
                                onFieldError={onFieldError}
                                onImageBusyChange={onImageBusyChange}
                                onImageUploadPendingChange={onImageUploadPendingChange}
                            />
                        </div>
                    )}
                </DetailPage.Body>

                {!isCreating && tag && (
                    <TagDeleteModal
                        key={tag.id}
                        allowLeaveWithUnsavedChanges={bypassNextNavigation}
                        displayName={draft?.name ?? tag.name}
                        open={showDelete}
                        tag={tag}
                        onOpenChange={setShowDelete}
                        onPendingChange={setIsDeleting}
                    />
                )}

                <DirtyConfirmDialog {...dialogProps} />
            </DetailPage>
        </Container></Box>
    );
};

export default TagDetail;
