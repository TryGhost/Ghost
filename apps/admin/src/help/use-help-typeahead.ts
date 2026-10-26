import type React from 'react';
import { useDeferredValue, useId, useMemo, useState } from 'react';
import type { HelpArticle } from './help-center';
import type { HelpPageKey } from './help-pages';
import { getPageContext, getSearchTerms, rankHelpArticles, type HelpFollowUp } from './help-search';
import { useHelpCenterIndex } from './use-help-center-index';

/*
 * Matches as the user types: the composer's text, and the help center
 * articles it matches so far (help-typeahead.tsx shows them), ranked like an
 * answer would be. Focus stays in the composer: the arrow keys move through
 * the matches and Enter opens one (the composer is a combobox for screen
 * readers), and Escape hides them until the text changes. Opening one clears
 * the text, which has done its job.
 */

// Shorter than this, a question matches too much to be useful
const MIN_LENGTH = 3;

interface HelpTypeaheadOptions {
  /** Loads the help center's articles while the panel is open */
  enabled: boolean;
  /** The page questions are asked from, unless the user left it out */
  pageKey: HelpPageKey | null;
  followUp: HelpFollowUp | null;
  /** Matches hide while an answer is on its way */
  busy: boolean;
  onOpen: (article: HelpArticle) => void;
}

export function useHelpTypeahead({
  enabled,
  pageKey,
  followUp,
  busy,
  onOpen,
}: HelpTypeaheadOptions) {
  const index = useHelpCenterIndex(enabled);
  const listboxId = useId();
  const [draft, setDraftState] = useState('');
  // Ranking ~140 articles takes a few milliseconds; deferring keeps typing smooth
  const deferredDraft = useDeferredValue(draft);
  const [highlighted, setHighlighted] = useState(-1);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  const matches = useMemo(
    () =>
      deferredDraft.trim().length >= MIN_LENGTH && index.data
        ? rankHelpArticles(
            index.data,
            getSearchTerms(deferredDraft),
            pageKey ? getPageContext(pageKey) : null,
            followUp,
          )
        : [],
    [deferredDraft, index.data, pageKey, followUp],
  );
  const showMatches = matches.length > 0 && dismissedFor !== draft && !busy;

  const setDraft = (next: string) => {
    setDraftState(next);
    setHighlighted(-1);
  };

  const open = (article: HelpArticle) => {
    setDraft('');
    onOpen(article);
  };

  /** Handles the keys for the matches, from the composer; true when it did. */
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
      open(match);
      return true;
    }
    if (event.key === 'Escape') {
      // Hides the matches, not the panel
      event.preventDefault();
      event.stopPropagation();
      setDismissedFor(draft);
      return true;
    }
    return false;
  };

  const optionId = (article: HelpArticle) => `${listboxId}-${article.id}`;
  const highlightedMatch = showMatches ? matches[highlighted] : undefined;

  return {
    draft,
    setDraft,
    matches,
    showMatches,
    highlighted,
    setHighlighted,
    open,
    onKeyCommand,
    listboxId,
    optionId,
    /** For the composer, as the matches' combobox */
    comboboxProps: {
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': showMatches,
      'aria-controls': listboxId,
      'aria-activedescendant': highlightedMatch ? optionId(highlightedMatch) : undefined,
    } as const,
  };
}
