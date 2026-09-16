import { useCallback } from 'react';
import { getGhostPaths } from '../utils/helpers';
import { useFetchApi, type RequestOptions } from '../utils/api/fetch-api';

interface KoenigFetchEmbedOptions {
  type?: string;
}

type EmbedRequestOptions = Pick<RequestOptions, 'sessionExpiryRedirect'>;

// Shared so an omitted argument keeps the returned fetcher's identity stable.
const DEFAULT_REQUEST_OPTIONS: EmbedRequestOptions = {};

/** The session-expiry policy applies to every lookup this fetcher makes. */
export const useKoenigFetchEmbed = (
  requestOptions: EmbedRequestOptions = DEFAULT_REQUEST_OPTIONS,
) => {
  const fetchApi = useFetchApi();

  return useCallback(
    async (url: string, { type }: KoenigFetchEmbedOptions = {}) => {
      const oembedUrl = new URL(`${getGhostPaths().apiRoot}/oembed/`, window.location.origin);
      oembedUrl.searchParams.set('url', url);
      if (type) {
        oembedUrl.searchParams.set('type', type);
      }

      return await fetchApi(oembedUrl, requestOptions);
    },
    [fetchApi, requestOptions],
  );
};
