import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { HelpArticle } from './help-center';
import { searchDocsBot, toSearchResults } from './help-docsbot-search';
import { nudgeFaqForward } from './help-questions';
import type { HelpSignals } from './help-signals';
import { useHelpCenterIndex } from './use-help-center-index';
import { useHelpSuggestions } from './use-help-suggestions';

/*
 * What's offered under the message as "You might be looking for": before
 * anything's written, the page's FAQ questions (use-help-suggestions.ts); as
 * the user writes, the help center articles closest in meaning to the
 * message, from DocsBot's semantic search (help-docsbot-search.ts), with FAQ
 * answers nudged forward (help-questions.ts). The message is sent to DocsBot
 * as the query, a moment after typing pauses, and nothing else goes with it.
 * While a search runs, the last articles stay, so the list settles rather
 * than flickering; the page's questions return when the message is cleared,
 * finds nothing, or DocsBot can't be reached.
 */

export interface HelpRelatedQuestions {
  questions: HelpArticle[];
  /** Whether they answer the message, or stand for the page */
  source: 'message' | 'page';
  loading: boolean;
  /** A search for the message is on its way */
  searching: boolean;
  /** The help center couldn't be reached, so there's nothing to offer */
  failed: boolean;
}

// How long after typing pauses the message is searched for: long enough not
// to search mid-word, short enough that the answers arrive as the user writes
const SEARCH_DELAY = 500;
// Shorter than this, a message says too little to search for
const MIN_QUERY_LENGTH = 4;

/** The value as it was once it stopped changing for the delay. */
function useSettled(value: string, delay: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

export function useHelpRelatedQuestions(
  signals: HelpSignals,
  text: string,
  enabled: boolean,
): HelpRelatedQuestions {
  const index = useHelpCenterIndex(enabled);
  const forPage = useHelpSuggestions(signals, true, enabled);
  const query = useSettled(text.trim(), SEARCH_DELAY);
  const canSearch = enabled && query.length >= MIN_QUERY_LENGTH;

  const search = useQuery({
    queryKey: ['help-center', 'related', query],
    queryFn: ({ signal }) => searchDocsBot(query, signal),
    enabled: canSearch,
    staleTime: 10 * 60 * 1000,
    retry: false,
    // The last answers stay while the next are found
    placeholderData: keepPreviousData,
  });

  const related = useMemo(
    () =>
      canSearch && search.data && index.data
        ? nudgeFaqForward(toSearchResults(search.data, index.data))
        : [],
    [canSearch, search.data, index.data],
  );

  return useMemo(() => {
    const searching = canSearch && (search.isFetching || query !== text.trim());
    if (related.length) {
      return {
        questions: related,
        source: 'message' as const,
        loading: false,
        searching,
        failed: false,
      };
    }
    return {
      questions: forPage.suggestions.map(({ article }) => article),
      source: 'page' as const,
      loading: forPage.isLoading,
      searching,
      failed: forPage.isError,
    };
  }, [related, forPage, canSearch, search.isFetching, query, text]);
}
