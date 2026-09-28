import React, { useRef, useState } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  inputSurface,
} from '@tryghost/shade/components';
import { PopoverAnchor } from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useDismissOnPanePress } from '@/automations/proto/canvas/flow-utils';

// ---------------------------------------------------------------------------
// A single-select field that searches from inside itself, and can optionally
// create what you typed.
//
// Extracted when the segment trigger arrived wanting the label field with a
// different bottom row. Two near-identical 90-line blocks in one file is how a
// field quietly becomes two fields that drift — one gets a fix, the other
// doesn't, and nobody notices until they're side by side on the same card.
//
// The bottom row is the variable: labels make themselves out of what you typed
// (onCreate), segments hand off to a builder (newItem), tiers do neither.
//
// WHY THE SEARCH IS IN THE FIELD
//
// Shade's MultiSelectCombobox renders its own search input at the top of the
// list, which is the usual arrangement and the one this started on. In the field
// instead, because the thing you are doing is answering the field — you click it
// and type, rather than clicking it, moving to a second input, and typing there.
//
// The cost is that Shade's compound ComboboxTrigger can't be used: it's a
// <button>, so an input can't live inside it. Hence the anchor-plus-div here,
// wearing the same recipe the trigger would have applied (inputSurface, value or
// placeholder, a chevron) so nothing about the field looks hand-made.
//
// The rows are rendered here rather than by Shade's MultiSelectCombobox — see
// the note at the list itself for why. Shade's Command pieces still do the
// styling and the pointer/keyboard behaviour.
//
// One thing that falls out of owning the list: the empty state is an explicit
// condition rather than something cmdk works out. It shows only when there is
// genuinely nothing to press — no matching options AND no create row — so a
// search matching nothing shows "New segment" alone instead of putting it
// beside "No results found".
//
// Known limitation, shared with the members area's picker for the same reason:
// with focus in the field rather than in cmdk's own input, arrow keys don't walk
// the list. Mouse and Enter work.
// ---------------------------------------------------------------------------

export interface SelectableOption {
  id: string;
  name: string;
}

