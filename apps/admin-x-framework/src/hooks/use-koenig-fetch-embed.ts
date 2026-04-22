import {useCallback} from 'react';
import {getGhostPaths} from '../utils/helpers';
import {useFetchApi} from '../utils/api/fetch-api';

interface KoenigFetchEmbedOptions {
    type?: string;
}

export const useKoenigFetchEmbed = () => {
    const fetchApi = useFetchApi();

    return useCallback(async (url: string, {type}: KoenigFetchEmbedOptions = {}) => {
        const oembedUrl = new URL(`${getGhostPaths().apiRoot}/oembed/`, window.location.origin);
        oembedUrl.searchParams.set('url', url);
        if (type) {
            oembedUrl.searchParams.set('type', type);
        }

        return await fetchApi(oembedUrl);
    }, [fetchApi]);
};
