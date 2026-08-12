import React, {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import clsx from 'clsx';
import useUrlInput from '@/settings/hooks/use-url-input';
import {Input, Popover, PopoverAnchor, PopoverContent} from '@tryghost/shade/components';
import {type NavigationLinkSuggestion, type NavigationLinkSuggestionGroup} from '@/settings/hooks/site/use-navigation-link-suggestions';
import {formatUrl} from '@/settings/utils/format-url';

const SUGGESTION_DEBOUNCE_MS = 150;

type IndexedSuggestion = NavigationLinkSuggestion & {index: number};

/**
 * Assign each item its position in the flattened list, so arrow-key navigation
 * and `aria-activedescendant` can address items across group boundaries.
 */
const indexGroups = (groups: NavigationLinkSuggestionGroup[]) => {
    let offset = 0;
    return groups.map((group) => {
        const items = group.items.map((item, itemIndex) => ({...item, index: offset + itemIndex}));
        offset += group.items.length;
        return {label: group.label, items};
    });
};

// `onSubmit` shadows the native form-event handler on <input>, so drop that too
export type UrlSuggestionInputProps = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'onSubmit'> & {
    baseUrl: string;
    /** The stored (usually relative) value */
    value: string;
    loadSuggestions: (term: string) => Promise<NavigationLinkSuggestionGroup[]>;
    /** Called with the value to store */
    onChange: (value: string) => void;
    /**
     * Enter pressed while the dropdown has no active suggestion. Receives the
     * value just committed, which the caller needs because the `onChange` for
     * it has not flushed yet.
     */
    onSubmit?: (committedValue: string) => void;
    /** The user changed the field — used to clear validation errors as they type */
    onEdit?: () => void;
};

const UrlSuggestionInput: React.FC<UrlSuggestionInputProps> = ({
    baseUrl,
    value,
    loadSuggestions,
    onChange,
    onSubmit,
    onEdit,
    className,
    ...props
}) => {
    const urlInput = useUrlInput({
        baseUrl,
        nullable: true,
        value,
        onChange: newValue => onChange(newValue || '')
    });

    const [open, setOpen] = useState(false);
    const [groups, setGroups] = useState<NavigationLinkSuggestionGroup[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);

    const listId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const requestId = useRef(0);
    const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const indexedGroups = useMemo(() => indexGroups(groups), [groups]);
    const suggestions = useMemo(() => indexedGroups.flatMap(group => group.items), [indexedGroups]);

    const fetchSuggestions = useCallback((term: string) => {
        const id = requestId.current + 1;
        requestId.current = id;

        loadSuggestions(term).then((result) => {
            // A newer request has been issued since — drop this response
            if (requestId.current !== id) {
                return;
            }
            setGroups(result);
            setActiveIndex(-1);
        }).catch(() => {
            if (requestId.current !== id) {
                return;
            }
            setGroups([]);
        });
    }, [loadSuggestions]);

    useEffect(() => () => clearTimeout(debounceTimer.current), []);

    const openWithSuggestions = useCallback((term: string) => {
        setOpen(true);
        fetchSuggestions(term);
    }, [fetchSuggestions]);

    const close = useCallback(() => {
        clearTimeout(debounceTimer.current);
        requestId.current += 1;
        setOpen(false);
        setGroups([]);
        setActiveIndex(-1);
    }, []);

    // Like the editor's Button URL field: the list is only ever a hint, so it
    // stays hidden until there is something to suggest — no empty dropdown, and
    // nothing on focusing a field that already holds a URL.
    const isVisible = open && suggestions.length > 0;

    const selectSuggestion = useCallback((suggestion: NavigationLinkSuggestion) => {
        const urls = formatUrl(suggestion.value, baseUrl, true);
        urlInput.setDisplayValue(urls.display);
        onChange(urls.save || '');
        onEdit?.();
        close();
    }, [baseUrl, close, onChange, onEdit, urlInput]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const term = event.target.value;
        urlInput.setDisplayValue(term);
        onEdit?.();

        setOpen(true);
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => fetchSuggestions(term), SUGGESTION_DEBOUNCE_MS);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();

            // Retry rather than dead-end when there is nothing on screen: the
            // list may be closed, or open with a term that matched nothing
            if (!isVisible) {
                openWithSuggestions(urlInput.displayValue);
                return;
            }

            const offset = event.key === 'ArrowDown' ? 1 : -1;
            setActiveIndex((current) => {
                const next = current + offset;
                if (next < 0) {
                    return suggestions.length - 1;
                }
                return next >= suggestions.length ? 0 : next;
            });
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();

            if (isVisible && activeIndex >= 0 && suggestions[activeIndex]) {
                selectSuggestion(suggestions[activeIndex]);
                return;
            }

            close();
            onSubmit?.(urlInput.commitValue() || '');
            return;
        }

        if (event.key === 'Escape' && isVisible) {
            close();
            return;
        }

        urlInput.handleKeyDown(event);
    };

    return (
        <Popover open={isVisible} onOpenChange={isOpen => !isOpen && close()}>
            <PopoverAnchor asChild>
                <Input
                    ref={inputRef}
                    aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
                    aria-autocomplete='list'
                    aria-controls={isVisible ? listId : undefined}
                    aria-expanded={isVisible}
                    autoComplete='off'
                    className={className}
                    role='combobox'
                    value={urlInput.displayValue}
                    onBlur={() => {
                        close();
                        urlInput.commitValue();
                    }}
                    onChange={handleChange}
                    onFocus={(event) => {
                        urlInput.handleFocus(event);

                        // Only offer the list for an empty field — a field that
                        // already holds a URL is being reviewed, not filled in
                        if (!event.target.value) {
                            openWithSuggestions('');
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    {...props}
                />
            </PopoverAnchor>
            <PopoverContent
                align='start'
                className='max-h-72 w-(--radix-popover-trigger-width) overflow-y-auto p-0'
                // The input is the anchor, not a trigger, so Radix counts focusing
                // and clicking it as an outside interaction and would dismiss the
                // list the moment it opens. Closing is ours to do (blur/Escape/select).
                onInteractOutside={(event) => {
                    if (inputRef.current && event.target instanceof Node && inputRef.current.contains(event.target)) {
                        event.preventDefault();
                    }
                }}
                onOpenAutoFocus={event => event.preventDefault()}
            >
                {/* Geometry mirrors Shade's CommandList / CommandGroup / CommandItem so this
                    reads the same as the Members filter dropdown: the inset lives on the
                    group, not the item, which is what keeps the highlight off the edges. */}
                <div aria-label='URL suggestions' className='p-1' id={listId} role='listbox'>
                    {indexedGroups.map(group => (
                        <div key={group.label} aria-label={group.label} className='p-1.5' role='group'>
                            <div aria-hidden='true' className='px-2 py-1.5 text-xs font-medium text-muted-foreground'>
                                {group.label}
                            </div>
                            {group.items.map((item: IndexedSuggestion) => {
                                const isActive = item.index === activeIndex;

                                return (
                                    <div
                                        key={`${group.label}-${item.index}`}
                                        aria-selected={isActive}
                                        className={clsx(
                                            'cursor-pointer rounded-xs px-2 py-1.5',
                                            isActive && 'bg-interactive-hover'
                                        )}
                                        id={`${listId}-option-${item.index}`}
                                        role='option'
                                        // Capture phase + preventDefault so the input keeps focus and
                                        // its blur handler doesn't close the list before the click lands
                                        onMouseDownCapture={(event) => {
                                            event.preventDefault();
                                            selectSuggestion(item);
                                        }}
                                        onMouseMove={() => setActiveIndex(item.index)}
                                    >
                                        <span className='block truncate text-control text-foreground'>{item.label}</span>
                                        {item.description && (
                                            <span className='block truncate text-xs text-muted-foreground'>{item.description}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default UrlSuggestionInput;
