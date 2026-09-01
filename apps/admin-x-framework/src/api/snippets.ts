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

export type SnippetEditableData = Partial<Omit<Snippet, 'id' | 'created_at' | 'updated_at'>>;

export interface SnippetsResponseType {
  meta?: Meta;
  snippets: Snippet[];
}

const dataType = 'SnippetsResponseType';

// Without `formats` the API strips `lexical` from responses (mobiledoc is the default format)
const formats = 'mobiledoc,lexical';

export const useBrowseSnippets = createQuery<SnippetsResponseType>({
  dataType,
  path: '/snippets/',
  defaultSearchParams: { limit: 'all', formats },
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
