import { useMemo } from 'react';
// not via @/settings/api, which the shell loads eagerly
import { useSettingsSearchSource } from '@/settings/search-source';
import { useActionsSearchSource } from './actions-source';
import { useBillingSearchSource } from './billing-source';
import { useContentSearchSource } from './content-sources';
import type { SearchSource, SearchSourceContext } from './search-source';

/** Every Cmd-K group, in display order. A new source adds its hook here. */
export function useSearchSources(context: SearchSourceContext): SearchSource[] {
  const staff = useContentSearchSource('users', context);
  const tags = useContentSearchSource('tags', context);
  const billing = useBillingSearchSource();
  const settings = useSettingsSearchSource();
  const actions = useActionsSearchSource();
  const posts = useContentSearchSource('posts', context);
  const pages = useContentSearchSource('pages', context);

  return useMemo(
    () => [staff, tags, billing, settings, actions, posts, pages],
    [staff, tags, billing, settings, actions, posts, pages],
  );
}
