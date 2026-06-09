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
import {useBrowseTags} from '@tryghost/admin-x-framework/api/tags';
import {useBulkDeletePosts, useBulkEditPosts} from '@tryghost/admin-x-framework/api/posts';
import {useState} from 'react';
import type {PostTag} from '@tryghost/admin-x-framework/api/posts';
import type {PostsResource} from '../posts-query-params';

export type BulkActionKind = 'delete' | 'unpublish' | 'unschedule' | 'add-tag' | 'change-access';

export interface PendingBulkAction {
    kind: BulkActionKind;
    /** Selection NQL filter, snapshotted when the action was chosen */
    filter: string;
    count: number;
    /** Set when exactly one post is selected */
    singleTitle?: string;
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

function AddTagsModal({isRunning, onCancel, onConfirm}: {
    isRunning: boolean;
    onCancel: () => void;
    onConfirm: (tags: PostTag[]) => void;
}) {
    const [query, setQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<PostTag[]>([]);
    const {data: tagsData} = useBrowseTags({filter: {visibility: '[public,internal]'}});

    const filteredTags = (tagsData?.tags ?? [])
        .filter(tag => !selectedTags.some(selected => selected.id === tag.id))
        .filter(tag => tag.name.toLowerCase().includes(query.trim().toLowerCase()));

    const addTag = (tag: PostTag) => {
        setSelectedTags(current => [...current, {id: tag.id, name: tag.name, slug: tag.slug}]);
        setQuery('');
    };

    const removeTag = (id: string) => {
        setSelectedTags(current => current.filter(tag => tag.id !== id));
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
                                <span key={tag.id} className="flex items-center gap-1 rounded-sm bg-accent px-2 py-0.5 text-sm">
                                    {tag.name}
                                    <button
                                        aria-label={`Remove ${tag.name}`}
                                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                                        type="button"
                                        onClick={() => removeTag(tag.id)}
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
                        {filteredTags.map(tag => (
                            <div
                                key={tag.id}
                                aria-selected={false}
                                className="cursor-pointer rounded-xs px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                                role="option"
                                onClick={() => addTag(tag)}
                            >
                                {tag.name}
                            </div>
                        ))}
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
    {label: 'Paid-members only', value: 'paid'}
];

function ChangeAccessModal({type, isRunning, onCancel, onConfirm}: {
    type: string;
    isRunning: boolean;
    onCancel: () => void;
    onConfirm: (visibility: string) => void;
}) {
    const [visibility, setVisibility] = useState('public');

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
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button disabled={isRunning} onClick={() => onConfirm(visibility)}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function BulkActionModals({pending, resource, onClose, onCompleted}: BulkActionModalsProps) {
    const bulkEdit = useBulkEditPosts();
    const bulkDelete = useBulkDeletePosts();

    if (!pending) {
        return null;
    }

    const type = resource === 'pages' ? 'page' : 'post';
    const isRunning = bulkEdit.isLoading || bulkDelete.isLoading;

    const finish = () => {
        onClose();
        onCompleted();
    };

    const handleDelete = async () => {
        await bulkDelete.mutateAsync({filter: pending.filter, resource});
        finish();
    };

    const handleUnpublish = async () => {
        await bulkEdit.mutateAsync({action: 'unpublish', filter: pending.filter, resource});
        finish();
    };

    const handleUnschedule = async () => {
        await bulkEdit.mutateAsync({action: 'unschedule', filter: pending.filter, resource});
        finish();
    };

    const handleAddTags = async (tags: PostTag[]) => {
        await bulkEdit.mutateAsync({
            action: 'addTag',
            filter: pending.filter,
            meta: {tags: tags.map(({id, name, slug}) => ({id, name, slug}))},
            resource
        });
        finish();
    };

    const handleChangeAccess = async (visibility: string) => {
        await bulkEdit.mutateAsync({
            action: 'access',
            filter: pending.filter,
            meta: {visibility},
            resource
        });
        finish();
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
    case 'change-access':
        return (
            <ChangeAccessModal
                isRunning={isRunning}
                type={type}
                onCancel={onClose}
                onConfirm={visibility => void handleChangeAccess(visibility)}
            />
        );
    default:
        return null;
    }
}

export default BulkActionModals;
