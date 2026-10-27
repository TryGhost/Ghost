import { Text } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import type { HelpArticle } from './help-center';

/*
 * Completions as the user types: the help center's FAQ questions that continue
 * what they've typed so far, above the composer. The state and keys are
 * use-help-typeahead.ts: focus stays in the composer (a combobox pointing at
 * this listbox), and picking a question puts it in the composer to send.
 */

// Subtle on purpose: it changes with every keystroke. The list rises in once;
// after that, only rows new to it do (keyed by question, rows that stay put
// don't), each a moment after the one above.
const LIST_ENTRANCE_CLASS_NAME =
  'motion-safe:animate-in motion-safe:duration-200 motion-safe:ease-out motion-safe:fade-in motion-safe:slide-in-from-bottom-1';
const ROW_ENTRANCE_CLASS_NAME =
  'motion-safe:animate-in motion-safe:duration-150 motion-safe:ease-out motion-safe:fill-mode-both motion-safe:fade-in motion-safe:slide-in-from-bottom-1';
const ROW_STAGGER = 25;

interface HelpTypeaheadProps {
  matches: HelpArticle[];
  /** The question the arrow keys are on, or -1 */
  highlighted: number;
  listboxId: string;
  optionId: (question: HelpArticle) => string;
  onHighlight: (index: number) => void;
  onPick: (question: HelpArticle) => void;
}

export function HelpTypeahead({
  matches,
  highlighted,
  listboxId,
  optionId,
  onHighlight,
  onPick,
}: HelpTypeaheadProps) {
  return (
    <div
      className={cn('shrink-0 border-t border-border-default px-2 pt-2', LIST_ENTRANCE_CLASS_NAME)}
    >
      <div aria-label="Questions you could ask" id={listboxId} role="listbox">
        {/* Not tabbable, and they keep focus in the composer on mouse-down, so
            typing carries on */}
        {matches.map((question, index) => (
          <button
            key={question.id}
            aria-selected={index === highlighted}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left outline-hidden transition-colors hover:bg-accent',
              ROW_ENTRANCE_CLASS_NAME,
              index === highlighted && 'bg-accent',
            )}
            id={optionId(question)}
            role="option"
            style={{ animationDelay: `${index * ROW_STAGGER}ms` }}
            tabIndex={-1}
            type="button"
            onClick={() => onPick(question)}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHighlight(index)}
          >
            <LucideIcon.Search className="size-4 shrink-0 text-text-tertiary" />
            <Text as="span" className="min-w-0 flex-1" size="sm" truncate>
              {question.title}
            </Text>
            {index === highlighted && (
              <Text as="span" className="shrink-0" size="xs" tone="tertiary">
                Tab
              </Text>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
