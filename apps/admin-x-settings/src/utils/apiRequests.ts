import handleError from './handleError';
import handleResponse from './handleResponse';
import {APIError, MaintenanceError, ServerUnreachableError, TimeoutError} from './errors';
import {QueryClient, UseInfiniteQueryOptions, UseQueryOptions, useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {getGhostPaths} from './helpers';
import {useEffect, useMemo} from 'react';
import {usePage, usePagination} from '../hooks/usePagination';
import {useServices} from '../components/providers/ServiceProvider';

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
    credentials?: 'include' | 'omit' | 'same-origin';
    timeout?: number;
}

export const useFetchApi = () => {
    const {ghostVersion} = useServices();

    return async (endpoint: string | URL, options: RequestOptions = {}) => {
        // By default, we set the Content-Type header to application/json
        const defaultHeaders: Record<string, string> = {
            'app-pragma': 'no-cache',
            'x-ghost-version': ghostVersion
        };
        if (typeof options.body === 'string') {
            defaultHeaders['content-type'] = 'application/json';
        }
        const headers = options?.headers || {};

        const controller = new AbortController();
        const {timeout} = options;

        if (timeout) {
            setTimeout(() => controller.abort(), timeout);
        }

        // attempt retries for 15 seconds in two situations:
        // 1. Server Unreachable error from the browser (code 0 or TypeError), typically from short internet blips
        // 2. Maintenance error from Ghost, upgrade in progress so API is temporarily unavailable
        let attempts = 0;
        let retryingMs = 0;
        const startTime = Date.now();
        const maxRetryingMs = 15_000;
        const retryPeriods = [500, 1000];
        const retryableErrors = [ServerUnreachableError, MaintenanceError, TypeError];

        // const getErrorData = (error?: APIError, response?: Response) => {
        //     const data: Record<string, unknown> = {
        //         errorName: error?.name,
        //         attempts,
        //         totalSeconds: retryingMs / 1000
        //     };
        //     if (endpoint.toString().includes('/ghost/api/')) {
        //         data.server = response?.headers.get('server');
        //     }
        //     return data;
        // };

        while (true) {
            try {
                const response = await fetch(endpoint, {
                    headers: {
                        ...defaultHeaders,
                        ...headers
                    },
                    method: 'GET',
                    mode: 'cors',
                    credentials: 'include',
                    signal: controller.signal,
                    ...options
                });

                // TODO: Add Sentry integration
                // if (attempts !== 0 && config.sentry_dsn) {
                //     captureMessage('Request took multiple attempts', {extra: getErrorData()});
                // }

                return handleResponse(response);
            } catch (error) {
                retryingMs = Date.now() - startTime;

                if (import.meta.env.MODE !== 'development' && retryableErrors.some(errorClass => error instanceof errorClass) && retryingMs <= maxRetryingMs) {
                    await new Promise((resolve) => {
                        setTimeout(resolve, retryPeriods[attempts] || retryPeriods[retryPeriods.length - 1]);
                    });
                    attempts += 1;
                    continue;
                }

                // TODO: Add Sentry integration
                // if (attempts > 0 && config.sentry_dsn) {
                //     captureMessage('Request failed after multiple attempts', {extra: getErrorData()});
                // }

                if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
                    throw new TimeoutError();
                }

                let newError = error;

                if (!(error instanceof APIError)) {
                    newError = new ServerUnreachableError({cause: error});
                }

                throw newError;
            };
        }
    };
};

const {apiRoot} = getGhostPaths();

export const apiUrl = (path: string, searchParams: Record<string, string> = {}) => {
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
    defaultSearchParams?: Record<string, string>;
    returnData?: (originalData: unknown) => ResponseData;
}

type QueryHookOptions<ResponseData> = UseQueryOptions<ResponseData> & {
    searchParams?: Record<string, string>;
    defaultErrorHandler?: boolean;
};

export const createQuery = <ResponseData>(options: QueryOptions<ResponseData>) => ({searchParams, ...query}: QueryHookOptions<ResponseData> = {}) => {
    const url = apiUrl(options.path, searchParams || options.defaultSearchParams);
    const fetchApi = useFetchApi();

    const result = useQuery<ResponseData>({
        queryKey: [options.dataType, url],
        queryFn: () => fetchApi(url),
        ...query
    });

    const data = useMemo(() => (
        (result.data && options.returnData) ? options.returnData(result.data) : result.data)
    , [result]);

    useEffect(() => {
        if (result.error && query.defaultErrorHandler !== false) {
            handleError(result.error);
        }
    }, [result.error, query.defaultErrorHandler]);

    return {
        ...result,
        data
    };
};

