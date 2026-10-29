import { useQuery } from '@tanstack/react-query';
import { fetchAllHelpArticles } from './help-center';

/*
 * The help center's article list, loaded once when the panel opens and shared
 * by the questions under the message and the article reader. Refreshed after 10
 * minutes, which is how long a newly tagged article takes to show.
 */

export const helpCenterIndexQuery = {
  queryKey: ['help-center', 'articles'],
  queryFn: ({ signal }: { signal?: AbortSignal }) => fetchAllHelpArticles(signal),
  staleTime: 10 * 60 * 1000,
};

export function useHelpCenterIndex(enabled: boolean) {
  return useQuery({ ...helpCenterIndexQuery, enabled });
}
