import type React from 'react';
import { useDeferredValue, useId, useMemo, useState } from 'react';
import type { HelpArticle } from './help-center';
import { getFaqQuestions, matchQuestions } from './help-questions';
import { useHelpCenterIndex } from './use-help-center-index';

/*
 * Completions as the user types: the help center's FAQ questions
 * (help-questions.ts) that continue what's in the search field so far
 * (help-search-field.tsx shows them, in place of the suggestions or results
 * beneath the field). Picking one searches for it straight away. Focus stays
 * in the field: the arrow keys move through the questions, Enter picks the
 * highlighted one (the field is a combobox for screen readers), and Escape
 * hides them until the text changes.
 */

interface HelpTypeaheadOptions {
  /** Loads the help center's articles while the panel is open */
  enabled: boolean;
  onPick: (question: HelpArticle) => void;
}

export function useHelpTypeahead({ enabled, onPick }: HelpTypeaheadOptions) {
  const index = useHelpCenterIndex(enabled);
  const listboxId = useId();
  const [draft, setDraftState] = useState('');
  const deferredDraft = useDeferredValue(draft);
  const [highlighted, setHighlighted] = useState(-1);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  const questions = useMemo(() => (index.data ? getFaqQuestions(index.data) : []), [index.data]);
  const matches = useMemo(
    () => matchQuestions(questions, deferredDraft),
    [questions, deferredDraft],
  );
  // A question already in the field whole isn't a completion of itself
  const showMatches =
    matches.length > 0 &&
    dismissedFor !== draft &&
    !(matches.length === 1 && matches[0]?.title === draft.trim());

  const setDraft = (next: string) => {
    setDraftState(next);
    setHighlighted(-1);
  };

  /** Puts the question in the field and searches for it. */
  const pick = (question: HelpArticle) => {
    setDraft(question.title);
    setDismissedFor(question.title);
    onPick(question);
  };

  /** Handles the keys for the completions, from the field; true when it did. */
  const onKeyCommand = (event: React.KeyboardEvent<HTMLInputElement>) => {
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
    if (event.key === 'Enter' && match) {
      event.preventDefault();
      pick(match);
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
    /** For the field, as the completions' combobox */
    comboboxProps: {
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': showMatches,
      'aria-controls': listboxId,
      'aria-activedescendant': highlightedMatch ? optionId(highlightedMatch) : undefined,
    } as const,
  };
}

export type HelpTypeahead = ReturnType<typeof useHelpTypeahead>;
