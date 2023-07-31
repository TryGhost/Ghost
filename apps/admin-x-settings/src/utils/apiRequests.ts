import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGhostPaths } from './helpers';
import { useServices } from '../components/providers/ServiceProvider';

export interface Meta {
    pagination: {
        page: number;
        limit: number;
        pages: number;
        total: number;
        next: number;
        prev: number;
    }
}

interface RequestOptions {
    method?: string;
    body?: string | FormData;
    headers?: {
        'Content-Type'?: string;
    };
}

export const useFetchApi = () => {
    const {ghostVersion} = useServices();

    return async (endpoint: string | URL, options: RequestOptions = {}) => {
        // By default, we set the Content-Type header to application/json
        const defaultHeaders = {
            'app-pragma': 'no-cache',
            'x-ghost-version': ghostVersion
        };
        const headers = options?.headers || {
            'Content-Type': 'application/json'
        };
        const response = await fetch(endpoint, {
            headers: {
                ...defaultHeaders,
                ...headers
            },
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            ...options
        });

        if (response.status === 204) {
            return;
        } else {
            return await response.json();
        }
    };
};

const {apiRoot} = getGhostPaths();

const apiUrl = (path: string, searchParams: { [key: string]: string } = {}) => {
    const url = new URL(`${apiRoot}${path}`, window.location.origin);
    url.search = new URLSearchParams(searchParams).toString();
    return url.toString();
};

const parameterizedPath = (path: string, params: string | string[]) => {
    const paramList = Array.isArray(params) ? params : [params];
    return paramList.reduce((updatedPath, param) => updatedPath.replace(/:[a-z0-9]+/, encodeURIComponent(param)), path);
};

interface QueryOptions<ResponseData> {
    dataType: string
    path: string
    defaultSearchParams?: { [key: string]: string };
    returnData?: (originalData: unknown) => ResponseData;
}

export const createQuery = <ResponseData>(options: QueryOptions<ResponseData>) => (searchParams?: { [key: string]: string }) => {
    const url = apiUrl(options.path, searchParams || options.defaultSearchParams);
    const fetchApi = useFetchApi();

    const result = useQuery<ResponseData>({
        queryKey: [options.dataType, url],
        queryFn: () => fetchApi(url)
    });

    return {
        ...result,
        data: (result.data && options.returnData) ? options.returnData(result.data) : result.data
    };
};

export const createQueryWithId = <ResponseData>(options: QueryOptions<ResponseData>) => (id: string, searchParams?: { [key: string]: string }) => {
    const queryHook = createQuery<ResponseData>({...options, path: parameterizedPath(options.path, id)});
    return queryHook(searchParams || options.defaultSearchParams);
};

interface MutationOptions<ResponseData, Payload> extends Omit<QueryOptions<ResponseData>, 'dataType' | 'path'>, Omit<RequestOptions, 'body'> {
    path: (payload: Payload) => string;
    body?: (payload: Payload) => FormData | object;
    searchParams?: (payload: Payload) => { [key: string]: string; };
    invalidateQueries?: { dataType: string; };
    updateQueries?: { dataType: string; update: <CurrentData>(newData: ResponseData, currentData: CurrentData, payload: Payload) => unknown };
}

const mutate = <ResponseData, Payload>({fetchApi, path, payload, searchParams, options}: {
    fetchApi: ReturnType<typeof useFetchApi>;
    path: string;
    payload?: Payload;
    searchParams?: { [key: string]: string };
    options: MutationOptions<ResponseData, Payload>
}) => {
    const {defaultSearchParams, body, ...requestOptions} = options;
    const url = apiUrl(path, searchParams || defaultSearchParams);
    console.log('api url', path, searchParams, url)
    const generatedBody = payload && body?.(payload);
    const requestBody = (generatedBody && generatedBody instanceof FormData) ? generatedBody : JSON.stringify(generatedBody)

    return fetchApi(url, {
        body: requestBody,
        ...requestOptions
    });
};

const afterMutate = <ResponseData, Payload>(newData: ResponseData, payload: Payload, queryClient: QueryClient, options: MutationOptions<ResponseData, Payload>) => {
    if (options.invalidateQueries) {
        queryClient.invalidateQueries([options.invalidateQueries.dataType]);
    }

    if (options.updateQueries) {
        queryClient.setQueriesData([options.updateQueries.dataType], (data: unknown) => options.updateQueries!.update(newData, data, payload));
    }
};

export const createMutation = <ResponseData, Payload>(options: MutationOptions<ResponseData, Payload>) => () => {
    const fetchApi = useFetchApi();
    const queryClient = useQueryClient();

    return useMutation<ResponseData, unknown, Payload>({
        mutationFn: payload => mutate({fetchApi, path: options.path(payload), payload, searchParams: options.searchParams?.(payload) || options.defaultSearchParams, options}),
        onSuccess: (newData, payload) => afterMutate(newData, payload, queryClient, options)
    });
};
