import type React from 'react';
import { useDeferredValue, useId, useMemo, useState } from 'react';
import type { HelpArticle } from './help-center';
import { getFaqQuestions, matchQuestions } from './help-questions';
import { useHelpCenterIndex } from './use-help-center-index';

/*
 * Completions as the user types: the help center's FAQ questions
 * (help-questions.ts) that continue what's in the composer so far
 * (help-typeahead.tsx shows them). Picking one puts the whole question in the
 * composer in place of what was typed; the user sends it from there. Focus
 * stays in the composer: the arrow keys move through the questions, Enter or
 * Tab picks one (the composer is a combobox for screen readers), and Escape
 * hides them until the text changes.
 */

interface HelpTypeaheadOptions {
  /** Loads the help center's articles while the panel is open */
  enabled: boolean;
  /** Completions hide while an answer is on its way */
  busy: boolean;
}

export function useHelpTypeahead({ enabled, busy }: HelpTypeaheadOptions) {
  const index = useHelpCenterIndex(enabled);
  const listboxId = useId();
  const [draft, setDraftState] = useState('');
  // Matching a few dozen questions is quick; deferring still keeps typing smooth
  const deferredDraft = useDeferredValue(draft);
  const [highlighted, setHighlighted] = useState(-1);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  const questions = useMemo(() => (index.data ? getFaqQuestions(index.data) : []), [index.data]);
  const matches = useMemo(
    () => matchQuestions(questions, deferredDraft),
    [questions, deferredDraft],
  );
  // A question already in the composer whole isn't a completion of itself
  const showMatches =
    matches.length > 0 &&
    dismissedFor !== draft &&
    !busy &&
    !(matches.length === 1 && matches[0]?.title === draft.trim());

  const setDraft = (next: string) => {
    setDraftState(next);
    setHighlighted(-1);
  };

  /** Puts the question in the composer, in place of what was typed. */
  const pick = (question: HelpArticle) => {
    setDraft(question.title);
    setDismissedFor(question.title);
  };

  /** Handles the keys for the completions, from the composer; true when it did. */
  const onKeyCommand = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMatches) {
      return false;
    }
    const last = matches.length - 1;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((current) => {
        if (event.key === 'ArrowDown') {
          return current < last ? current + 1 : 0;
        }
        return current > 0 ? current - 1 : last;
      });
      return true;
    }
    const match = matches[highlighted];
    if (event.key === 'Enter' && !event.shiftKey && match) {
      event.preventDefault();
      pick(match);
      return true;
    }
    // Tab takes the highlighted question, or the first
    const tabbed = match ?? matches[0];
    if (event.key === 'Tab' && !event.shiftKey && tabbed) {
      event.preventDefault();
      pick(tabbed);
      return true;
    }
    if (event.key === 'Escape') {
      // Hides the completions, not the panel
      event.preventDefault();
      event.stopPropagation();
      setDismissedFor(draft);
      return true;
    }
    return false;
  };

  const optionId = (question: HelpArticle) => `${listboxId}-${question.id}`;
  const highlightedMatch = showMatches ? matches[highlighted] : undefined;

  return {
    draft,
    setDraft,
    matches,
    showMatches,
    highlighted,
    setHighlighted,
    pick,
    onKeyCommand,
    listboxId,
    optionId,
    /** For the composer, as the completions' combobox */
    comboboxProps: {
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': showMatches,
      'aria-controls': listboxId,
      'aria-activedescendant': highlightedMatch ? optionId(highlightedMatch) : undefined,
    } as const,
  };
}
