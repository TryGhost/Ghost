import { InfiniteData } from '@tanstack/react-query';
import { createInfiniteQuery, createMutation, createQueryWithId } from '../utils/api/hooks';
import { apiUrl, useFetchApi } from '../utils/api/fetch-api';
import { escapeNqlString } from '@tryghost/nql-string';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const LabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const LabelsResponseSchema = z.object({
  labels: z.array(LabelSchema),
  meta: z
    .object({
      capabilities: z.object({ dislikes: z.boolean().optional() }).optional(),
      pagination: z.object({
        page: z.number(),
        limit: z.union([z.number(), z.literal('all')]),
        pages: z.number(),
        total: z.number(),
        next: z.number().nullable(),
        prev: z.number().nullable(),
      }),
    })
    .optional(),
});

export type Label = z.infer<typeof LabelSchema>;
export type LabelsResponseType = z.infer<typeof LabelsResponseSchema>;

const ReadLabelResponseSchema = LabelsResponseSchema.extend({
  labels: z.array(LabelSchema).length(1),
});

const dataType = 'LabelsResponseType';

export const useReadLabel = createQueryWithId<LabelsResponseType>({
  dataType,
  path: (id) => `/labels/${id}/`,
  parseResponse: (data) => ReadLabelResponseSchema.parse(data),
});

export const useCacheLabel = () => {
  const queryClient = useQueryClient();
  return useCallback(
    (label: Label) => {
      const data = ReadLabelResponseSchema.parse({ labels: [label] });
      queryClient.setQueryData<LabelsResponseType>(
        [dataType, apiUrl(`/labels/${label.id}/`)],
        data,
      );
    },
    [queryClient],
  );
};

export const useBrowseLabelsInfinite = createInfiniteQuery<LabelsResponseType & { isEnd: boolean }>(
  {
    dataType,
    path: '/labels/',
    defaultNextPageParams: (lastPage, otherParams) => {
      if (!lastPage.meta?.pagination.next) {
        return undefined;
      }

      return {
        ...otherParams,
        page: lastPage.meta.pagination.next.toString(),
      };
    },
    returnData: (originalData) => {
      const { pages } = originalData as InfiniteData<LabelsResponseType>;
      const labels = pages.flatMap((page) => page.labels);
      const meta = pages[pages.length - 1].meta;

      return {
        labels,
        meta,
        isEnd: meta ? meta.pagination.pages === meta.pagination.page : true,
      };
    },
  },
);

export const useCreateLabel = createMutation<LabelsResponseType, Pick<Label, 'name'>>({
  method: 'POST',
  path: () => '/labels/',
  body: (label) => ({ labels: [label] }),
  invalidateQueries: {
    dataType,
  },
});

export const useFindLabelByName = () => {
  const fetchApi = useFetchApi();

  return useCallback(
    async (name: string): Promise<Label | undefined> => {
      const data = await fetchApi<LabelsResponseType>(
        apiUrl('/labels/', { filter: `name:${escapeNqlString(name)}`, limit: '1' }),
      );
      return data.labels?.[0];
    },
    [fetchApi],
  );
};

export const useInvalidateLabels = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [dataType] });
  }, [queryClient]);
};

export const useEditLabel = createMutation<LabelsResponseType, Pick<Label, 'id' | 'name'>>({
  method: 'PUT',
  path: (label) => `/labels/${label.id}/`,
  body: (label) => ({ labels: [label] }),
  invalidateQueries: {
    dataType,
  },
});

export const useDeleteLabel = createMutation<void, string>({
  method: 'DELETE',
  path: (id) => `/labels/${id}/`,
  invalidateQueries: {
    dataType,
  },
});
