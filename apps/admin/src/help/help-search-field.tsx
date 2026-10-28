import type React from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import type { HelpArticle } from './help-center';
import type { HelpTypeahead } from './use-help-typeahead';

/*
 * The search field at the top of the panel, and the FAQ questions that
 * complete what's typed in it (use-help-typeahead.ts), shown right under it
 * where the suggestions or results otherwise are, so nothing overlaps.
 * Enter searches for what's typed; picking a completion searches for it.
 */

interface HelpSearchFieldProps {
  inputRef: React.Ref<HTMLInputElement>;
  typeahead: HelpTypeahead;
  busy: boolean;
  onSearch: (text: string) => void;
  /** Gets each key first (the number shortcuts); returns true when it handled it */
  onKeyCommand: (event: React.KeyboardEvent<HTMLInputElement>) => boolean;
}

export function HelpSearchField({
  inputRef,
  typeahead,
  busy,
  onSearch,
  onKeyCommand,
}: HelpSearchFieldProps) {
  const canSearch = typeahead.draft.trim().length > 0 && !busy;

  return (
    <form
      className="shrink-0"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSearch) {
          onSearch(typeahead.draft);
        }
      }}
    >
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <LucideIcon.Search className="text-text-tertiary" />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          {...typeahead.comboboxProps}
          aria-label="Search the help center"
          placeholder="Search the help center, or ask a question…"
          value={typeahead.draft}
          onChange={(event) => typeahead.setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) {
              return;
            }
            if (onKeyCommand(event)) {
              return;
            }
            typeahead.onKeyCommand(event);
          }}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label="Search"
            disabled={!canSearch}
            size="icon-xs"
            type="submit"
            variant={canSearch ? 'default' : 'ghost'}
          >
            <LucideIcon.ArrowRight />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}

// The list rises in once; after that, only rows new to it do (keyed by
// question), each a moment after the one above
const LIST_ENTRANCE_CLASS_NAME =
  'motion-safe:animate-in motion-safe:duration-200 motion-safe:ease-out motion-safe:fade-in motion-safe:slide-in-from-bottom-1';
const ROW_ENTRANCE_CLASS_NAME =
  'motion-safe:animate-in motion-safe:duration-150 motion-safe:ease-out motion-safe:fill-mode-both motion-safe:fade-in motion-safe:slide-in-from-bottom-1';
const ROW_STAGGER = 25;

/** The FAQ questions completing what's typed, under the field. */
export function HelpCompletions({ typeahead }: { typeahead: HelpTypeahead }) {
  return (
    <div
      aria-label="Questions you could search for"
      className={cn('-mx-2 flex flex-col', LIST_ENTRANCE_CLASS_NAME)}
      id={typeahead.listboxId}
      role="listbox"
    >
      {/* Not tabbable, and they keep focus in the field on mouse-down, so
          typing carries on */}
      {typeahead.matches.map((question, index) => (
        <button
          key={question.id}
          aria-selected={index === typeahead.highlighted}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg p-2 text-left outline-hidden transition-colors hover:bg-accent',
            ROW_ENTRANCE_CLASS_NAME,
            index === typeahead.highlighted && 'bg-accent',
          )}
          id={typeahead.optionId(question)}
          role="option"
          style={{ animationDelay: `${index * ROW_STAGGER}ms` }}
          tabIndex={-1}
          type="button"
          onClick={() => typeahead.pick(question)}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => typeahead.setHighlighted(index)}
        >
          <LucideIcon.Search className="size-4 shrink-0 text-text-tertiary" />
          <Text as="span" className="min-w-0 flex-1" leading="snug" tone="secondary">
            {question.title}
          </Text>
        </button>
      ))}
    </div>
  );
}

export type { HelpArticle };
