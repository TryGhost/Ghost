import {Badge, Command, CommandEmpty, CommandGroup, CommandItem, CommandList} from '@tryghost/shade/components';
import {cn, LucideIcon} from '@tryghost/shade/utils';
import {useEffect, useRef, useState} from 'react';
import type {KeyboardEvent} from 'react';
import type {Tag} from '@tryghost/admin-x-framework/api/tags';

/** A tag being added. No `id` when it is one the user just typed. */
export interface TagToAdd {
    id?: string;
    name: string;
    slug?: string;
}

interface TagPickerProps {
    /** Every tag on the site, already ordered for display. */
    tags: Tag[];
    selected: TagToAdd[];
    onToggle: (tag: TagToAdd) => void;
}

/**
 * A tag is internal when its visibility says so. A name the user has typed
 * counts too: Ghost's own rule is that a leading `#` makes a tag internal, and
 * the server applies it on create — so the chip should say so before the save
 * rather than changing appearance afterwards.
 */
function isInternalTag(tag: {name: string; visibility?: string}): boolean {
    return tag.visibility === 'internal' || tag.name.startsWith('#');
}

/**
 * Internal tags read as a solid dark chip and public ones as an outline, as
 * Ember styles them. Adding tags in bulk is exactly where the difference
 * matters: an internal tag changes nothing a reader sees, and mistaking one for
 * a public one means quietly publishing a label you meant to keep private.
 */
function tagBadgeVariant(tag: {name: string; visibility?: string}) {
    return isInternalTag(tag) ? 'default' as const : 'secondary' as const;
}

/**
 * The chips-in-a-field tag picker, modelled on the members label picker but
 * add-only: tags already on the posts are not shown and nothing here edits or
 * deletes a tag, because this dialog can only add.
 */
export function TagPicker({tags, selected, onToggle}: TagPickerProps) {
    // Open from the start, as Ember's is: the dialog exists to pick a tag, so
    // hiding the list behind a click hides the one thing it is for.
    const [open, setOpen] = useState(true);
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Dismissed by a plain document listener rather than a Radix Popover. Two
    // reasons: a portalled popover would sit outside the Dialog's subtree,
    // where its scroll-lock blocks interaction; and closing on `pointerdown`
    // without preventing the default means the `click` that follows still lands
    // on whatever is underneath. The dropdown covers the dialog's own footer,
    // so that is what lets one click on Add both close the list and press the
    // button.
    useEffect(() => {
        if (!open) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);

        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [open]);

    const term = search.trim();
    const isSelected = (name: string) => selected.some(tag => tag.name.toLowerCase() === name.toLowerCase());
    const matches = term
        ? tags.filter(tag => tag.name.toLowerCase().includes(term.toLowerCase()))
        : tags;

    // Offered only when nothing existing or already picked carries that name —
    // otherwise "Create" would make a duplicate of something one row below it.
    const canCreate = term.length > 0
        && !tags.some(tag => tag.name.toLowerCase() === term.toLowerCase())
        && !isSelected(term);

    const handleKeyDown = (event: KeyboardEvent) => {
        // Backspace on an empty field removes the last chip, as the members
        // picker does — the chips are otherwise only removable by mouse.
        if (event.key === 'Backspace' && !search && selected.length > 0) {
            onToggle(selected[selected.length - 1]);
        }

        if (event.key === 'Enter' && canCreate) {
            event.preventDefault();
            onToggle({name: term});
            setSearch('');
        }

        // Stopped from bubbling, or Radix would take the same Escape as a
        // request to dismiss the whole dialog — closing the list would throw
        // away the tags picked so far.
        if (event.key === 'Escape' && open) {
            event.stopPropagation();
            setOpen(false);
            inputRef.current?.blur();
        }

    };

    return (
        <div ref={containerRef} className='relative'>
            <div
                className='flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-control-border bg-control-surface px-3 py-1 text-control transition-colors focus-within:border-focus-ring focus-within:ring-2 focus-within:ring-focus-ring/25'
                data-testid='tag-picker'
                role='combobox'
                onClick={() => {
                    inputRef.current?.focus();
                    setOpen(true);
                }}
            >
                {selected.map(tag => (
                    <Badge
                        key={tag.id ?? tag.name}
                        className='cursor-pointer gap-1 pr-1'
                        variant={tagBadgeVariant(tag)}
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggle(tag);
                        }}
                    >
                        {tag.name}
                        <LucideIcon.X className='size-3' />
                    </Badge>
                ))}
                <input
                    ref={inputRef}
                    aria-label='Search tags'
                    className='min-w-20 flex-1 bg-transparent text-control outline-hidden placeholder:text-muted-foreground'
                    placeholder={selected.length === 0 ? 'Select or enter tags...' : ''}
                    value={search}
                    autoFocus
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                />
            </div>
            {open && (
                <div className='absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-surface-elevated shadow-md'>
                    <Command shouldFilter={false}>
                        <CommandList className='max-h-64 overflow-y-auto'>
                            {!canCreate && matches.length === 0 && (
                                <CommandEmpty>No tags found</CommandEmpty>
                            )}
                            {matches.length > 0 && (
                                <CommandGroup className='[&_[cmdk-group-heading]]:hidden'>
                                    {matches.map(tag => (
                                        <CommandItem
                                            key={tag.id}
                                            value={tag.id}
                                            onSelect={() => {
                                                onToggle({id: tag.id, name: tag.name, slug: tag.slug});
                                            }}
                                        >
                                            <span className={cn('flex-1 truncate', isInternalTag(tag) && 'font-medium')}>
                                                {tag.name}
                                            </span>
                                            {isSelected(tag.name) && (
                                                <LucideIcon.Check className='size-4 shrink-0 text-primary' />
                                            )}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                            {canCreate && (
                                <CommandGroup className='[&_[cmdk-group-heading]]:hidden'>
                                    <CommandItem
                                        value={`create-${term}`}
                                        onSelect={() => {
                                            onToggle({name: term});
                                            setSearch('');
                                        }}
                                    >
                                        <LucideIcon.Plus className='size-4' />
                                        Create “{term}”
                                    </CommandItem>
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </div>
            )}
        </div>
    );
}
