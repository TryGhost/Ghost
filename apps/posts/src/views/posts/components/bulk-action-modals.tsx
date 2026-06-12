import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {apiErrorMessage} from '@utils/api-error-message';
import {getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {toast} from 'sonner';
import {useBrowseTags} from '@tryghost/admin-x-framework/api/tags';
import {useBulkDeletePosts, useBulkEditPosts} from '@tryghost/admin-x-framework/api/posts';
import {useDebounce} from 'use-debounce';
import {useState} from 'react';
import type {Post} from '@tryghost/admin-x-framework/api/posts';
import type {PostsResource} from '../posts-query-params';

export type BulkActionKind = 'delete' | 'unpublish' | 'unschedule' | 'add-tag' | 'change-access';

export interface PendingBulkAction {
    kind: BulkActionKind;
    /** Selection NQL filter, snapshotted when the action was chosen */
    filter: string;
    count: number;
    /** Set when exactly one post is selected */
    singleTitle?: string;
    /** The selected post when exactly one post is selected (used to preselect access) */
    singlePost?: Post;
}

interface BulkActionModalsProps {
    pending: PendingBulkAction | null;
    resource: PostsResource;
    onClose: () => void;
    /** Called after a successful bulk operation: clears the selection and refetches the list */
    onCompleted: () => void;
}

function describeSelection(pending: PendingBulkAction, type: string) {
    return pending.singleTitle ? `"${pending.singleTitle}"` : `${pending.count} ${type}s`;
}

function ConfirmationModal({testId, title, description, confirmLabel, isRunning, onCancel, onConfirm}: {
    testId: string;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    isRunning: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <AlertDialog open onOpenChange={(open) => {
            if (!open) {
                onCancel();
            }
        }}>
            <AlertDialogContent data-testid={testId}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button disabled={isRunning} variant="destructive" onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

/** A tag chip in the add-tags modal; new tags have no id yet and are created by the API */
export interface SelectedBulkTag {
    id?: string;
    name: string;
    slug?: string;
}

function AddTagsModal({isRunning, onCancel, onConfirm}: {
    isRunning: boolean;
    onCancel: () => void;
    onConfirm: (tags: SelectedBulkTag[]) => void;
}) {
    const [query, setQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<SelectedBulkTag[]>([]);

    const trimmedQuery = query.trim();
    const [debouncedQuery] = useDebounce(trimmedQuery, 300);
    // Mirrors Ember's tagsManager.searchTagsTask filter, including the quote escaping
    const safeTerm = debouncedQuery.replace(/'/g, '\\\'');
    const {data: tagsData} = useBrowseTags({
        filter: {visibility: '[public,internal]'},
        searchParams: debouncedQuery ? {filter: `tags.name:~'${safeTerm}'`} : undefined
    });

    const availableTags = (tagsData?.tags ?? [])
        .filter(tag => !selectedTags.some(selected => selected.id === tag.id || selected.name.toLowerCase() === tag.name.toLowerCase()));

    // Offer inline creation when the typed term matches no existing tag
    // exactly (Ember parity: the power-select "Add <tag>" option)
    const hasExactMatch = (tagsData?.tags ?? []).some(tag => tag.name.toLowerCase() === trimmedQuery.toLowerCase())
        || selectedTags.some(tag => tag.name.toLowerCase() === trimmedQuery.toLowerCase());
    const showCreateOption = trimmedQuery !== '' && !hasExactMatch;

    const addTag = (tag: SelectedBulkTag) => {
        setSelectedTags(current => [...current, tag]);
        setQuery('');
    };

    const removeTag = (tag: SelectedBulkTag) => {
        setSelectedTags(current => current.filter(selected => selected !== tag));
    };

    return (
        <Dialog open onOpenChange={(open) => {
            if (!open) {
                onCancel();
            }
        }}>
            <DialogContent data-testid="add-tags-modal">
                <DialogHeader>
                    <DialogTitle>Add tags</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                    {selectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {selectedTags.map(tag => (
                                <span key={tag.id ?? `new-${tag.name}`} className="flex items-center gap-1 rounded-sm bg-accent px-2 py-0.5 text-sm">
                                    {tag.name}
                                    {!tag.id && <span className="text-xs text-muted-foreground">(new)</span>}
                                    <button
                                        aria-label={`Remove ${tag.name}`}
                                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                                        type="button"
                                        onClick={() => removeTag(tag)}
                                    >
                                        <LucideIcon.X className="size-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                    <input
                        aria-label="Select or enter tags..."
                        className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-hidden focus:border-foreground/30"
                        placeholder="Select or enter tags..."
                        type="search"
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                    />
                    <div className="max-h-48 overflow-y-auto" role="listbox">
                        {availableTags.map(tag => (
                            <div
                                key={tag.id}
                                aria-selected={false}
                                className="cursor-pointer rounded-xs px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                                role="option"
                                onClick={() => addTag({id: tag.id, name: tag.name, slug: tag.slug})}
                            >
                                {tag.name}
                            </div>
                        ))}
                        {showCreateOption && (
                            <div
                                aria-selected={false}
                                className="cursor-pointer rounded-xs px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                                data-testid="create-tag-option"
                                role="option"
                                onClick={() => addTag({name: trimmedQuery})}
                            >
                                Create &quot;{trimmedQuery}&quot;
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button
                        disabled={isRunning || selectedTags.length === 0}
                        onClick={() => onConfirm(selectedTags)}
                    >
                        Add
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const ACCESS_OPTIONS = [
    {label: 'Public', value: 'public'},
    {label: 'Members only', value: 'members'},
    {label: 'Paid-members only', value: 'paid'},
    {label: 'Specific tiers', value: 'tiers'}
];

/** The tier shape sent in the bulk access meta, mirroring Ember's edit-posts-access modal */
export interface SelectedAccessTier {
    id: string;
    name?: string;
    slug?: string;
}

function ChangeAccessModal({type, isRunning, initialVisibility, initialTiers, onCancel, onConfirm}: {
    type: string;
    isRunning: boolean;
    initialVisibility: string;
    initialTiers: SelectedAccessTier[];
    onCancel: () => void;
    onConfirm: (visibility: string, tiers: SelectedAccessTier[]) => void;
}) {
    const [visibility, setVisibility] = useState(initialVisibility);
    const [selectedTiers, setSelectedTiers] = useState<SelectedAccessTier[]>(initialTiers);

    // Ember parity (visibility-segment-select): the tier picker offers paid tiers
    const {data: tiersData} = useBrowseTiers({searchParams: {filter: 'type:paid', limit: 'all'}});
    const paidTiers = getPaidActiveTiers(tiersData?.tiers ?? []);

    const isTierSelected = (id: string) => selectedTiers.some(tier => tier.id === id);
    const toggleTier = (tier: SelectedAccessTier) => {
        setSelectedTiers((current) => {
            if (current.some(selected => selected.id === tier.id)) {
                return current.filter(selected => selected.id !== tier.id);
            }
            return [...current, tier];
        });
    };

    // Ember validation: visibility "tiers" requires at least one tier
    const isInvalid = visibility === 'tiers' && selectedTiers.length === 0;

    return (
        <Dialog open onOpenChange={(open) => {
            if (!open) {
                onCancel();
            }
        }}>
            <DialogContent data-testid="edit-posts-access-modal">
                <DialogHeader>
                    <DialogTitle>Change {type} access</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2" role="radiogroup">
                    {ACCESS_OPTIONS.map(option => (
                        <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                                checked={visibility === option.value}
                                name="posts-access-visibility"
                                type="radio"
                                value={option.value}
                                onChange={() => setVisibility(option.value)}
                            />
                            {option.label}
                        </label>
                    ))}
                </div>
                {visibility === 'tiers' && (
                    <div className="flex flex-col gap-2" data-testid="visibility-segment-select">
                        <span className="text-sm font-semibold">Tiers</span>
                        {paidTiers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No paid tiers available</p>
                        ) : (
                            paidTiers.map(tier => (
                                <label key={tier.id} className="flex cursor-pointer items-center gap-2 text-sm">
                                    <input
                                        checked={isTierSelected(tier.id)}
                                        type="checkbox"
                                        value={tier.id}
                                        onChange={() => toggleTier({id: tier.id, name: tier.name, slug: tier.slug})}
                                    />
                                    {tier.name}
                                </label>
                            ))
                        )}
                        {isInvalid && (
                            <p className="text-sm text-red-600">Select at least one tier</p>
                        )}
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button
                        disabled={isRunning || isInvalid}
                        onClick={() => onConfirm(visibility, selectedTiers)}
                    >
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function BulkActionModals({pending, resource, onClose, onCompleted}: BulkActionModalsProps) {
    const bulkEdit = useBulkEditPosts();
    const bulkDelete = useBulkDeletePosts();
    const {data: settingsData} = useBrowseSettings();

    if (!pending) {
        return null;
    }

    const type = resource === 'pages' ? 'page' : 'post';
    const isRunning = bulkEdit.isLoading || bulkDelete.isLoading;

    const single = pending.count === 1;
    const typeLabel = (capitalized: boolean) => {
        const word = single ? type : `${type}s`;
        return capitalized ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    };

    const finish = () => {
        onClose();
        onCompleted();
    };

    const handleDelete = async () => {
        try {
            await bulkDelete.mutateAsync({filter: pending.filter, resource});
            toast.success(`${typeLabel(true)} deleted`);
            finish();
        } catch (error) {
            toast.error(apiErrorMessage(error, `Failed to delete ${typeLabel(false)}`));
        }
    };

    const handleUnpublish = async () => {
        try {
            await bulkEdit.mutateAsync({action: 'unpublish', filter: pending.filter, resource});
            toast.success(`${typeLabel(true)} unpublished`);
            finish();
        } catch (error) {
            toast.error(apiErrorMessage(error, `Failed to unpublish ${typeLabel(false)}`));
        }
    };

    const handleUnschedule = async () => {
        try {
            await bulkEdit.mutateAsync({action: 'unschedule', filter: pending.filter, resource});
            toast.success(`${typeLabel(true)} unscheduled`);
            finish();
        } catch (error) {
            toast.error(apiErrorMessage(error, `Failed to unschedule ${typeLabel(false)}`));
        }
    };

    const handleAddTags = async (tags: SelectedBulkTag[]) => {
        try {
            await bulkEdit.mutateAsync({
                action: 'addTag',
                filter: pending.filter,
                // New tags are sent without an id and created by the API
                // (Ember parity: posts-service bulk addTag)
                meta: {tags: tags.map(({id, name, slug}) => (id ? {id, name, slug} : {name}))},
                resource
            });
            toast.success(tags.length > 1 ? 'Tags added' : 'Tag added');
            finish();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Failed to add tags'));
        }
    };

    const handleChangeAccess = async (visibility: string, tiers: SelectedAccessTier[]) => {
        try {
            await bulkEdit.mutateAsync({
                action: 'access',
                filter: pending.filter,
                meta: visibility === 'tiers' ? {visibility, tiers} : {visibility},
                resource
            });
            toast.success('Access updated');
            finish();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Failed to update access'));
        }
    };

    const thisOrThese = pending.singleTitle ? `this ${type}` : `these ${type}s`;

    switch (pending.kind) {
    case 'delete':
        return (
            <ConfirmationModal
                confirmLabel="Delete"
                description={<>You&rsquo;re about to delete <strong>{describeSelection(pending, type)}</strong>. This is permanent! We warned you, k?</>}
                isRunning={isRunning}
                testId="delete-posts-modal"
                title={`Are you sure you want to delete ${thisOrThese}?`}
                onCancel={onClose}
                onConfirm={() => void handleDelete()}
            />
        );
    case 'unpublish':
        return (
            <ConfirmationModal
                confirmLabel="Unpublish"
                description={<>You&rsquo;re about to revert <strong>{describeSelection(pending, type)}</strong> to a private draft.</>}
                isRunning={isRunning}
                testId="unpublish-posts-modal"
                title={`Are you sure you want to unpublish ${thisOrThese}?`}
                onCancel={onClose}
                onConfirm={() => void handleUnpublish()}
            />
        );
    case 'unschedule':
        return (
            <ConfirmationModal
                confirmLabel="Unschedule"
                description={<>You&rsquo;re about to revert <strong>{describeSelection(pending, type)}</strong> to a private draft.</>}
                isRunning={isRunning}
                testId="unschedule-posts-modal"
                title={`Are you sure you want to unschedule ${thisOrThese}?`}
                onCancel={onClose}
                onConfirm={() => void handleUnschedule()}
            />
        );
    case 'add-tag':
        return (
            <AddTagsModal
                isRunning={isRunning}
                onCancel={onClose}
                onConfirm={tags => void handleAddTags(tags)}
            />
        );
    case 'change-access': {
        // Ember parity (edit-posts-access setup): a single selected post
        // preselects its own access, otherwise the site default is used
        let initialVisibility: string;
        let initialTiers: SelectedAccessTier[];
        if (pending.singlePost) {
            initialVisibility = pending.singlePost.visibility ?? 'public';
            initialTiers = (pending.singlePost.tiers ?? []).map(tier => ({id: tier.id, name: tier.name}));
        } else {
            initialVisibility = getSettingValue<string>(settingsData?.settings ?? null, 'default_content_visibility') ?? 'public';
            let defaultTierIds: string[] = [];
            try {
                const raw = getSettingValue<string>(settingsData?.settings ?? null, 'default_content_visibility_tiers') ?? '[]';
                const parsed: unknown = JSON.parse(raw);
                defaultTierIds = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
            } catch {
                defaultTierIds = [];
            }
            initialTiers = defaultTierIds.map(id => ({id}));
        }

        return (
            <ChangeAccessModal
                initialTiers={initialTiers}
                initialVisibility={initialVisibility}
                isRunning={isRunning}
                type={type}
                onCancel={onClose}
                onConfirm={(visibility, tiers) => void handleChangeAccess(visibility, tiers)}
            />
        );
    }
    default:
        return null;
    }
}

export default BulkActionModals;
