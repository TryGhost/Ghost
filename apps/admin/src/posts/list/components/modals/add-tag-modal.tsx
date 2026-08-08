import {
    Button,
    Checkbox,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input
} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {useBrowseTags} from '@tryghost/admin-x-framework/api/tags';
import {cn} from '@tryghost/shade/utils';
import {useMemo, useState} from 'react';

export interface TagToAdd {
    id?: string;
    name: string;
    slug?: string;
}

interface AddTagModalProps {
    /**
     * Tags already on the selected post, shown ticked and locked. This action
     * can only *add*, so offering to untick one would promise a removal it
     * cannot perform — but leaving them out entirely reads as "this post has no
     * tags", which is worse. Only meaningful for a single post; with several
     * there is no shared set to show.
     */
    appliedTags?: {id?: string; name: string; slug?: string}[];
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
 */
export function AddTagModal({appliedTags = [], isRunning, onConfirm, onCancel}: AddTagModalProps) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<TagToAdd[]>([]);

    const {data: tagsData} = useBrowseTags({searchParams: {limit: '100', order: 'name asc'}, filter: {}});
    const tags = useMemo(() => tagsData?.tags ?? [], [tagsData]);

    const term = search.trim();
    const matches = term
        ? tags.filter(tag => tag.name.toLowerCase().includes(term.toLowerCase()))
        : tags;

    // Offer to create only when nothing existing has that exact name.
    const canCreate = term.length > 0
        && !tags.some(tag => tag.name.toLowerCase() === term.toLowerCase())
        && !selected.some(tag => tag.name.toLowerCase() === term.toLowerCase());

    const applied = useMemo(
        () => new Set(appliedTags.map(tag => tag.name.toLowerCase())),
        [appliedTags]
    );
    const isApplied = (name: string) => applied.has(name.toLowerCase());
    const isSelected = (name: string) => selected.some(tag => tag.name === name);

    const toggle = (tag: TagToAdd) => {
        setSelected(current => (current.some(item => item.name === tag.name)
            ? current.filter(item => item.name !== tag.name)
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
            <DialogContent data-testid='add-tag-modal'>
                <DialogHeader>
                    <DialogTitle>Add tags</DialogTitle>
                    <DialogDescription>
                        Added to everything selected, on top of any tags already applied.
                    </DialogDescription>
                </DialogHeader>

                <Stack gap='md'>
                    <Input
                        aria-label='Search tags'
                        placeholder='Select or enter tags...'
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                        }}
                    />

                    <Stack className='max-h-64 overflow-y-auto' gap='sm'>
                        {canCreate && (
                            <Inline align='center' gap='sm'>
                                <Checkbox
                                    checked={isSelected(term)}
                                    id='tag-new'
                                    onCheckedChange={() => {
                                        toggle({name: term});
                                    }}
                                />
                                <label className='text-sm' htmlFor='tag-new'>
                                    Add “{term}”…
                                </label>
                            </Inline>
                        )}
                        {matches.map(tag => (
                            <Inline key={tag.id} align='center' gap='sm'>
                                <Checkbox
                                    checked={isApplied(tag.name) || isSelected(tag.name)}
                                    disabled={isApplied(tag.name)}
                                    id={`tag-${tag.id}`}
                                    onCheckedChange={() => {
                                        toggle({id: tag.id, name: tag.name, slug: tag.slug});
                                    }}
                                />
                                <label
                                    className={cn('text-sm', isApplied(tag.name) && 'text-muted-foreground')}
                                    htmlFor={`tag-${tag.id}`}
                                >
                                    {tag.name}
                                </label>
                            </Inline>
                        ))}
                        {matches.length === 0 && !canCreate && (
                            <Text size='sm' tone='secondary'>No tags found.</Text>
                        )}
                    </Stack>
                </Stack>

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
