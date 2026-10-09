import { useMemo } from 'react';
import { useBillingSearchSource } from './billing-source';
import { useContentSearchSource } from './content-sources';
import type { SearchSource, SearchSourceContext } from './search-source';

/** Every Cmd-K group, in display order. A new source adds its hook here. */
export function useSearchSources(context: SearchSourceContext): SearchSource[] {
  const staff = useContentSearchSource('users', context);
  const tags = useContentSearchSource('tags', context);
  const billing = useBillingSearchSource();
  const posts = useContentSearchSource('posts', context);
  const pages = useContentSearchSource('pages', context);

  return useMemo(() => [staff, tags, billing, posts, pages], [staff, tags, billing, posts, pages]);
}
