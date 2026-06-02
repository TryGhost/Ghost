import {act, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {currentUserQueryKey} from '../../../src/api/current-user';
import {createTestQueryClient, renderHookWithProviders} from '../../../src/test/test-utils';
import {getMemberCountQueryKey, useAddMember, useBrowseMembersInfinite, useBulkDeleteMembers, useImportMembers, useMemberCount} from '../../../src/api/members';
import type {MembersInfiniteResponseType, MembersResponseType} from '../../../src/api/members';
import {withMockFetch} from '../../utils/mock-fetch';

const memberCountKey = getMemberCountQueryKey();

function membersResponse(total: number, limit: number | 'all' = 1): MembersResponseType {
    return {
        members: [],
        meta: {pagination: {page: 1, limit, pages: 1, total, next: null, prev: null}}
    };
}

function membersInfiniteResponse(total: number): MembersInfiniteResponseType {
    return {
        ...membersResponse(total, 100),
        isEnd: true
    };
}

function seedMemberCount(queryClient: ReturnType<typeof createTestQueryClient>, total = 10, options?: {updatedAt?: number}) {
    queryClient.setQueryDefaults(memberCountKey, {cacheTime: Infinity});
    queryClient.setQueryData(memberCountKey, membersResponse(total), options);
}

function createQueryClientWithCurrentUser() {
    const queryClient = createTestQueryClient();

    queryClient.setQueryDefaults(currentUserQueryKey, {staleTime: Infinity});
    queryClient.setQueryDefaults(memberCountKey, {cacheTime: Infinity});
    queryClient.setQueryData(currentUserQueryKey, {
        users: [{
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            roles: []
        }]
    });

    return queryClient;
}

async function browseMembers({
    queryClient,
    searchParams,
    total = 83427
}: {
    queryClient: ReturnType<typeof createTestQueryClient>;
    searchParams?: Record<string, string>;
    total?: number;
}) {
    await withMockFetch({
        json: membersResponse(total, 100)
    }, async () => {
        const {result} = renderHookWithProviders(() => useBrowseMembersInfinite({
            ...(searchParams ? {searchParams} : {})
        }), {queryClient});

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
    });
}

describe('members api', () => {
    function expectQueryInvalidation(queryClient: ReturnType<typeof createTestQueryClient>, dataType: string, isInvalidated: boolean) {
        const queries = queryClient.getQueryCache().getAll().filter(q => q.queryKey[0] === dataType);
        expect(queries.length).toBeGreaterThan(0);
        expect(queries.every(q => q.state.isInvalidated === isInvalidated)).toBe(true);
    }

    it('invalidates member queries after adding a member', async () => {
        const queryClient = createTestQueryClient();

        seedMemberCount(queryClient);

        await withMockFetch({
            json: {
                members: [{
                    email: 'jamie@example.com'
                }]
            }
        }, async () => {
            const {result} = renderHookWithProviders(() => useAddMember(), {queryClient});

            await act(async () => {
                await result.current.mutateAsync({email: 'jamie@example.com'});
            });

            await waitFor(() => {
                expectQueryInvalidation(queryClient, 'MembersResponseType', true);
            });
        });
    });

    it('invalidates member queries after importing members', async () => {
        const queryClient = createTestQueryClient();
        const onInvalidate = vi.fn();
        const unrelatedKey = ['PostsResponseType', 'http://localhost:3000/ghost/api/admin/posts/'];
        const file = new File(['email\njamie@example.com'], 'members.csv', {type: 'text/csv'});

        seedMemberCount(queryClient);
        queryClient.setQueryData(unrelatedKey, {posts: []});

        await withMockFetch({
            json: {
                meta: {
                    stats: {
                        imported: 1,
                        invalid: []
                    }
                }
            }
        }, async (mock) => {
            const {result} = renderHookWithProviders(() => useImportMembers(), {
                frameworkProps: {onInvalidate},
                queryClient
            });

            await act(async () => {
                await result.current.mutateAsync({
                    file,
                    labels: ['VIP'],
                    mapping: {email: 'Email'}
                });
            });

            expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/members/upload/');
            expect(mock.calls[0][1].method).toBe('POST');
            expect(mock.calls[0][1].body).toBeInstanceOf(FormData);
            expect(mock.calls[0][1].body.get('membersfile')).toBe(file);
            expect(mock.calls[0][1].body.get('labels')).toBe('VIP');
            expect(mock.calls[0][1].body.get('mapping[email]')).toBe('Email');
            expect(mock.calls[0][1].headers).not.toHaveProperty('content-type');
            await waitFor(() => {
                expectQueryInvalidation(queryClient, 'MembersResponseType', true);
                expectQueryInvalidation(queryClient, 'PostsResponseType', false);
            });
            expect(onInvalidate).toHaveBeenCalledWith('MembersResponseType');
        });
    });

    it('does not retry member import uploads after transient network failures', async () => {
        const queryClient = createTestQueryClient();
        const file = new File(['email\njamie@example.com'], 'members.csv', {type: 'text/csv'});
        const originalFetch = globalThis.fetch;
        const mockFetch = vi.fn<typeof globalThis.fetch>(() => Promise.reject(new TypeError('Network failed')));

        vi.useFakeTimers();
        globalThis.fetch = mockFetch as typeof globalThis.fetch;

        try {
            const {result} = renderHookWithProviders(() => useImportMembers(), {queryClient});
            const importPromise = result.current.mutateAsync({file}).catch(error => error);

            await vi.advanceTimersByTimeAsync(600);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            await expect(importPromise).resolves.toBeInstanceOf(Error);
        } finally {
            globalThis.fetch = originalFetch;
            vi.useRealTimers();
        }
    });

    it('invalidates member queries after accepting a background member import', async () => {
        const queryClient = createTestQueryClient();
        const file = new File(['email\njamie@example.com'], 'members.csv', {type: 'text/csv'});

        seedMemberCount(queryClient);

        await withMockFetch({
            status: 202,
            json: {
                meta: {
                    originalImportSize: 501
                }
            }
        }, async () => {
            const {result} = renderHookWithProviders(() => useImportMembers(), {queryClient});

            await act(async () => {
                await result.current.mutateAsync({file});
            });

            await waitFor(() => {
                expectQueryInvalidation(queryClient, 'MembersResponseType', true);
            });
        });
    });

    it('invalidates member queries after bulk deleting members', async () => {
        const queryClient = createTestQueryClient();

        seedMemberCount(queryClient);

        await withMockFetch({
            json: {
                meta: {
                    stats: {
                        successful: 3,
                        unsuccessful: 0
                    }
                }
            }
        }, async () => {
            const {result} = renderHookWithProviders(() => useBulkDeleteMembers(), {queryClient});

            await act(async () => {
                await result.current.mutateAsync({all: true});
            });

            await waitFor(() => {
                expectQueryInvalidation(queryClient, 'MembersResponseType', true);
            });
        });
    });

    it('fetches the member count with the dedicated count hook', async () => {
        const queryClient = createQueryClientWithCurrentUser();

        await withMockFetch({
            json: membersResponse(102466)
        }, async (mockFetch) => {
            const {result} = renderHookWithProviders(() => useMemberCount(), {queryClient});

            await waitFor(() => {
                expect(result.current).toBe(102466);
            });

            expect(mockFetch.calls[0][0].toString()).toBe('http://localhost:3000/ghost/api/admin/members/?limit=1');
        });
    });

    it('syncs the sidebar member count from an unfiltered members list query', async () => {
        const queryClient = createQueryClientWithCurrentUser();
        const memberDetailKey = ['MembersResponseType', 'http://localhost:3000/ghost/api/admin/members/member-1/'];

        queryClient.setQueryDefaults(memberDetailKey, {cacheTime: Infinity});
        seedMemberCount(queryClient, 102466);

        queryClient.setQueryData(memberDetailKey, {
            members: [{id: 'member-1'}]
        });

        await browseMembers({queryClient});

        expect(queryClient.getQueryData<MembersResponseType>(memberCountKey)?.meta?.pagination.total).toBe(83427);
        expect(queryClient.getQueryData<MembersResponseType>(memberDetailKey)?.members).toEqual([{id: 'member-1'}]);
    });

    it('does not replace a newer sidebar count cache entry with older members list data', async () => {
        const queryClient = createQueryClientWithCurrentUser();

        seedMemberCount(queryClient, 102466, {updatedAt: Date.now() + 60_000});

        await browseMembers({queryClient});

        expect(queryClient.getQueryData<MembersResponseType>(memberCountKey)?.meta?.pagination.total).toBe(102466);
    });

    it('does not sync the sidebar member count from placeholder members list data', async () => {
        const queryClient = createQueryClientWithCurrentUser();

        seedMemberCount(queryClient, 102466);

        await withMockFetch({
            json: membersResponse(83427, 100)
        }, async () => {
            const {result} = renderHookWithProviders(() => useBrowseMembersInfinite({
                placeholderData: {
                    pages: [membersInfiniteResponse(12)],
                    pageParams: []
                }
            }), {queryClient});

            await waitFor(() => {
                expect(result.current.isPlaceholderData).toBe(true);
            });

            expect(queryClient.getQueryData<MembersResponseType>(memberCountKey)?.meta?.pagination.total).toBe(102466);
        });
    });

    it('does not sync the sidebar member count from a filtered members list query', async () => {
        const queryClient = createQueryClientWithCurrentUser();

        seedMemberCount(queryClient, 102466);

        await browseMembers({
            queryClient,
            searchParams: {filter: 'status:paid', limit: '100', order: 'created_at desc'},
            total: 12
        });

        expect(queryClient.getQueryData<MembersResponseType>(memberCountKey)?.meta?.pagination.total).toBe(102466);
    });

    it('does not sync the sidebar member count from a searched members list query', async () => {
        const queryClient = createQueryClientWithCurrentUser();

        seedMemberCount(queryClient, 102466);

        await browseMembers({
            queryClient,
            searchParams: {limit: '100', order: 'created_at desc', search: 'jamie'},
            total: 12
        });

        expect(queryClient.getQueryData<MembersResponseType>(memberCountKey)?.meta?.pagination.total).toBe(102466);
    });

    it('does not create a sidebar member count query when one is absent', async () => {
        const queryClient = createQueryClientWithCurrentUser();

        await browseMembers({queryClient});

        expect(queryClient.getQueryData<MembersResponseType>(memberCountKey)).toBeUndefined();
    });
});