export const SearchableSelectField: React.FC<{
  options: SelectableOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Shown when nothing is chosen — "Choose a label". */
  placeholder: string;
  /** Names what the input searches, for anyone not looking at it. */
  searchLabel: string;
  /**
   * Creation, when the field has any. Returns the new option's id so it can be
   * selected in the same gesture — typing a name into a trigger's audience field
   * means "watch this one", not "add it to the list and make me find it".
   *
   * Omitted by fields whose options need more than a name to exist — the
   * segment field takes `newItem` instead and raises a builder.
   */
  onCreate?: (name: string) => string;
  /** Whether what's typed is new. Required alongside onCreate. */
  canCreate?: (query: string) => boolean;
  /**
   * A standing row at the foot of the list that opens something else — the
   * segment field's "New segment", which raises a builder.
   *
   * Distinct from onCreate, and both can't sensibly be present: onCreate makes
   * the thing out of what you typed, this hands off to a surface that asks for
   * more. A field whose options need more than a name to exist takes this one.
   */
  newItem?: {
    label: string;
    onSelect: () => void;
    /**
     * Shown but inert. The segment field uses this: creating a segment means
     * reusing the members filtering experience, which is blocked on that
     * catalog moving out of the members domain, so the row stands as a marker
     * of where creation will live rather than opening a stand-in for it.
     */
    disabled?: boolean;
  };
  /**
   * Whether the field itself is a search input. Off for closed sets small
   * enough that a search box would be furniture — the three subscription
   * changes — which then get Shade's compound trigger instead, since with no
   * input to house there's no reason to hand-build the chrome.
   *
   * The LIST is the same either way, which is the point of them sharing this at
   * all: the rows hold still on selection in both.
   */
  searchable?: boolean;
}> = ({
  options,
  selectedId,
  onSelect,
  placeholder,
  searchLabel,
  onCreate,
  canCreate,
  newItem,
  searchable = true,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useDismissOnPanePress(open, () => setOpen(false));

  const selectedName = options.find((option) => option.id === selectedId)?.name ?? null;
  const query = searchable ? search.trim().toLowerCase() : '';
  const visible = query
    ? options.filter((option) => option.name.toLowerCase().includes(query))
    : options;
  const showCreate = Boolean(onCreate && canCreate?.(search));

  const create = () => {
    if (!onCreate) {
      return;
    }
    onSelect(onCreate(search));
    setOpen(false);
  };

  return (
    <Combobox
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // A search is a question about this opening of the list, not a setting —
        // it goes when the list does, so re-opening starts clean and the field
        // shows its value again.
        if (!next) {
          setSearch('');
        }
      }}
    >
      {searchable ? (
        <PopoverAnchor asChild>
          {/* nodrag/nopan so typing and clicking here never pans the canvas. */}
          <div
            aria-expanded={open}
            className={cn(
              inputSurface('self'),
              'nodrag nopan flex h-9 w-full cursor-text items-center gap-2 px-3',
              'transition-colors hover:bg-muted',
            )}
            role="combobox"
            onClick={() => {
              inputRef.current?.focus();
              setOpen(true);
            }}
          >
            <input
              ref={inputRef}
              aria-label={searchLabel}
              className="min-w-0 flex-1 bg-transparent text-control outline-hidden placeholder:text-muted-foreground"
              // Closed, the field IS its value. Open, it empties so you can type
              // straight away — and the value moves into the placeholder, so what
              // you're about to replace is still on screen instead of sitting
              // selected-and-about-to-vanish under the caret.
              placeholder={open ? (selectedName ?? placeholder) : placeholder}
              value={open ? search : (selectedName ?? '')}
              onChange={(event) => {
                setSearch(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(event) => {
                // Enter creates what you've typed, when it's new and this field
                // creates at all — the same act the footer row offers, without
                // reaching for the mouse.
                if (event.key === 'Enter' && showCreate) {
                  event.preventDefault();
                  create();
                  return;
                }
                if (event.key === 'Escape') {
                  setOpen(false);
                  inputRef.current?.blur();
                }
              }}
            />
            <LucideIcon.ChevronDown className="size-4 shrink-0 opacity-50" />
          </div>
        </PopoverAnchor>
      ) : (
        // Shade's own trigger, which is the same recipe the searchable half
        // draws by hand — worth using directly the moment there's no input that
        // has to live inside it (a <button> can't hold one).
        <ComboboxTrigger aria-label={searchLabel} className="nodrag nopan">
          <ComboboxValue placeholder={!selectedName}>{selectedName ?? placeholder}</ComboboxValue>
        </ComboboxTrigger>
      )}
      <ComboboxContent
        updatePositionStrategy="always"
        // The caret stays in the field — taking focus here would end the typing
        // that opened the list.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {/* OUR OWN ROWS, not MultiSelectCombobox's.
            
            It groups selected options above unselected ones under a "Selected"
            heading, which for a multi-select is sensible and for this is not:
            with exactly one value, picking a row hoists it to the top and every
            other option shifts under it. Choosing a thing should not rearrange
            the list you chose it from — the next choice is then in a different
            place than the one you were just looking at.
            
            There's no prop for it; the split is structural. So the rows are
            rendered here, in the order the caller gave them, and selection
            shows as a check and nothing else. Shade's Command pieces still do
            the styling and the keyboard/pointer behaviour, so a row looks and
            acts exactly as it did.
            
            (Worth raising with Shade: a single-select MultiSelectCombobox
            always hoists, so this isn't specific to us.) */}
        <Command shouldFilter={false}>
          <CommandList className="max-h-64 overflow-y-auto">
            {visible.length === 0 && !showCreate && !newItem && (
              <CommandEmpty>No results found</CommandEmpty>
            )}
            {visible.length > 0 && (
              <CommandGroup className="[&_[cmdk-group-heading]]:hidden">
                {visible.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => {
                      onSelect(option.id === selectedId ? null : option.id);
                      setOpen(false);
                    }}
                  >
                    <span className="flex-1 truncate">{option.name}</span>
                    {/* Held at opacity-0 rather than omitted, so a row doesn't
                        change width the moment it becomes the selected one. */}
                    <LucideIcon.Check
                      className={cn(
                        'ms-auto size-4 shrink-0 text-primary',
                        option.id !== selectedId && 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {(showCreate || newItem) && (
              <CommandGroup className="[&_[cmdk-group-heading]]:hidden">
                {showCreate && (
                  <CommandItem value={`__create__${search}`} onSelect={create}>
                    <LucideIcon.Plus className="size-4" />
                    Create &quot;{search.trim()}&quot;
                  </CommandItem>
                )}
                {/* Standing, not conditional on what's typed: the point of this
                    row is that the thing you need can be made from here, and a
                    row that only appears once you've typed a name nobody has
                    used is a row you find by accident. */}
                {newItem && (
                  <CommandItem
                    disabled={newItem.disabled}
                    value="__new__"
                    onSelect={() => {
                      if (newItem.disabled) {
                        return;
                      }
                      setOpen(false);
                      newItem.onSelect();
                    }}
                  >
                    <LucideIcon.Plus className="size-4" />
                    {newItem.label}
                  </CommandItem>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </ComboboxContent>
    </Combobox>
  );
};
