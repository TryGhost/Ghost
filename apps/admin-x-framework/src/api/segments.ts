import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { createMutation, createQuery } from '../utils/api/hooks';

// Types

/** A saved member view: a named member filter. `filter` is NQL; `id` is opaque. */
const SegmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  filter: z.string(),
});

const SegmentsResponseSchema = z.object({
  segments: z.array(SegmentSchema),
});

export type Segment = z.infer<typeof SegmentSchema>;
export type SegmentsResponseType = z.infer<typeof SegmentsResponseSchema>;

const parseSegmentsResponse = (data: unknown) => SegmentsResponseSchema.parse(data);

// Requests

const dataType = 'SegmentsResponseType';

const changedDataTypes = { dataType };

/**
 * A cached segments list with `change` applied. Each write also changes the cached list from its
 * response, so the screen shows the change as soon as the write returns rather than after the
 * refetch, which remains the truth.
 */
function changeCachedSegments(
  currentData: unknown,
  change: (segments: Segment[]) => Segment[],
): unknown {
  const current = SegmentsResponseSchema.safeParse(currentData);
  return current.success
    ? { ...current.data, segments: change(current.data.segments) }
    : currentData;
}

/** Every segment, in display order. Older servers have no segments API and answer 404. */
export const useBrowseSegments = createQuery<SegmentsResponseType>({
  dataType,
  path: '/segments/',
  parseResponse: parseSegmentsResponse,
});

/** Marks the cached segments list as out of date, so it is fetched again. */
export const useInvalidateSegments = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [dataType] });
  }, [queryClient]);
};

/** Adds a segment after the existing ones. */
export const useAddSegment = createMutation<SegmentsResponseType, Pick<Segment, 'name' | 'filter'>>(
  {
    method: 'POST',
    path: () => '/segments/',
    body: ({ name, filter }) => ({ segments: [{ name, filter }] }),
    parseResponse: parseSegmentsResponse,
    invalidateQueries: changedDataTypes,
    updateQueries: {
      dataType,
      update: (newData, currentData) =>
        changeCachedSegments(currentData, (segments) => [
          ...segments.filter((segment) => !newData.segments.some(({ id }) => id === segment.id)),
          ...newData.segments,
        ]),
    },
  },
);

/**
 * Renames a segment; its position stays as it is. POC (poc/segments-ui): a `filter` changes the
 * segment's conditions too. Left out, the filter stays as it is.
 */
export const useEditSegment = createMutation<
  SegmentsResponseType,
  Pick<Segment, 'id' | 'name'> & Partial<Pick<Segment, 'filter'>>
>({
  method: 'PUT',
  path: ({ id }) => `/segments/${encodeURIComponent(id)}/`,
  body: ({ name, filter }) => ({ segments: [filter === undefined ? { name } : { name, filter }] }),
  parseResponse: parseSegmentsResponse,
  invalidateQueries: changedDataTypes,
  updateQueries: {
    dataType,
    update: (newData, currentData) =>
      changeCachedSegments(currentData, (segments) =>
        segments.map((segment) => newData.segments.find(({ id }) => id === segment.id) ?? segment),
      ),
  },
});

const useReorderSegmentsRequest = createMutation<SegmentsResponseType, string[]>({
  method: 'PUT',
  path: () => '/segments/',
  body: (ids) => ({ segments: ids.map((id) => ({ id })) }),
  parseResponse: parseSegmentsResponse,
  invalidateQueries: changedDataTypes,
  updateQueries: {
    dataType,
    update: (newData, currentData) => changeCachedSegments(currentData, () => newData.segments),
  },
});

/**
 * POC (poc/segments-ui): puts every segment in the order of the ids given, the site's order for
 * every list of them. The cached list takes the new order at once, so a dragged row stays where
 * it was dropped, and goes back to the server's if the request fails.
 */
export const useReorderSegments = () => {
  const queryClient = useQueryClient();
  const { mutateAsync, ...rest } = useReorderSegmentsRequest();

  const reorder = useCallback(
    async (ids: string[]) => {
      const rank = new Map(ids.map((id, index) => [id, index]));
      queryClient.setQueriesData({ queryKey: [dataType] }, (currentData: unknown) =>
        changeCachedSegments(currentData, (segments) =>
          [...segments].sort(
            (a, b) =>
              (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
              (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
          ),
        ),
      );
      try {
        return await mutateAsync(ids);
      } catch (error) {
        void queryClient.invalidateQueries({ queryKey: [dataType] });
        throw error;
      }
    },
    [mutateAsync, queryClient],
  );

  return { ...rest, reorder };
};

export const useDeleteSegment = createMutation<void, string>({
  method: 'DELETE',
  path: (id) => `/segments/${encodeURIComponent(id)}/`,
  invalidateQueries: changedDataTypes,
  updateQueries: {
    dataType,
    update: (_, currentData, deletedId) =>
      changeCachedSegments(currentData, (segments) =>
        segments.filter(({ id }) => id !== deletedId),
      ),
  },
});
