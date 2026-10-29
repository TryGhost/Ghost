import { useDeferredValue, useMemo } from 'react';
import type { HelpArticle } from './help-center';
import { findRelatedQuestions, getFaqQuestions } from './help-questions';
import type { HelpSignals } from './help-signals';
import { useHelpCenterIndex } from './use-help-center-index';
import { useHelpSuggestions } from './use-help-suggestions';

/*
 * The FAQ questions offered under the message as "You might be looking for":
 * before anything's written, the page's questions (use-help-suggestions.ts);
 * as the user writes, the questions related to their words
 * (findRelatedQuestions in help-questions.ts), and the page's again while
 * none are. The text is deferred, so typing never waits on the matching.
 */

export interface HelpRelatedQuestions {
  questions: HelpArticle[];
  /** Whether they match the message's words, or stand for the page */
  source: 'message' | 'page';
  loading: boolean;
  /** The help center couldn't be reached, so there's nothing to offer */
  failed: boolean;
}

export function useHelpRelatedQuestions(
  signals: HelpSignals,
  text: string,
  enabled: boolean,
): HelpRelatedQuestions {
  const index = useHelpCenterIndex(enabled);
  const forPage = useHelpSuggestions(signals, true, enabled);
  const deferredText = useDeferredValue(text);
  const faq = useMemo(() => (index.data ? getFaqQuestions(index.data) : []), [index.data]);
  const related = useMemo(
    () => findRelatedQuestions(faq, deferredText, signals.pageKey),
    [faq, deferredText, signals.pageKey],
  );

  return useMemo(() => {
    if (related.length) {
      return { questions: related, source: 'message' as const, loading: false, failed: false };
    }
    return {
      questions: forPage.suggestions.map(({ article }) => article),
      source: 'page' as const,
      loading: forPage.isLoading,
      failed: forPage.isError,
    };
  }, [related, forPage]);
}
