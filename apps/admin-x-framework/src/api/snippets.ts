import { Meta, createMutation, createQuery } from '../utils/api/hooks';

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

const useBrowseSnippetsQuery = createQuery<SnippetsResponseType>({
  dataType,
  path: '/snippets/',
  defaultSearchParams: { limit: 'all', formats },
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

export const useAddSnippet = createMutation<SnippetsResponseType, SnippetEditableData>({
  method: 'POST',
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
  path: ({ id }) => `/snippets/${id}/`,
  searchParams: () => ({ formats }),
  body: ({ id, ...rest }) => ({ snippets: [{ id, ...rest }] }),
  invalidateQueries: { dataType },
});

export const useDeleteSnippet = createMutation<unknown, string>({
  method: 'DELETE',
  path: (id) => `/snippets/${id}/`,
  invalidateQueries: { dataType },
});
