import React, {useEffect, useRef, useState} from 'react';
import {Label as FormLabel} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {sortLabels} from '../member-form-schema';
import {useBrowseLabels} from '@tryghost/admin-x-framework/api/labels';
import type {MemberFormLabel} from '../member-form-schema';

/**
 * Typeahead label input mirroring the Ember GhMemberLabelInput:
 * - selected labels render as removable list items
 * - typing filters existing labels; Enter/Tab commits the typed text,
 *   selecting an existing label or creating a new one ({name} only, created
 *   server-side on save)
 */
export function MemberLabelsInput({value, onChange}: {
    value: MemberFormLabel[];
    onChange: (labels: MemberFormLabel[]) => void;
}) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const {data: labelsData} = useBrowseLabels({searchParams: {limit: 'all'}});
    const availableLabels = labelsData?.labels ?? [];

    useEffect(() => {
        if (!open) {
            return;
        }
        const handlePointerDown = (e: PointerEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [open]);

    const selectedNames = value.map(label => label.name.toLowerCase());

    const normalizedSearch = search.trim().toLowerCase();
    const suggestions = availableLabels.filter((label) => {
        if (selectedNames.includes(label.name.toLowerCase())) {
            return false;
        }
        return !normalizedSearch || label.name.toLowerCase().includes(normalizedSearch);
    });

    const showCreateOption = normalizedSearch !== ''
        && !availableLabels.some(label => label.name.toLowerCase() === normalizedSearch)
        && !selectedNames.includes(normalizedSearch);

    const addLabel = (label: MemberFormLabel) => {
        if (selectedNames.includes(label.name.toLowerCase())) {
            return;
        }
        onChange(sortLabels([...value, label]));
        setSearch('');
    };

    const removeLabel = (name: string) => {
        onChange(value.filter(label => label.name !== name));
    };

    // Enter/Tab commits the typed text: select the existing label with that
    // name if there is one, otherwise create a new one
    const commitSearch = () => {
        const trimmed = search.trim();
        if (!trimmed) {
            return false;
        }

        if (selectedNames.includes(trimmed.toLowerCase())) {
            setSearch('');
            return true;
        }

        const existing = availableLabels.find(label => label.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) {
            addLabel({id: existing.id, name: existing.name, slug: existing.slug});
        } else {
            addLabel({name: trimmed});
        }
        return true;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === 'Tab') && search.trim()) {
            const committed = commitSearch();
            if (committed) {
                e.preventDefault();
            }
        }
        if (e.key === 'Backspace' && !search && value.length > 0) {
            removeLabel(value[value.length - 1].name);
        }
        if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
        }
    };

    return (
        <div data-testid="member-labels-input">
            <FormLabel className="mb-2 block" htmlFor="member-label-input">Labels</FormLabel>
            <div ref={containerRef} className="relative">
                <div
                    className="flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-within:ring-1 focus-within:ring-ring"
                    onClick={() => {
                        inputRef.current?.focus();
                        setOpen(true);
                    }}
                >
                    {value.length > 0 && (
                        <ul className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0">
                            {value.map(label => (
                                <li key={label.id ?? label.name} className="flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium">
                                    {label.name}
                                    <button
                                        aria-label="remove element"
                                        className="text-muted-foreground hover:text-foreground"
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeLabel(label.name);
                                        }}
                                    >
                                        <LucideIcon.X className="size-3" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <input
                        ref={inputRef}
                        aria-label="Add label"
                        className="min-w-[80px] flex-1 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
                        id="member-label-input"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            if (!open) {
                                setOpen(true);
                            }
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                {open && (suggestions.length > 0 || showCreateOption) && (
                    <div className="absolute top-full left-0 z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                        {suggestions.map(label => (
                            <button
                                key={label.id}
                                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                                type="button"
                                onClick={() => {
                                    addLabel({id: label.id, name: label.name, slug: label.slug});
                                    inputRef.current?.focus();
                                }}
                            >
                                {label.name}
                            </button>
                        ))}
                        {showCreateOption && (
                            <button
                                className="flex w-full items-center gap-1 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                                type="button"
                                onClick={() => {
                                    commitSearch();
                                    inputRef.current?.focus();
                                }}
                            >
                                <LucideIcon.Plus className="size-3.5" />
                                Create &quot;{search.trim()}&quot;
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
