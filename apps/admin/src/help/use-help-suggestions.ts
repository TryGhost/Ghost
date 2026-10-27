import { useMemo } from 'react';
import type { HelpArticle } from './help-center';
import type { HelpSignals } from './help-signals';
import {
  getAccountAlert,
  getSuggestedArticles,
  type HelpSuggestionSource,
} from './help-suggestions';
import { useHelpCenterIndex } from './use-help-center-index';

/*
 * The questions suggested before the user asks anything, for the page they're
 * on, picked from the help center's FAQ (help-suggestions.ts has the order and
 * why). The article list loads once, so moving between pages updates the
 * suggestions at once.
 */

export interface HelpSuggestion {
  article: HelpArticle;
  /** Where it came from; on the row as data-help-source, for checking tagging */
  source: HelpSuggestionSource;
}

export function useHelpSuggestions(signals: HelpSignals, withPage: boolean, enabled: boolean) {
  const index = useHelpCenterIndex(enabled);
  const page = withPage ? signals.pageKey : null;
  const alert = useMemo(() => getAccountAlert(signals.billing), [signals.billing]);

  const suggestions = useMemo(
    (): HelpSuggestion[] => (index.data ? getSuggestedArticles(index.data, page, alert) : []),
    [index.data, page, alert],
  );

  return { suggestions, isLoading: index.isLoading, isError: index.isError };
}