export const createPaginatedQuery = <ResponseData extends {meta?: Meta}>(options: QueryOptions<ResponseData>) => ({searchParams, ...query}: QueryHookOptions<ResponseData> = {}) => {
    const {page, setPage} = usePage();
    const limit = (searchParams?.limit || options.defaultSearchParams?.limit) ? parseInt(searchParams?.limit || options.defaultSearchParams?.limit || '15') : 15;

    const paginatedSearchParams = searchParams || options.defaultSearchParams || {};
    paginatedSearchParams.page = page.toString();

    const url = apiUrl(options.path, paginatedSearchParams);
    const fetchApi = useFetchApi();

    const result = useQuery<ResponseData>({
        queryKey: [options.dataType, url],
        queryFn: () => fetchApi(url),
        ...query
    });

    const data = useMemo(() => (
        (result.data && options.returnData) ? options.returnData(result.data) : result.data)
    , [result]);

    const pagination = usePagination({
        page,
        setPage,
        limit,
        // Don't pass the meta data if we are fetching, because then it is probably out of date and this causes issues
        meta: result.isFetching ? undefined : data?.meta
    });

    useEffect(() => {
        if (result.error && query.defaultErrorHandler !== false) {
            handleError(result.error);
        }
    }, [result.error, query.defaultErrorHandler]);

    return {
        ...result,
        data,
        pagination
    };
};

type InfiniteQueryOptions<ResponseData> = Omit<QueryOptions<ResponseData>, 'returnData'> & {
    returnData: NonNullable<QueryOptions<ResponseData>['returnData']>
}

type InfiniteQueryHookOptions<ResponseData> = UseInfiniteQueryOptions<ResponseData> & {
    searchParams?: Record<string, string>;
    defaultErrorHandler?: boolean;
    getNextPageParams: (data: ResponseData, params: Record<string, string>) => Record<string, string>|undefined;
};

export const createInfiniteQuery = <ResponseData>(options: InfiniteQueryOptions<ResponseData>) => ({searchParams, getNextPageParams, ...query}: InfiniteQueryHookOptions<ResponseData>) => {
    const fetchApi = useFetchApi();

    const result = useInfiniteQuery<ResponseData>({
        queryKey: [options.dataType, apiUrl(options.path, searchParams || options.defaultSearchParams)],
        queryFn: ({pageParam}) => fetchApi(apiUrl(options.path, pageParam || searchParams || options.defaultSearchParams)),
        getNextPageParam: data => getNextPageParams(data, searchParams || options.defaultSearchParams || {}),
        ...query
    });

    const data = useMemo(() => result.data && options.returnData(result.data), [result]);

    useEffect(() => {
        if (result.error && query.defaultErrorHandler !== false) {
            handleError(result.error);
        }
    }, [result.error, query.defaultErrorHandler]);

    return {
        ...result,
        data
    };
};

export const createQueryWithId = <ResponseData>(options: QueryOptions<ResponseData>) => (id: string, {searchParams, ...query}: QueryHookOptions<ResponseData> = {}) => {
    const queryHook = createQuery<ResponseData>({...options, path: parameterizedPath(options.path, id)});
    return queryHook({searchParams: searchParams || options.defaultSearchParams, ...query});
};

interface MutationOptions<ResponseData, Payload> extends Omit<QueryOptions<ResponseData>, 'dataType' | 'path'>, Omit<RequestOptions, 'body'> {
    path: (payload: Payload) => string;
    body?: (payload: Payload) => FormData | object;
    searchParams?: (payload: Payload) => { [key: string]: string; };
    invalidateQueries?: { dataType: string; };
    updateQueries?: { dataType: string; update: (newData: ResponseData, currentData: unknown, payload: Payload) => unknown };
}

const mutate = <ResponseData, Payload>({fetchApi, path, payload, searchParams, options}: {
    fetchApi: ReturnType<typeof useFetchApi>;
    path: string;
    payload?: Payload;
    searchParams?: Record<string, string>;
    options: MutationOptions<ResponseData, Payload>
}) => {
    const {defaultSearchParams, body, ...requestOptions} = options;
    const url = apiUrl(path, searchParams || defaultSearchParams);
    const generatedBody = payload && body?.(payload);

    let requestBody: string | FormData | undefined = undefined;
    if (generatedBody instanceof FormData) {
        requestBody = generatedBody;
    } else if (generatedBody) {
        requestBody = JSON.stringify(generatedBody);
    }

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
