import {UseInfiniteQueryOptions, UseQueryOptions, UseQueryResult, useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {usePagination} from '@tryghost/admin-x-design-system';
import {useCallback, useEffect, useMemo, useState} from 'react';
import useHandleError from '../../hooks/useHandleError';
import {usePermission} from '../../hooks/usePermissions';
import {useFramework} from '../../providers/FrameworkProvider';
import {RequestOptions, apiUrl, useFetchApi} from './fetchApi';

export interface Meta {
    pagination: {
        page: number;
        limit: number | 'all';
        pages: number;
        total: number;
        next: number | null;
        prev: number | null;
    }
}

interface QueryOptions<ResponseData> {
    dataType: string
    path: string
    headers?: Record<string, string>;
    defaultSearchParams?: Record<string, string>;
    permissions?: string[];
    returnData?: (originalData: unknown) => ResponseData;
    useActivityPub?: boolean;
}

type QueryHookOptions<ResponseData> = UseQueryOptions<ResponseData> & {
    searchParams?: Record<string, string>;
    defaultErrorHandler?: boolean;
};

export const createQuery = <ResponseData>(options: QueryOptions<ResponseData>) => ({searchParams, ...query}: QueryHookOptions<ResponseData> = {}): Omit<UseQueryResult<ResponseData>, 'data'> & {data: ResponseData | undefined} => {
    const url = apiUrl(options.path, searchParams || options.defaultSearchParams, options?.useActivityPub);
    const fetchApi = useFetchApi();
    const handleError = useHandleError();

    const result = useQuery<ResponseData>({
        enabled: options.permissions ? usePermission(options.permissions) : true,
        queryKey: [options.dataType, url],
        queryFn: () => fetchApi(url, {...options}),
        ...query
    });

    const data = useMemo(() => (
        (result.data && options.returnData) ? options.returnData(result.data) : result.data)
    , [result.data]);

    useEffect(() => {
        if (result.error && query.defaultErrorHandler !== false) {
            handleError(result.error);
        }
    }, [handleError, result.error, query.defaultErrorHandler]);

    return {
        ...result,
        data
    };
};

export const createPaginatedQuery = <ResponseData extends {meta?: Meta}>(options: QueryOptions<ResponseData>) => ({searchParams, ...query}: QueryHookOptions<ResponseData> = {}) => {
    const [page, setPage] = useState(1);
    const limit = (searchParams?.limit || options.defaultSearchParams?.limit) ? parseInt(searchParams?.limit || options.defaultSearchParams?.limit || '15') : 15;

    const paginatedSearchParams = searchParams || options.defaultSearchParams || {};
    paginatedSearchParams.page = page.toString();

    const url = apiUrl(options.path, paginatedSearchParams, options?.useActivityPub);
    const fetchApi = useFetchApi();
    const handleError = useHandleError();

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
        meta: result.isFetching ? undefined : data?.meta?.pagination
    });

    useEffect(() => {
        if (result.error && query.defaultErrorHandler !== false) {
            handleError(result.error);
        }
    }, [handleError, result.error, query.defaultErrorHandler]);

    return {
        ...result,
        data,
        pagination
    };
};

type InfiniteQueryOptions<ResponseData> = Omit<QueryOptions<ResponseData>, 'returnData'> & {
    returnData: NonNullable<QueryOptions<ResponseData>['returnData']>
    defaultNextPageParams?: (data: ResponseData, params: Record<string, string>) => Record<string, string>;
}

type InfiniteQueryHookOptions<ResponseData> = UseInfiniteQueryOptions<ResponseData> & {
    searchParams?: Record<string, string>;
    defaultErrorHandler?: boolean;
    getNextPageParams?: (data: ResponseData, params: Record<string, string>) => Record<string, string> | undefined;
};

