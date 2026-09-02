import { slugify } from '@tryghost/string';
import { useCallback } from 'react';
import { apiUrl, useFetchApi } from '../utils/api/fetch-api';

export interface SlugsResponseType {
  slugs: Array<{ slug: string }>;
}

export interface GenerateSlugParams {
  /** Pages share the posts table, so they dedupe under `post` */
  type: 'post' | 'tag' | 'user';
  text: string;
  /** The record being edited, so its own current slug is not counted as a collision */
  id?: string;
}

export const useGenerateSlug = () => {
  const fetchApi = useFetchApi();

  return useCallback(
    async ({ type, text, id }: GenerateSlugParams): Promise<string> => {
      if (!text) {
        return '';
      }

      // Slugified client-side first: raw reserved characters in the path (a newline as %0A) 404 at the CDN before reaching Ghost
      const name = encodeURIComponent(slugify(text));
      const path = id ? `/slugs/${type}/${name}/${id}/` : `/slugs/${type}/${name}/`;
      const data = await fetchApi<SlugsResponseType>(apiUrl(path));

      return data.slugs[0].slug;
    },
    [fetchApi],
  );
};
