import {Button, Input, Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {type PostViewColor, pickPostViewColor} from '@/posts/list/post-views';
import {useDeletePostView, useSavePostView} from '@/posts/list/hooks/use-post-views';
import {useState} from 'react';
import type {PostListParams} from '@/posts/list/post-query-params';
import type {SharedView} from '@/members/shared-views';

interface ManagePostViewPopoverProps {
    params: PostListParams;
    /** The saved view matching the current params, if the user is on one. */
    activeView?: SharedView;
}

function PopoverBody({params, activeView, onClose}: ManagePostViewPopoverProps & {onClose: () => void}) {
    const [name, setName] = useState(activeView?.name ?? '');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const savePostView = useSavePostView();
    const deletePostView = useDeletePostView();

    const isEditing = Boolean(activeView);

    const handleSave = async () => {
        const trimmed = name.trim();

        if (!trimmed) {
            setError('Please enter a name');
            return;
        }

        setBusy(true);

        try {
            // Editing keeps the view's colour; a new one gets a random one, as
            // Ember does.
            const color = (activeView?.color as PostViewColor | undefined) ?? pickPostViewColor();

            await savePostView(trimmed, params, color, activeView);
            onClose();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to save view');
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!activeView) {
            return;
        }

        setBusy(true);

        try {
            await deletePostView(activeView);
            onClose();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete view');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Stack gap='md'>
            <Input
                aria-label='View name'
                placeholder='Name this view'
                value={name}
                autoFocus
                onChange={(event) => {
                    setName(event.target.value);
                    setError('');
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        void handleSave();
                    }
                }}
            />
            {error && <Text size='sm' tone='secondary'>{error}</Text>}
            <Inline gap='sm' justify={isEditing ? 'between' : 'end'}>
                {isEditing && (
                    <Button disabled={busy} variant='destructive' onClick={() => void handleDelete()}>
                        Delete
                    </Button>
                )}
                <Button disabled={busy} onClick={() => void handleSave()}>
                    {isEditing ? 'Save' : 'Save view'}
                </Button>
            </Inline>
        </Stack>
    );
}

/**
 * The save/edit-view affordance in the filter bar. Whether it shows at all is
 * decided by `canSavePostView` — admins only, posts only, not on a default
 * view, and something actually filtered.
 */
export function ManagePostViewPopover({params, activeView}: ManagePostViewPopoverProps) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    aria-label={activeView ? 'Edit current view' : 'Save as view'}
                    data-testid='manage-post-view'
                    variant='outline'
                >
                    <LucideIcon.Bookmark className='size-4' />
                </Button>
            </PopoverTrigger>
            <PopoverContent align='end' className='w-72'>
                {/* Keyed so reopening starts from the current view's name. */}
                <PopoverBody
                    key={activeView?.name ?? 'new'}
                    activeView={activeView}
                    params={params}
                    onClose={() => {
                        setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
