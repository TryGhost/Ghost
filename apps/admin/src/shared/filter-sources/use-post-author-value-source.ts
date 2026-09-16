import {
  type User,
  type UsersResponseType,
  useBrowseUsers,
} from '@tryghost/admin-x-framework/api/users';
import { type ValueSource } from '@tryghost/shade/patterns';
import { buildQuotedListFilter } from './utils';
import { createGhostBrowseValueSource } from './create-ghost-browse-value-source';
import { escapeNqlString } from '@tryghost/nql-string';
import { keepPreviousData } from '@tanstack/react-query';

/**
 * Staff users for the posts/pages author filter.
 *
 * Value is the **slug**, matching the `?author=` URL param and saved views.
 * Falls back to the email for staff who were invited but never set a name, as
 * Ember's `post-author-names` helper does.
 *
 * Search matches Ember's `name:~<term>` (`controllers/posts.js:146`).
 */
const AUTHOR_PAGE_LIMIT = '100';

function toAuthorOption(user: User) {
  return {
    value: user.slug,
    label: user.name || user.email,
    metadata: { id: user.id },
  };
}

const usePostAuthorBrowseValueSource = createGhostBrowseValueSource<User, UsersResponseType>({
  id: 'posts.authors',
  buildBrowseSearchParams: (query) => ({
    limit: AUTHOR_PAGE_LIMIT,
    order: 'name asc',
    ...(query ? { filter: `name:~${escapeNqlString(query)}` } : {}),
  }),
  buildHydrateFilter: (selectedValues) => buildQuotedListFilter('slug', selectedValues),
  buildHydrateSearchParams: (selectedFilter) => ({
    filter: selectedFilter,
    order: 'name asc',
  }),
  // See the tag source: without this the chip reads "Select…" and the value
  // disappears from the UI. Ember shows "Unknown author".
  getMissingSelectedOption: (value) => ({
    value,
    label: 'Unknown author',
  }),
  selectItems: (data) => data?.users,
  useQuery: ({ enabled, searchParams }) => {
    return useBrowseUsers({
      enabled,
      placeholderData: keepPreviousData,
      searchParams,
    });
  },
  toOption: toAuthorOption,
  debounceMs: 250,
});

export function usePostAuthorValueSource(): ValueSource<string> {
  return usePostAuthorBrowseValueSource();
}
