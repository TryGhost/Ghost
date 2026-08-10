import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@tryghost/shade/components';
import {TagPicker} from '@/posts/list/components/modals/tag-picker';
import {tagKey, type TagToAdd} from '@/posts/list/components/modals/tag-selection';
import {useBrowseTags} from '@tryghost/admin-x-framework/api/tags';
import {useMemo, useState} from 'react';

export type {TagToAdd};

interface AddTagModalProps {
    isRunning: boolean;
    onConfirm: (tags: TagToAdd[]) => void;
    onCancel: () => void;
}

/**
 * Bulk "Add a tag", ported from
 * `apps/ember-admin/app/components/posts-list/modals/add-tag.hbs`.
 *
 * Ember allows creating a tag inline (`@allowCreation={{true}}`) and refuses to
 * submit with none selected. Both are kept: a tag typed but not matching any
 * existing one is offered as a new one, and the server creates it.
 *
 * Tags already on the selected posts are deliberately **not** shown. An earlier
 * version listed them ticked and disabled, which read as a set you could edit
 * while offering no way to untick one — this action can only add. Ember shows
 * only what you are adding, and so does this.
 */
export function AddTagModal({isRunning, onConfirm, onCancel}: AddTagModalProps) {
    const [selected, setSelected] = useState<TagToAdd[]>([]);
    const [search, setSearch] = useState('');

    const {data: tagsData} = useBrowseTags({searchParams: {limit: '100', order: 'name asc'}, filter: {}});
    const tags = useMemo(() => tagsData?.tags ?? [], [tagsData]);

    // Keyed on the id, not the name: two tags can share a name and differ only
    // by slug, and comparing names ticked and unticked both at once.
    const toggle = (tag: TagToAdd) => {
        const key = tagKey(tag);

        setSelected(current => (current.some(item => tagKey(item) === key)
            ? current.filter(item => tagKey(item) !== key)
            : [...current, tag]));
    };

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) {
                    onCancel();
                }
            }}
        >
            <DialogContent
                data-testid='add-tag-modal'
                // Escape reaches the dialog only when there is nothing to lose.
                // Radix reads the key as "dismiss", so backing out of the open
                // tag list was also the gesture that discarded every tag picked
                // so far. Cancel and the close button remain the way out.
                onEscapeKeyDown={(event) => {
                    if (selected.length > 0 || search.length > 0) {
                        event.preventDefault();
                    }
                }}
            >
                <DialogHeader>
                    <DialogTitle>Add tags</DialogTitle>
                    <DialogDescription>
                        Added to everything selected, on top of any tags already applied.
                    </DialogDescription>
                </DialogHeader>

                <TagPicker selected={selected} tags={tags} onSearchChange={setSearch} onToggle={toggle} />

                <DialogFooter>
                    <Button disabled={isRunning} variant='outline' onClick={onCancel}>Cancel</Button>
                    <Button
                        // Ember's modal reports "Select at least one tag"; a
                        // disabled button says the same thing sooner.
                        disabled={isRunning || selected.length === 0}
                        onClick={() => {
                            onConfirm(selected);
                        }}
                    >
                        {isRunning ? 'Adding' : 'Add'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
