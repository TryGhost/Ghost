import { InfiniteData } from '@tanstack/react-query';
import { Meta, createInfiniteQuery, createMutation } from '../utils/api/hooks';

// mobiledoc and lexical travel as JSON strings on the wire; callers parse/stringify
export type Snippet = {
  id: string;
  name: string;
  mobiledoc: string;
  lexical: string | null;
  created_at: string;
  updated_at: string | null;
};

// The add and edit schemas require name and mobiledoc on every item
export type SnippetEditableData = Pick<Snippet, 'name' | 'mobiledoc'> &
  Partial<Pick<Snippet, 'lexical'>>;

export interface SnippetsResponseType {
  meta?: Meta;
  snippets: Snippet[];
}

const dataType = 'SnippetsResponseType';

// Without `formats` the API strips `lexical` from responses (mobiledoc is the default format)
const formats = 'mobiledoc,lexical';

const useBrowseSnippetsQuery = createInfiniteQuery<SnippetsResponseType & { isEnd: boolean }>({
  dataType,
  path: '/snippets/',
  defaultSearchParams: { limit: 'all', formats },
  defaultNextPageParams: (lastPage, otherParams) => {
    const nextPage = lastPage.meta?.pagination.next;
    if (!nextPage) {
      return undefined;
    }

    return {
      ...otherParams,
      page: nextPage.toString(),
    };
  },
  returnData: (originalData) => {
    const { pages } = originalData as InfiniteData<SnippetsResponseType>;
    const snippets = pages.flatMap((page) => page.snippets);
    const meta = pages[pages.length - 1].meta;

    return {
      snippets,
      meta,
      isEnd: meta ? meta.pagination.pages === meta.pagination.page : true,
    };
  },
});

export const useBrowseSnippets = ({
  searchParams,
  ...args
}: Parameters<typeof useBrowseSnippetsQuery>[0] = {}) =>
  useBrowseSnippetsQuery({
    ...args,
    // caller searchParams replace the defaults wholesale, so re-merge formats
    searchParams: { limit: 'all', ...searchParams, formats },
  });

// Snippet writes happen from inside the editor, which surfaces an expired
// session in place rather than navigating away from unsaved content.
const sessionExpiryRedirect = false;

export const useAddSnippet = createMutation<SnippetsResponseType, SnippetEditableData>({
  method: 'POST',
  sessionExpiryRedirect,
  path: () => '/snippets/',
  searchParams: () => ({ formats }),
  body: (snippet) => ({ snippets: [snippet] }),
  invalidateQueries: { dataType },
});

export const useEditSnippet = createMutation<
  SnippetsResponseType,
  SnippetEditableData & { id: string }
>({
  method: 'PUT',
  sessionExpiryRedirect,
  path: ({ id }) => `/snippets/${id}/`,
  searchParams: () => ({ formats }),
  body: ({ id: _id, ...snippet }) => ({ snippets: [snippet] }),
  invalidateQueries: { dataType },
});

export const useDeleteSnippet = createMutation<void, string>({
  method: 'DELETE',
  sessionExpiryRedirect,
  path: (id) => `/snippets/${id}/`,
  invalidateQueries: { dataType },
});
