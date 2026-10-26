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
 * The suggestions shown before the user asks anything, for the page they're
 * on, picked from the help center's article list (help-suggestions.ts has the
 * order and why). The list loads once, so moving between pages updates the
 * suggestions at once.
 */

export interface HelpSuggestion {
  article: HelpArticle;
  /** Where it came from; on the row as data-help-source, for checking tagging */
  source: HelpSuggestionSource;
  /** Why it's suggested, as the user sees it (on hover) */
  reason: string;
}

export function useHelpSuggestions(signals: HelpSignals, withPage: boolean, enabled: boolean) {
  const index = useHelpCenterIndex(enabled);
  const page = withPage ? signals.pageKey : null;
  const alert = useMemo(() => getAccountAlert(signals.billing), [signals.billing]);
  const { pageLabel } = signals;

  const suggestions = useMemo((): HelpSuggestion[] => {
    if (!index.data) {
      return [];
    }
    return getSuggestedArticles(index.data, page, alert).map(({ article, source }) => {
      const reasons: Record<HelpSuggestionSource, string> = {
        alert: alert?.reason ?? '',
        tagged: `Suggested for ${pageLabel}`,
        default: `Suggested for ${pageLabel}`,
        topic: `From ${article.tags[0]?.name ?? 'the help center'}`,
        general: 'Asked about often',
        featured: 'Featured in the help center',
      };
      return { article, source, reason: reasons[source] };
    });
  }, [index.data, page, alert, pageLabel]);

  return { suggestions, isLoading: index.isLoading, isError: index.isError };
}