export const createInfiniteQuery = <ResponseData>(options: InfiniteQueryOptions<ResponseData>) => ({searchParams, getNextPageParams, ...query}: InfiniteQueryHookOptions<ResponseData> = {}) => {
    const fetchApi = useFetchApi();
    const handleError = useHandleError();

    const nextPageParams = getNextPageParams || options.defaultNextPageParams || (() => ({}));

    const result = useInfiniteQuery<ResponseData>({
        queryKey: [options.dataType, apiUrl(options.path, searchParams || options.defaultSearchParams, options?.useActivityPub)],
        queryFn: ({pageParam}) => fetchApi(apiUrl(options.path, pageParam || searchParams || options.defaultSearchParams, options?.useActivityPub)),
        getNextPageParam: data => nextPageParams(data, searchParams || options.defaultSearchParams || {}),
        ...query
    });

    const data = useMemo(() => result.data && options.returnData(result.data), [result.data]);

    useEffect(() => {
        if (result.error && query.defaultErrorHandler !== false) {
            handleError(result.error);
        }
    }, [handleError, result.error, query.defaultErrorHandler]);

    return {
        ...result,
        data
    };
};

export const createQueryWithId = <ResponseData>(options: Omit<QueryOptions<ResponseData>, 'path'> & {path: (id: string) => string}) => (id: string, {searchParams, ...query}: QueryHookOptions<ResponseData> = {}) => {
    const queryHook = createQuery<ResponseData>({...options, path: options.path(id)});
    return queryHook({searchParams: searchParams || options.defaultSearchParams, ...query});
};

interface MutationOptions<ResponseData, Payload> extends Omit<QueryOptions<ResponseData>, 'dataType' | 'path'>, Omit<RequestOptions, 'body'> {
    path: (payload: Payload) => string;
    headers?: Record<string, string>;
    body?: (payload: Payload) => FormData | object;
    searchParams?: (payload: Payload) => { [key: string]: string; };
    invalidateQueries?: { dataType: string; };
    updateQueries?: { dataType: string; emberUpdateType: 'createOrUpdate' | 'delete' | 'skip'; update: (newData: ResponseData, currentData: unknown, payload: Payload) => unknown };
}

const mutate = <ResponseData, Payload>({fetchApi, path, payload, searchParams, options}: {
    fetchApi: ReturnType<typeof useFetchApi>;
    path: string;
    payload?: Payload;
    searchParams?: Record<string, string>;
    options: Omit<MutationOptions<ResponseData, Payload>, 'path'>
}) => {
    const {defaultSearchParams, body, ...requestOptions} = options;
    const url = apiUrl(path, searchParams || defaultSearchParams, options?.useActivityPub);
    const generatedBody = payload && body?.(payload);

    let requestBody: string | FormData | undefined = undefined;
    if (generatedBody instanceof FormData) {
        requestBody = generatedBody;
    } else if (generatedBody) {
        requestBody = JSON.stringify(generatedBody);
    }

    return fetchApi<ResponseData>(url, {
        body: requestBody,
        ...requestOptions
    });
};

export const createMutation = <ResponseData, Payload>({path, searchParams, defaultSearchParams, updateQueries, invalidateQueries, ...mutateOptions}: MutationOptions<ResponseData, Payload>) => () => {
    const fetchApi = useFetchApi();
    const queryClient = useQueryClient();
    const {onUpdate, onInvalidate, onDelete} = useFramework();

    const afterMutate = useCallback((newData: ResponseData, payload: Payload) => {
        if (invalidateQueries) {
            queryClient.invalidateQueries([invalidateQueries.dataType]);
            onInvalidate(invalidateQueries.dataType);
        }

        if (updateQueries) {
            queryClient.setQueriesData([updateQueries.dataType], (data: unknown) => updateQueries!.update(newData, data, payload));
            if (updateQueries.emberUpdateType === 'createOrUpdate') {
                onUpdate(updateQueries.dataType, newData);
            } else if (updateQueries.emberUpdateType === 'delete') {
                if (typeof payload !== 'string') {
                    throw new Error('Expected delete mutation to have a string (ID) payload. Either change the payload or update the createMutation hook');
                }

                onDelete(updateQueries.dataType, payload);
            }
        }
    }, [onInvalidate, onUpdate, onDelete, queryClient]);

    return useMutation<ResponseData, unknown, Payload>({
        mutationFn: payload => mutate({fetchApi, path: path(payload), payload, searchParams: searchParams?.(payload) || defaultSearchParams, options: mutateOptions}),
        onSuccess: afterMutate
    });
};
