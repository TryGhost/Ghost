import { Text } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import type { HelpArticle } from './help-center';

/*
 * Matches as the user types: the help center articles their question matches
 * so far, above the composer, so many never need to ask. The state and keys
 * are use-help-typeahead.ts: focus stays in the composer (a combobox pointing
 * at this listbox), and opening a match reads it in the panel.
 */

// Subtle on purpose: it changes with every keystroke. The list rises in once;
// after that, only rows new to it do (keyed by article, rows that stay put
// don't), each a moment after the one above.
const LIST_ENTRANCE_CLASS_NAME =
  'motion-safe:animate-in motion-safe:duration-200 motion-safe:ease-out motion-safe:fade-in motion-safe:slide-in-from-bottom-1';
const ROW_ENTRANCE_CLASS_NAME =
  'motion-safe:animate-in motion-safe:duration-150 motion-safe:ease-out motion-safe:fill-mode-both motion-safe:fade-in motion-safe:slide-in-from-bottom-1';
const ROW_STAGGER = 25;

interface HelpTypeaheadProps {
  matches: HelpArticle[];
  /** The match the arrow keys are on, or -1 */
  highlighted: number;
  listboxId: string;
  optionId: (article: HelpArticle) => string;
  onHighlight: (index: number) => void;
  onOpen: (article: HelpArticle) => void;
}

export function HelpTypeahead({
  matches,
  highlighted,
  listboxId,
  optionId,
  onHighlight,
  onOpen,
}: HelpTypeaheadProps) {
  return (
    <div
      className={cn('shrink-0 border-t border-border-default px-2 pt-2', LIST_ENTRANCE_CLASS_NAME)}
    >
      <Text className="px-2 pb-1" id={`${listboxId}-label`} size="xs" tone="tertiary">
        Matching articles
      </Text>
      <div aria-labelledby={`${listboxId}-label`} id={listboxId} role="listbox">
        {/* Not tabbable, and they keep focus in the composer on mouse-down, so
            typing carries on */}
        {matches.map((article, index) => (
          <button
            key={article.id}
            aria-selected={index === highlighted}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left outline-hidden transition-colors hover:bg-accent',
              ROW_ENTRANCE_CLASS_NAME,
              index === highlighted && 'bg-accent',
            )}
            id={optionId(article)}
            role="option"
            style={{ animationDelay: `${index * ROW_STAGGER}ms` }}
            tabIndex={-1}
            type="button"
            onClick={() => onOpen(article)}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHighlight(index)}
          >
            <LucideIcon.FileText className="size-4 shrink-0 text-text-tertiary" />
            <Text as="span" className="min-w-0 flex-1" size="sm" truncate>
              {article.title}
            </Text>
            <Text as="span" className="shrink-0" size="xs" tone="tertiary">
              {article.tags[0]?.name}
            </Text>
          </button>
        ))}
      </div>
    </div>
  );
}
