import {apiUrl, useFetchApi} from '../utils/api/hooks';

export type OembedResponse = {
    metadata: {
        title: string | null,
        description:string | null,
        author: string | null,
        publisher: string | null,
        thumbnail: string | null,
        icon: string | null
    }
}

export type OembedRequest = {
    url: string,
    type: 'mention'
}

export const useGetOembed = () => {
    const fetchApi = useFetchApi();
    const path = '/oembed/';

    return {
        async query(searchParams: OembedRequest) {
            const url = apiUrl(path, searchParams);
            try {
                const result = await fetchApi(url, {
                    method: 'GET',
                    timeout: 5000
                });
                return result as OembedResponse;
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);
                return null;
            }
        }
    };
};
