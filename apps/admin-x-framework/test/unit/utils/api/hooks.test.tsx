import {InfiniteData, QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {act, renderHook, waitFor} from '@testing-library/react';
import React, {ReactNode} from 'react';
import {FrameworkProvider} from '../../../../src/providers/FrameworkProvider';
import {createInfiniteQuery, createMutation, createPaginatedQuery, createQuery, createQueryWithId} from '../../../../src/utils/api/hooks';
import {withMockFetch} from '../../../utils/mockFetch';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false
        }
    }
});

const wrapper: React.FC<{ children: ReactNode }> = ({children}) => (
    <FrameworkProvider
        externalNavigate={() => {}}
        ghostVersion='5.x'
        sentryDSN=''
        unsplashConfig={{
            Authorization: '',
            'Accept-Version': '',
            'Content-Type': '',
            'App-Pragma': '',
            'X-Unsplash-Cache': true
        }}
        onDelete={() => {}}
        onInvalidate={() => {}}
        onUpdate={() => {}}
    >
        {/* Being nested, this overrides the default QueryClientProvider from the framework */}
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    </FrameworkProvider>
);

describe('API hooks', function () {
    describe('createQuery', function () {
        afterEach(function () {
            queryClient.clear();
        });

        it('makes an API request', async function () {
            await withMockFetch({
                json: {test: 1}
            }, async (mock) => {
                const useTestQuery = createQuery({
                    dataType: 'test',
                    path: '/test/'
                });

                const {result} = renderHook(() => useTestQuery(), {wrapper});

                await waitFor(() => expect(result.current.isLoading).toBe(false));

                expect(result.current.data).toEqual({test: 1});

                expect(mock.calls.length).toBe(1);
                expect(mock.calls[0]).toEqual(['http://localhost:3000/ghost/api/admin/test/', {
                    credentials: 'include',
                    dataType: 'test',
                    headers: {
                        'app-pragma': 'no-cache',
                        'x-ghost-version': '5.x'
                    },
                    method: 'GET',
                    mode: 'cors',
                    path: '/test/',
                    signal: expect.any(AbortSignal)
                }]);
            });
        });

        it('can add custom headers', async function () {
            await withMockFetch({
                json: {test: 1}
            }, async (mock) => {
                const useTestQuery = createQuery({
                    dataType: 'test',
                    path: '/test/',
                    headers: {'Content-Type': 'ALOHA'}
                });

                const {result} = renderHook(() => useTestQuery(), {wrapper});

                await waitFor(() => expect(result.current.isLoading).toBe(false));

                expect(result.current.data).toEqual({test: 1});

                expect(mock.calls.length).toBe(1);
                expect(mock.calls[0]).toEqual(['http://localhost:3000/ghost/api/admin/test/', {
                    credentials: 'include',
                    dataType: 'test',
                    headers: {
                        'Content-Type': 'ALOHA',
                        'app-pragma': 'no-cache',
                        'x-ghost-version': '5.x'
                    },
                    method: 'GET',
                    mode: 'cors',
                    path: '/test/',
                    signal: expect.any(AbortSignal)
                }]);
            });
        });

        it('sends default query params', async function () {
            await withMockFetch({}, async (mock) => {
                const useTestQuery = createQuery({
                    dataType: 'test',
                    path: '/test/',
                    defaultSearchParams: {a: '?'}
                });

                const {result} = renderHook(() => useTestQuery(), {wrapper});

                await waitFor(() => expect(result.current.isLoading).toBe(false));

                expect(mock.calls.length).toBe(1);
                expect(mock.calls[0][0]).toEqual('http://localhost:3000/ghost/api/admin/test/?a=%3F');
            });
        });

        it('can override default query params', async function () {
            await withMockFetch({}, async (mock) => {
                const useTestQuery = createQuery({
                    dataType: 'test',
                    path: '/test/',
                    defaultSearchParams: {a: '?'}
                });

                const {result} = renderHook(() => useTestQuery({searchParams: {b: '1'}}), {wrapper});

                await waitFor(() => expect(result.current.isLoading).toBe(false));

                expect(mock.calls.length).toBe(1);
                expect(mock.calls[0][0]).toEqual('http://localhost:3000/ghost/api/admin/test/?b=1');
            });
        });

        it('can transform return data', async function () {
            await withMockFetch({json: {test: 1}}, async () => {
                const useTestQuery = createQuery({
                    dataType: 'test',
                    path: '/test/',
                    returnData: data => (data as {test: number}).test + 1
                });

                const {result} = renderHook(() => useTestQuery(), {wrapper});

                await waitFor(() => expect(result.current.isLoading).toBe(false));

                expect(result.current.data).toEqual(2);
            });
        });
    });

    describe('createPaginatedQuery', function () {
        afterEach(function () {
            queryClient.clear();
        });

        it('makes a paginated API request', async function () {
            await withMockFetch({
                json: {test: 1}
            }, async (mock) => {
                const useTestQuery = createPaginatedQuery({
                    dataType: 'test',
                    path: '/test/'
                });

                const {result} = renderHook(() => useTestQuery(), {wrapper});

                await waitFor(() => expect(result.current.isLoading).toBe(false));

                expect(result.current.data).toEqual({test: 1});

                expect(mock.calls.length).toBe(1);
                expect(mock.calls[0]).toEqual(['http://localhost:3000/ghost/api/admin/test/?page=1', {
                    credentials: 'include',
                    headers: {
                        'app-pragma': 'no-cache',
                        'x-ghost-version': '5.x'
                    },
                    method: 'GET',
                    mode: 'cors',
                    signal: expect.any(AbortSignal)
                }]);
            });
        });

        it('sends default query params', async function () {
            await withMockFetch({}, async (mock) => {
                const useTestQuery = createPaginatedQuery({
                    dataType: 'test',
                    path: '/test/',
                    defaultSearchParams: {a: '?'}
                });

                const {result} = renderHook(() => useTestQuery(), {wrapper});

                await waitFor(() => expect(result.current.isLoading).toBe(false));

                expect(mock.calls.length).toBe(1);
                expect(mock.calls[0][0]).toEqual('http://localhost:3000/ghost/api/admin/test/?a=%3F&page=1');
            });
        });

        it('can override default query params', async function () {
            await withMockFetch({}, async (mock) => {
                const useTestQuery = createPaginatedQuery({
                    dataType: 'test',
                    path: '/test/',
                    defaultSearchParams: {a: '?'}
                });

                const {result} = renderHook(() => useTestQuery({searchParams: {b: '1'}}), {wrapper});

                await waitFor(() => expect(result.current.isLoading).toBe(false));

                expect(mock.calls.length).toBe(1);
                expect(mock.calls[0][0]).toEqual('http://localhost:3000/ghost/api/admin/test/?b=1&page=1');
            });
        });

        it('can transform return data', async function () {
            await withMockFetch({json: {test: 1}}, async () => {
                const useTestQuery = createPaginatedQuery({
                    dataType: 'test',
                    path: '/test/',
                    returnData: data => ({test: (data as {test: number}).test + 1, meta: undefined})
                });

                const {result} = renderHook(() => useTestQuery(), {wrapper});

                await waitFor(() => expect(result.current.isLoading).toBe(false));

                expect(result.current.data).toEqual({test: 2});
            });
        });

        it('exposes pagination metadata', async function () {
            await withMockFetch({json: {meta: {pagination: {pages: 2, total: 100}}}}, async () => {
                const useTestQuery = createPaginatedQuery({
                    dataType: 'test',
                    path: '/test/',
                    defaultSearchParams: {limit: '15'}
                });

                const {result} = renderHook(() => useTestQuery({}), {wrapper});

                await waitFor(() => expect(result.current.isLoading).toBe(false));

                expect(result.current.pagination.limit).toEqual(15);
                expect(result.current.pagination.page).toEqual(1);
                expect(result.current.pagination.pages).toEqual(2);
                expect(result.current.pagination.total).toEqual(100);
            });
        });

        it('supports navigating pages', async function () {
            await withMockFetch({json: {meta: {pagination: {pages: 2}}}}, async (mock) => {
                const useTestQuery = createPaginatedQuery({
                    dataType: 'test',
                    path: '/test/'
                });

                const {result} = renderHook(() => useTestQuery({}), {wrapper});

                await waitFor(() => expect(result.current.isLoading).toBe(false));

                expect(mock.calls.length).toBe(1);
                expect(mock.calls[0][0]).toEqual('http://localhost:3000/ghost/api/admin/test/?page=1');

                act(() => result.current.pagination.nextPage());

                await waitFor(() => expect(mock.calls.length).toBe(2));

                expect(mock.calls[1][0]).toEqual('http://localhost:3000/ghost/api/admin/test/?page=2');

                act(() => result.current.pagination.prevPage());

                await waitFor(() => expect(mock.calls.length).toBe(3));

                expect(mock.calls[2][0]).toEqual('http://localhost:3000/ghost/api/admin/test/?page=1');

                act(() => result.current.pagination.setPage(5));

                await waitFor(() => expect(mock.calls.length).toBe(4));

                expect(mock.calls[3][0]).toEqual('http://localhost:3000/ghost/api/admin/test/?page=5');
            });
        });
    });

    describe('createInfiniteQuery', function () {
        afterEach(function () {
            queryClient.clear();
        });

        it('makes a paginated API request', async function () {
            await withMockFetch({
                json: {test: 1, pagination: {next: 2}}
            }, async (mock) => {
                const useTestQuery = createInfiniteQuery({
                    dataType: 'test',
                    path: '/test/',
                    defaultNextPageParams: (lastPage, otherParams) => ({
                        ...otherParams,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        page: ((lastPage as any).pagination.next || 1).toString()
                    }),
                    returnData: (originalData) => {
                        const {pages} = originalData as InfiniteData<{test: number}>;
                        return pages.map(page => page.test);
                    }
                });

                const {result} = renderHook(() => useTestQuery(), {wrapper});

                await waitFor(() => expect(result.current.isLoading).toBe(false));

                expect(result.current.data).toEqual([1]);

                expect(mock.calls.length).toBe(1);
                expect(mock.calls[0]).toEqual(['http://localhost:3000/ghost/api/admin/test/', {
                    credentials: 'include',
                    headers: {
                        'app-pragma': 'no-cache',
                        'x-ghost-version': '5.x'
                    },
                    method: 'GET',
                    mode: 'cors',
                    signal: expect.any(AbortSignal)
                }]);

                await act(() => result.current.fetchNextPage());

                await waitFor(() => expect(mock.calls.length).toBe(2));
                expect(mock.calls[1][0]).toEqual('http://localhost:3000/ghost/api/admin/test/?page=2');

                await waitFor(() => expect(result.current.data).toEqual([1, 1]));
            });
        });
    });

    describe('createQueryWithId', function () {
        afterEach(function () {
            queryClient.clear();
        });

        it('fills in the ID in the request', async function () {
            await withMockFetch({
                json: {test: 1}
            }, async (mock) => {
                const useTestQuery = createQueryWithId({
                    dataType: 'test',
                    path: id => `/test/${id}/`
                });

                const {result} = renderHook(() => useTestQuery('1'), {wrapper});

                await waitFor(() => expect(result.current.isLoading).toBe(false));

                expect(result.current.data).toEqual({test: 1});

                expect(mock.calls.length).toBe(1);
                expect(mock.calls[0][0]).toEqual('http://localhost:3000/ghost/api/admin/test/1/');
            });
        });
    });

    describe('createMutation', function () {
        afterEach(function () {
            queryClient.clear();
        });

        it('makes a request', async function () {
            await withMockFetch({
                json: {test: 1}
            }, async (mock) => {
                const useTestMutation = createMutation({
                    path: () => '/test/',
                    method: 'PUT'
                });

                const {result} = renderHook(() => useTestMutation(), {wrapper});

                expect(await result.current.mutateAsync({})).toEqual({test: 1});

                expect(mock.calls.length).toBe(1);
                expect(mock.calls[0]).toEqual(['http://localhost:3000/ghost/api/admin/test/', {
                    credentials: 'include',
                    headers: {
                        'app-pragma': 'no-cache',
                        'x-ghost-version': '5.x'
                    },
                    method: 'PUT',
                    mode: 'cors',
                    body: undefined,
                    signal: expect.any(AbortSignal)
                }]);
            });
        });

        it('computes path, body, searchParams', async function () {
            await withMockFetch({
                json: {test: 1}
            }, async (mock) => {
                const useTestMutation = createMutation({
                    path: payload => `/test/${payload}/`,
                    searchParams: payload => ({a: `${payload}`}),
                    body: payload => ({b: `${payload}`}),
                    method: 'POST'
                });

                const {result} = renderHook(() => useTestMutation(), {wrapper});

                expect(await result.current.mutateAsync('hello')).toEqual({test: 1});

                expect(mock.calls.length).toBe(1);
                expect(mock.calls[0]).toEqual(['http://localhost:3000/ghost/api/admin/test/hello/?a=hello', {
                    credentials: 'include',
                    headers: {
                        'app-pragma': 'no-cache',
                        'content-type': 'application/json',
                        'x-ghost-version': '5.x'
                    },
                    method: 'POST',
                    mode: 'cors',
                    body: '{"b":"hello"}',
                    signal: expect.any(AbortSignal)
                }]);
            });
        });

        it('can invalidate queries in the cache', async function () {
            await withMockFetch({
                json: {test: 1}
            }, async (mock) => {
                queryClient.setQueryData(['MyDataType', '1'], {test: 1});
                queryClient.setQueryData(['MyDataType', '2'], {test: 2});

                const useTestMutation = createMutation({
                    path: () => '/test/',
                    method: 'PUT',
                    invalidateQueries: {dataType: 'MyDataType'}
                });

                const {result} = renderHook(() => useTestMutation(), {wrapper});

                await result.current.mutateAsync({});

                expect(mock.calls.length).toBe(1);

                expect(queryClient.getQueryState(['MyDataType', '1'])?.isInvalidated).toBe(true);
                expect(queryClient.getQueryState(['MyDataType', '2'])?.isInvalidated).toBe(true);
            });
        });

        it('can update queries in the cache', async function () {
            await withMockFetch({
                json: {test: 10}
            }, async (mock) => {
                queryClient.setQueryData(['MyDataType', '1'], {test: 1});
                queryClient.setQueryData(['MyDataType', '2'], {test: 2});

                const useTestMutation = createMutation({
                    path: () => '/test/',
                    method: 'PUT',
                    updateQueries: {
                        emberUpdateType: 'skip',
                        dataType: 'MyDataType',
                        update: (newData, currentData) => {
                            return {test: (newData as {test: number}).test + (currentData as {test: number}).test};
                        }
                    }
                });

                const {result} = renderHook(() => useTestMutation(), {wrapper});

                await result.current.mutateAsync({});

                expect(mock.calls.length).toBe(1);

                expect(queryClient.getQueryData(['MyDataType', '1'])).toEqual({test: 11});
                expect(queryClient.getQueryData(['MyDataType', '2'])).toEqual({test: 12});
            });
        });
    });
});
