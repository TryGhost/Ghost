import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import useUrlInput from '@/settings/hooks/use-url-input';
import { Input, Popover, PopoverAnchor, PopoverContent } from '@tryghost/shade/components';
import { formatUrl } from '@/settings/utils/format-url';

const SUGGESTION_DEBOUNCE_MS = 150;

export type Suggestion = {
  label: string;
  /** Written into the URL field when picked */
  value: string;
  /** Shown under the label: the URL for links, the path for content */
  description?: string;
};

export type SuggestionGroup = {
  label: string;
  items: Suggestion[];
};

type IndexedSuggestion = Suggestion & { index: number };

// Numbers items across all groups, so arrow keys and `aria-activedescendant`
// can move from one group into the next
const indexGroups = (groups: SuggestionGroup[]) => {
  let offset = 0;
  return groups.map((group) => {
    const items = group.items.map((item, itemIndex) => ({ ...item, index: offset + itemIndex }));
    offset += group.items.length;
    return { label: group.label, items };
  });
};

// The field handles these itself: a caller's `onBlur` would stop the URL being
// tidied up, and an `onKeyDown` would break Enter and the arrow keys.
// `onSubmit` is redefined below, replacing the native form event.
export type UrlSuggestionInputProps = Omit<
  React.ComponentProps<typeof Input>,
  | 'value'
  | 'onChange'
  | 'onSubmit'
  | 'onBlur'
  | 'onFocus'
  | 'onKeyDown'
  | 'ref'
  | 'role'
  | 'autoComplete'
  | 'aria-activedescendant'
  | 'aria-autocomplete'
  | 'aria-controls'
  | 'aria-expanded'
> & {
  baseUrl: string;
  /** The saved value, usually relative to the site */
  value: string;
  loadSuggestions: (term: string) => Promise<SuggestionGroup[]>;
  onChange: (value: string) => void;
  /** Enter pressed with no suggestion highlighted */
  onSubmit?: () => void;
  /** Any edit by the user, e.g. to clear a validation error */
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
    onChange: (newValue) => onChange(newValue || ''),
  });

  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<SuggestionGroup[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const indexedGroups = useMemo(() => indexGroups(groups), [groups]);
  const suggestions = useMemo(() => indexedGroups.flatMap((group) => group.items), [indexedGroups]);

  const fetchSuggestions = useCallback(
    (term: string) => {
      const id = requestId.current + 1;
      requestId.current = id;

      loadSuggestions(term)
        .then((result) => {
          // A newer search has started since, so this result is stale
          if (requestId.current !== id) {
            return;
          }
          setGroups(result);
          setActiveIndex(-1);
        })
        .catch(() => {
          if (requestId.current !== id) {
            return;
          }
          setGroups([]);
        });
    },
    [loadSuggestions],
  );

  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  // Keeps the highlighted option in view while arrowing through a long list
  useEffect(() => {
    if (activeIndex < 0) {
      return;
    }
    document
      .getElementById(`${listId}-option-${activeIndex}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, listId]);

  const openWithSuggestions = useCallback(
    (term: string) => {
      setOpen(true);
      fetchSuggestions(term);
    },
    [fetchSuggestions],
  );

  const close = useCallback(() => {
    clearTimeout(debounceTimer.current);
    requestId.current += 1;
    setOpen(false);
    setGroups([]);
    setActiveIndex(-1);
  }, []);

  // Like the editor's Button URL field, an empty list stays hidden
  const isVisible = open && suggestions.length > 0;

  const selectSuggestion = (suggestion: Suggestion) => {
    const urls = formatUrl(suggestion.value, baseUrl, true);
    urlInput.setDisplayValue(urls.display);
    onChange(urls.save || '');
    onEdit?.();
    close();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    urlInput.setDraftValue(term);
    onEdit?.();

    setOpen(true);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchSuggestions(term), SUGGESTION_DEBOUNCE_MS);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      // Nothing on screen to move through, so search with what's in the field
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
      urlInput.commitValue();
      onSubmit?.();
      return;
    }

    if (event.key === 'Escape' && isVisible) {
      close();
      return;
    }

    urlInput.handleKeyDown(event);
  };

  return (
    <Popover open={isVisible} onOpenChange={(isOpen) => !isOpen && close()}>
      <PopoverAnchor asChild>
        <Input
          {...props}
          ref={inputRef}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-controls={isVisible ? listId : undefined}
          aria-expanded={isVisible}
          autoComplete="off"
          className={className}
          role="combobox"
          value={urlInput.displayValue}
          onBlur={() => {
            close();
            urlInput.commitValue();
          }}
          onChange={handleChange}
          onFocus={(event) => {
            urlInput.handleFocus(event);

            // A field that already has a URL is being checked, not filled in
            if (!event.target.value) {
              openWithSuggestions('');
            }
          }}
          onKeyDown={handleKeyDown}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="max-h-72 w-(--radix-popover-trigger-width) overflow-y-auto p-0"
        // The input anchors the popover rather than triggering it, so Radix
        // treats clicking it as clicking outside and would close the list as
        // it opens
        onInteractOutside={(event) => {
          if (
            inputRef.current &&
            event.target instanceof Node &&
            inputRef.current.contains(event.target)
          ) {
            event.preventDefault();
          }
        }}
        // Keeps focus in the input: pressing on a heading, the padding or the
        // scrollbar would otherwise blur it and close the list
        onMouseDown={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {/* Spacing matches Shade's Command components, as in the Members filter
                    dropdown. The padding is on the group, not the item, which keeps
                    the highlight off the edges. */}
        <div aria-label="URL suggestions" className="p-1" id={listId} role="listbox">
          {indexedGroups.map((group) => (
            <div key={group.label} aria-label={group.label} className="p-1.5" role="group">
              <div
                aria-hidden="true"
                className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
              >
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
                      isActive && 'bg-interactive-hover',
                    )}
                    id={`${listId}-option-${item.index}`}
                    role="option"
                    // Click, not mousedown, so a right-click doesn't pick it
                    onClick={() => selectSuggestion(item)}
                    onMouseMove={() => setActiveIndex(item.index)}
                  >
                    <span className="block truncate text-control text-foreground">
                      {item.label}
                    </span>
                    {item.description && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
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
