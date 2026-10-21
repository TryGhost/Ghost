import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom';
import { Badge, tokenFieldClasses } from '@tryghost/shade/components';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

// Matches the shared chip picker's list.
const LIST_MAX_HEIGHT_PX = 256;
const VIEWPORT_GUTTER_PX = 16;

export type TierScopeTier = { id: string; name: string };

type Row = { kind: 'standalone' } | { kind: 'tier'; tier: TierScopeTier };

export type TierScopePickerProps<TStandalone extends string> = {
  // The standalone option's value, or the chosen tier ids; empty is unanswered.
  value: TStandalone | readonly string[];
  // "Any paid tier" or "Free": choosing it replaces the tiers, and a tier replaces it.
  standalone: { value: TStandalone; label: string };
  tiers: readonly TierScopeTier[];
  onChange: (next: TStandalone | string[]) => void;
  tiersHeading?: string;
  emptyMessage: string;
  placeholder: string;
  inputLabel: string;
  inputId?: string;
  describedBy?: string;
  invalid?: boolean;
  notice?: ReactNode;
};

// One standalone option or several tiers in one dropdown. Built on Shade's token field
// recipe rather than the shared chip picker so the standalone option reads as a plain
// value, as a Select shows one, while tiers read as chips.
export function TierScopePicker<TStandalone extends string>({
  value,
  standalone,
  tiers,
  onChange,
  tiersHeading = 'Specific tiers',
  emptyMessage,
  placeholder,
  inputLabel,
  inputId,
  describedBy,
  invalid,
  notice,
}: TierScopePickerProps<TStandalone>) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const standaloneChosen = value === standalone.value;
  const chosenIds: readonly string[] = typeof value === 'string' ? [] : value;
  const chosenTiers = tiers.filter((tier) => chosenIds.includes(tier.id));

  // Fixed so an overflow-hidden ancestor can't clip the list.
  const { refs, floatingStyles } = useFloating({
    open,
    placement: 'bottom-end',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ padding: VIEWPORT_GUTTER_PX }),
      shift({ padding: VIEWPORT_GUTTER_PX }),
      size({
        padding: VIEWPORT_GUTTER_PX,
        apply({ availableHeight, elements, rects }) {
          Object.assign(elements.floating.style, {
            minWidth: `min(${rects.reference.width}px, calc(100vw - ${VIEWPORT_GUTTER_PX * 2}px))`,
            maxHeight: `${Math.min(LIST_MAX_HEIGHT_PX, availableHeight)}px`,
          });
        },
      }),
    ],
  });

  const close = useCallback(() => setOpen(false), []);

  const closeAndDiscard = useCallback(() => {
    setOpen(false);
    setSearch('');
  }, []);

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

  // Captured on the document so Escape closes only the list, not an enclosing pane.
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [close, open]);

  const term = search.trim().toLowerCase();

  useEffect(() => {
    setHighlighted(0);
  }, [term]);

  const matches = (label: string) => term === '' || label.toLowerCase().includes(term);
  const rows: Row[] = notice
    ? []
    : [
        ...(matches(standalone.label) ? [{ kind: 'standalone' as const }] : []),
        ...tiers
          .filter((tier) => matches(tier.name))
          .map((tier) => ({ kind: 'tier' as const, tier })),
      ];
  const highlightedIndex = Math.min(highlighted, Math.max(rows.length - 1, 0));

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-highlighted="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  const isChosen = (row: Row) =>
    row.kind === 'standalone' ? standaloneChosen : chosenIds.includes(row.tier.id);

  const inTierOrder = (ids: readonly string[]) =>
    tiers.map((tier) => tier.id).filter((id) => ids.includes(id));

  const choose = (row: Row) => {
    if (row.kind === 'standalone') {
      onChange(standaloneChosen ? [] : standalone.value);
      // A single choice closes the list, as a Select does.
      if (!standaloneChosen) {
        close();
      }
    } else if (chosenIds.includes(row.tier.id)) {
      onChange(chosenIds.filter((id) => id !== row.tier.id));
    } else {
      onChange(inTierOrder([...chosenIds, row.tier.id]));
    }
    setSearch('');
  };

  const removeLast = () => {
    if (standaloneChosen) {
      onChange([]);
    } else if (chosenIds.length > 0) {
      onChange(chosenIds.slice(0, -1));
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
      return;
    }

    if (event.key === 'Backspace' && search === '') {
      removeLast();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      if (!open) {
        setOpen(true);
        return;
      }

      if (rows.length > 0) {
        const step = event.key === 'ArrowDown' ? 1 : -1;

        setHighlighted((highlightedIndex + step + rows.length) % rows.length);
      }

      return;
    }

    // Tab commits only a typed search; otherwise it moves focus on.
    const commits = event.key === 'Enter' || (event.key === 'Tab' && term !== '');

    if (commits && open && rows[highlightedIndex]) {
      event.preventDefault();
      choose(rows[highlightedIndex]);
    }
  };

  const optionId = (index: number) => `${listId}-option-${index}`;
  const headingId = `${listId}-tiers`;
  const nothingChosen = !standaloneChosen && chosenTiers.length === 0;

  const renderRow = (row: Row, index: number) => {
    const isHighlighted = index === highlightedIndex;
    const chosen = isChosen(row);
    const label = row.kind === 'standalone' ? standalone.label : row.tier.name;

    return (
      <div
        key={row.kind === 'standalone' ? standalone.value : row.tier.id}
        aria-selected={chosen}
        className={cn(
          'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-(length:--text-control) leading-5',
          isHighlighted && 'bg-accent text-accent-foreground',
        )}
        data-highlighted={isHighlighted}
        id={optionId(index)}
        role="option"
        onClick={() => choose(row)}
        // Keeps focus in the input after a pick.
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => setHighlighted(index)}
      >
        <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
        {chosen && <LucideIcon.Check className="ms-auto size-4 shrink-0 text-primary" />}
      </div>
    );
  };

  // Rows keep their flat index so the keyboard walks across both sections.
  const standaloneRows = rows.flatMap((row, index) =>
    row.kind === 'standalone' ? [renderRow(row, index)] : [],
  );
  const tierRows = rows.flatMap((row, index) =>
    row.kind === 'tier' ? [renderRow(row, index)] : [],
  );

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
        ref={refs.setReference}
        className={cn(tokenFieldClasses.field, 'pr-8')}
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {/* px-2 matches the input, so the value sits where a Select's does. */}
        {standaloneChosen && <span className="px-2 text-foreground">{standalone.label}</span>}
        {chosenTiers.map((tier) => (
          <Badge
            key={tier.id}
            className={cn(tokenFieldClasses.chip, 'bg-secondary')}
            variant="outline"
            asChild
          >
            <button
              aria-label={`Remove ${tier.name}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onChange(chosenIds.filter((id) => id !== tier.id));
              }}
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">{tier.name}</span>
              <LucideIcon.X className="mt-0.5 size-3 shrink-0 self-start" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          aria-activedescendant={
            open && rows[highlightedIndex] ? optionId(highlightedIndex) : undefined
          }
          aria-autocomplete="list"
          aria-controls={open ? listId : undefined}
          aria-describedby={describedBy}
          aria-expanded={open}
          aria-invalid={invalid}
          aria-label={inputId ? undefined : inputLabel}
          className={cn(
            tokenFieldClasses.input,
            // No caret beside the standalone value until something is typed.
            standaloneChosen && search === '' && 'caret-transparent',
          )}
          id={inputId}
          placeholder={nothingChosen ? placeholder : ''}
          role="combobox"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <LucideIcon.ChevronDown className={tokenFieldClasses.chevron} />
      </div>
      {open && (
        <div
          ref={refs.setFloating}
          className="z-50 w-max max-w-[min(480px,calc(100vw-32px))] overflow-y-auto rounded-md border border-border/60 bg-surface-elevated-2 p-1 text-popover-foreground shadow-md dark:border-border/30"
          style={floatingStyles}
        >
          {notice}
          <div ref={listRef} aria-label={inputLabel} id={listId} role="listbox">
            {!notice && rows.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</div>
            )}
            {standaloneRows}
            {tierRows.length > 0 && (
              <>
                {standaloneRows.length > 0 && (
                  <div className="-mx-1 my-1 h-px bg-border" role="separator" />
                )}
                <div aria-labelledby={headingId} role="group">
                  <div
                    className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
                    id={headingId}
                  >
                    {tiersHeading}
                  </div>
                  {tierRows}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
