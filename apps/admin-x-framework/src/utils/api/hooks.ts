import {
  InfiniteData,
  InvalidateOptions,
  InvalidateQueryFilters,
  QueryKey,
  UseInfiniteQueryOptions,
  UseQueryOptions,
  UseQueryResult,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import useHandleError from '../../hooks/use-handle-error';
import { usePermission } from '../../hooks/use-permissions';
import { UserRoleType } from '../../api/roles';
import { useFramework } from '../../providers/framework-provider';
import { apiUrl, useFetchApi, type RequestOptions } from './fetch-api';

export interface Meta {
  capabilities?: {
    dislikes?: boolean;
  };
  pagination: {
    page: number;
    limit: number | 'all';
    pages: number;
    total: number;
    next: number | null;
    prev: number | null;
  };
}

interface QueryOptions<ResponseData> {
  dataType: string;
  path: string;
  headers?: Record<string, string>;
  defaultSearchParams?: Record<string, string>;
  permissions?: UserRoleType[];
  parseResponse?: (data: unknown) => ResponseData;
  returnData?: (originalData: unknown) => ResponseData;
}

type QueryHookOptions<ResponseData> = Omit<
  UseQueryOptions<ResponseData>,
  'queryKey' | 'queryFn'
> & {
  searchParams?: Record<string, string>;
  defaultErrorHandler?: boolean;
  /** Whether this query leaves an expired session for its caller to handle in place. */
  requestOptions?: Pick<RequestOptions, 'sessionExpiryRedirect'>;
};

export const createQuery =
  <ResponseData>(options: QueryOptions<ResponseData>) =>
  ({ searchParams, requestOptions, ...query }: QueryHookOptions<ResponseData> = {}): Omit<
    UseQueryResult<ResponseData>,
    'data'
  > & { data: ResponseData | undefined } => {
    const url = apiUrl(options.path, searchParams || options.defaultSearchParams);
    const fetchApi = useFetchApi();
    const handleError = useHandleError();
    const hasPermission = usePermission(options.permissions, { requestOptions });

    const result = useQuery<ResponseData>({
      ...query,
      enabled: hasPermission && (query.enabled ?? true),
      queryKey: [options.dataType, url],
      queryFn: async () => {
        if (options.parseResponse) {
          const data = await fetchApi<unknown>(url, {
            headers: options.headers,
            ...requestOptions,
          });
          return options.parseResponse(data);
        }
        return fetchApi<ResponseData>(url, { headers: options.headers, ...requestOptions });
      },
    });

    const data = useMemo(
      () => (result.data && options.returnData ? options.returnData(result.data) : result.data),
      [result.data],
    );

    useEffect(() => {
      if (result.error && query.defaultErrorHandler !== false) {
        handleError(result.error);
      }
    }, [handleError, result.error, query.defaultErrorHandler]);

    return {
      ...result,
      data,
    };
  };

type InfiniteQueryOptions<ResponseData, PageData = ResponseData> = Omit<
  QueryOptions<PageData>,
  'returnData'
> & {
  returnData: (originalData: unknown) => ResponseData;
  defaultNextPageParams?: (
    data: PageData,
    params: Record<string, string>,
  ) => Record<string, string> | undefined;
};

type InfiniteQueryPageParam = Record<string, string> | undefined;

type InfiniteQueryHookOptions<ResponseData, PageData = ResponseData> = Omit<
  UseInfiniteQueryOptions<
    PageData,
    Error,
    InfiniteData<PageData, InfiniteQueryPageParam>,
    QueryKey,
    InfiniteQueryPageParam
  >,
  'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
> & {
  searchParams?: Record<string, string>;
  defaultErrorHandler?: boolean;
  /** Whether this query leaves an expired session for its caller to handle in place. */
  requestOptions?: Pick<RequestOptions, 'sessionExpiryRedirect'>;
  getNextPageParams?: (
    data: PageData,
    params: Record<string, string>,
  ) => Record<string, string> | undefined;
};

export const createInfiniteQuery =
  <ResponseData, PageData = ResponseData>(options: InfiniteQueryOptions<ResponseData, PageData>) =>
  ({
    searchParams,
    requestOptions,
    getNextPageParams,
    ...query
  }: InfiniteQueryHookOptions<ResponseData, PageData> = {}) => {
    const fetchApi = useFetchApi();
    const handleError = useHandleError();
    const hasPermission = usePermission(options.permissions, { requestOptions });

    const nextPageParams = getNextPageParams || options.defaultNextPageParams || (() => ({}));

    const result = useInfiniteQuery<
      PageData,
      Error,
      InfiniteData<PageData, InfiniteQueryPageParam>,
      QueryKey,
      InfiniteQueryPageParam
    >({
      ...query,
      enabled: hasPermission && (query.enabled ?? true),
      queryKey: [
        options.dataType,
        apiUrl(options.path, searchParams || options.defaultSearchParams),
      ],
      queryFn: async ({ pageParam }) => {
        const url = apiUrl(options.path, pageParam || searchParams || options.defaultSearchParams);
        if (options.parseResponse) {
          const data = await fetchApi<unknown>(url, {
            headers: options.headers,
            ...requestOptions,
          });
          return options.parseResponse(data);
        }
        return fetchApi<PageData>(url, { headers: options.headers, ...requestOptions });
      },
      initialPageParam: undefined,
      getNextPageParam: (data) =>
        nextPageParams(data, searchParams || options.defaultSearchParams || {}),
    });

    const data = useMemo(() => result.data && options.returnData(result.data), [result.data]);

    useEffect(() => {
      if (result.error && query.defaultErrorHandler !== false) {
        handleError(result.error);
      }
    }, [handleError, result.error, query.defaultErrorHandler]);

    return {
      ...result,
      data,
    };
  };

export const createQueryWithId =
  <ResponseData>(
    options: Omit<QueryOptions<ResponseData>, 'path'> & { path: (id: string) => string },
  ) =>
  (id: string, { searchParams, ...query }: QueryHookOptions<ResponseData> = {}) => {
    const queryHook = createQuery<ResponseData>({ ...options, path: options.path(id) });
    return queryHook({ searchParams: searchParams || options.defaultSearchParams, ...query });
  };

interface MutationOptions<ResponseData, Payload>
  extends Omit<QueryOptions<ResponseData>, 'dataType' | 'path'>, Omit<RequestOptions, 'body'> {
  path: (payload: Payload) => string;
  headers?: Record<string, string>;
  body?: (payload: Payload) => FormData | object;
  searchParams?: (payload: Payload) => { [key: string]: string };
  /** Per-payload transport options, merged over the ones declared on the hook. */
  requestOptions?: (payload: Payload) => Omit<RequestOptions, 'body'>;
  invalidateQueries?:
    | { dataType: string | string[] }
    | {
        filters?: InvalidateQueryFilters;
        options?: InvalidateOptions;
      };
  updateQueries?: {
    dataType: string;
    emberUpdateType: 'createOrUpdate' | 'delete' | 'skip';
    update: (newData: ResponseData, currentData: unknown, payload: Payload) => unknown;
  };
}

const mutate = <ResponseData, Payload>({
  fetchApi,
  path,
  payload,
  searchParams,
  options,
}: {
  fetchApi: ReturnType<typeof useFetchApi>;
  path: string;
  payload?: Payload;
  searchParams?: Record<string, string>;
  options: Omit<MutationOptions<ResponseData, Payload>, 'path'>;
}) => {
  const { defaultSearchParams, body, requestOptions, ...staticOptions } = options;
  const url = apiUrl(path, searchParams || defaultSearchParams);
  const generatedBody = payload && body?.(payload);

  let requestBody: string | FormData | undefined = undefined;
  if (generatedBody instanceof FormData) {
    requestBody = generatedBody;
  } else if (generatedBody) {
    requestBody = JSON.stringify(generatedBody);
  }

  return fetchApi<ResponseData>(url, {
    body: requestBody,
    ...staticOptions,
    ...(payload === undefined ? {} : requestOptions?.(payload)),
  });
};

export const createMutation =
  <ResponseData, Payload>({
    path,
    searchParams,
    defaultSearchParams,
    updateQueries,
    invalidateQueries,
    ...mutateOptions
  }: MutationOptions<ResponseData, Payload>) =>
  () => {
    const fetchApi = useFetchApi();
    const queryClient = useQueryClient();
    const { onUpdate, onInvalidate, onDelete } = useFramework();

    const afterMutate = useCallback(
      (newData: ResponseData, payload: Payload) => {
        if (invalidateQueries && 'dataType' in invalidateQueries) {
          const dataTypes = Array.isArray(invalidateQueries.dataType)
            ? invalidateQueries.dataType
            : [invalidateQueries.dataType];
          for (const dataType of dataTypes) {
            queryClient.invalidateQueries({ queryKey: [dataType] });
            onInvalidate(dataType);
          }
        } else if (invalidateQueries) {
          queryClient.invalidateQueries(invalidateQueries.filters, invalidateQueries.options);
        }

        if (updateQueries) {
          queryClient.setQueriesData({ queryKey: [updateQueries.dataType] }, (data: unknown) =>
            updateQueries!.update(newData, data, payload),
          );
          if (updateQueries.emberUpdateType === 'createOrUpdate') {
            onUpdate(updateQueries.dataType, newData);
          } else if (updateQueries.emberUpdateType === 'delete') {
            if (typeof payload !== 'string') {
              throw new Error(
                'Expected delete mutation to have a string (ID) payload. Either change the payload or update the createMutation hook',
              );
            }

            onDelete(updateQueries.dataType, payload);
          }
        }
      },
      [onInvalidate, onUpdate, onDelete, queryClient],
    );

    return useMutation<ResponseData, unknown, Payload>({
      mutationFn: (payload) =>
        mutate({
          fetchApi,
          path: path(payload),
          payload,
          searchParams: searchParams?.(payload) || defaultSearchParams,
          options: mutateOptions,
        }),
      onSuccess: afterMutate,
    });
  };
