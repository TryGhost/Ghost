import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Badge, Button, inputSurface } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import {
  settingsAuthorChip,
  settingsAuthorsList,
  settingsAuthorsPicker,
} from '@tryghost/test-data/selectors/editor';
import type { AuthorOption } from './authors-options';

export interface AuthorsPickerProps {
  inputId: string;
  describedBy?: string;
  invalid: boolean;
  /** The post's authors, in order. */
  selected: AuthorOption[];
  /** Everyone else, already narrowed by the typed term. */
  suggestions: AuthorOption[];
  loading: boolean;
  loadError: boolean;
  onRetry: () => void;
  onChange: (next: AuthorOption[]) => void;
  /** The first open; the staff browse starts here rather than on every editor entry. */
  onOpen: () => void;
  onSearch: (term: string) => void;
  term: string;
}

/**
 * The authors token field: chips for the post's authors and a list of the
 * staff who could join them. Users are never created here, so the list only
 * ever offers people who already exist.
 */
export function AuthorsPicker({
  inputId,
  describedBy,
  invalid,
  selected,
  suggestions,
  loading,
  loadError,
  onRetry,
  onChange,
  onOpen,
  onSearch,
  term,
}: AuthorsPickerProps) {
  const listId = useId();
  const optionId = (index: number) => `${listId}-${index}`;
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const showLoadError = loadError && !loading;

  // The term goes with the list when the writer leaves the field: left behind,
  // it reads as an edit that nothing will ever commit.
  const closeAndDiscard = useCallback(() => {
    setOpen(false);
    onSearch('');
  }, [onSearch]);

  // Dismissal on `pointerdown` without preventing the default, so the click
  // that follows still reaches whatever the writer aimed at.
  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeAndDiscard();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [closeAndDiscard, open]);

  // Back to the first row whenever the list narrows, so the highlight never
  // points past the end of what is on screen.
  useEffect(() => {
    setHighlighted(0);
  }, [term]);

  // A pick can shrink the list under the highlight, which leaves the stored
  // index past the end until the next arrow key moves it.
  const highlightedIndex = Math.min(highlighted, Math.max(suggestions.length - 1, 0));

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-highlighted="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  const reveal = () => {
    setOpen(true);
    onOpen();
  };

  const choose = (option: AuthorOption) => {
    onChange([...selected, option]);
    // Cleared either way: leaving the term in the field means the next thing
    // typed appends to a search already acted on.
    onSearch('');
  };

  const remove = (option: AuthorOption) => {
    onChange(selected.filter((author) => author.id !== option.id));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    // IME confirmation and candidate navigation belong to the input method.
    // Safari can end composition before its confirmation keydown, reporting 229.
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
      return;
    }

    if (event.key === 'Backspace' && !term && selected.length > 0) {
      remove(selected[selected.length - 1]);
      // The list comes back with the removed author in it (gh-token-input.js).
      reveal();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      if (!open) {
        reveal();
        return;
      }

      if (suggestions.length > 0) {
        const step = event.key === 'ArrowDown' ? 1 : -1;

        setHighlighted((highlightedIndex + step + suggestions.length) % suggestions.length);
      }

      return;
    }

    // Escape keeps the term: the writer closed the list, not the search.
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }

    const commits = event.key === 'Enter' || (event.key === 'Tab' && term.trim().length > 0);
    if (commits && open && !showLoadError && suggestions[highlightedIndex]) {
      event.preventDefault();
      choose(suggestions[highlightedIndex]);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          closeAndDiscard();
        }
      }}
    >
      <div
        className={cn(
          inputSurface('within'),
          'flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 px-3 py-1 text-control',
        )}
        data-testid={settingsAuthorsPicker}
        onClick={() => {
          inputRef.current?.focus();
          reveal();
        }}
      >
        {selected.map((author) => (
          <Badge key={author.id} className="gap-1 pr-1" data-testid={settingsAuthorChip}>
            {author.name}
            <button
              aria-label={`Remove ${author.name}`}
              className="rounded-full hover:opacity-70"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                remove(author);
              }}
            >
              <LucideIcon.X className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          aria-activedescendant={
            open && !showLoadError && suggestions[highlightedIndex]
              ? optionId(highlightedIndex)
              : undefined
          }
          aria-autocomplete="list"
          aria-controls={listId}
          aria-describedby={describedBy}
          aria-expanded={open}
          aria-invalid={invalid}
          className="min-w-20 flex-1 bg-transparent text-control outline-hidden placeholder:text-muted-foreground"
          id={inputId}
          placeholder={selected.length === 0 ? 'Select authors...' : ''}
          role="combobox"
          value={term}
          onChange={(event) => {
            onSearch(event.target.value);
            reveal();
          }}
          onKeyDown={handleKeyDown}
        />
        <LucideIcon.ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </div>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border/60 bg-surface-elevated-2 p-1 text-popover-foreground shadow-md dark:border-border/30">
          {showLoadError && (
            <Stack align="start" className="p-2" gap="sm">
              <Text role="alert" size="sm">
                Couldn’t load authors.
              </Text>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  inputRef.current?.focus();
                  onRetry();
                }}
              >
                Retry
              </Button>
            </Stack>
          )}
          <div ref={listRef} data-testid={settingsAuthorsList} id={listId} role="listbox">
            {!showLoadError && suggestions.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {loading ? 'Loading authors...' : 'No authors found'}
              </div>
            )}
            {!showLoadError &&
              suggestions.map((option, index) => {
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={option.id}
                    // Never true: the list leaves out everyone the post already credits.
                    aria-selected={false}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                      isHighlighted && 'bg-accent text-accent-foreground',
                    )}
                    data-highlighted={isHighlighted}
                    id={optionId(index)}
                    role="option"
                    onClick={() => choose(option)}
                    // Keeps focus in the input, which clicking a plain div would
                    // otherwise drop, so the writer can keep typing after picking.
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlighted(index)}
                  >
                    <span className="truncate">{option.name}</span>
                    <span className="ms-auto truncate text-xs text-muted-foreground">
                      {option.email}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
