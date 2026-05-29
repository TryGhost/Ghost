import {act, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {currentUserQueryKey} from '../../../src/api/current-user';
import {createTestQueryClient, renderHookWithProviders} from '../../../src/test/test-utils';
import {getMemberCountQueryKey, useAddMember, useBrowseMembersInfinite, useBulkDeleteMembers, useImportMembers} from '../../../src/api/members';
import type {MembersResponseType} from '../../../src/api/members';
import {withMockFetch} from '../../utils/mock-fetch';

const memberCountKey = getMemberCountQueryKey();

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

describe('members api', () => {
    function expectQueryInvalidation(queryClient: ReturnType<typeof createTestQueryClient>, dataType: string, isInvalidated: boolean) {
        const queries = queryClient.getQueryCache().getAll().filter(q => q.queryKey[0] === dataType);
        expect(queries.length).toBeGreaterThan(0);
        expect(queries.every(q => q.state.isInvalidated === isInvalidated)).toBe(true);
    }

    it('invalidates member queries after adding a member', async () => {
        const queryClient = createTestQueryClient();

        queryClient.setQueryData(memberCountKey, {
            members: [],
            meta: {pagination: {page: 1, limit: 1, pages: 1, total: 10, next: null, prev: null}}
        });

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

        queryClient.setQueryData(memberCountKey, {
            members: [],
            meta: {pagination: {page: 1, limit: 1, pages: 1, total: 10, next: null, prev: null}}
        });
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

    it('invalidates member queries after accepting a background member import', async () => {
        const queryClient = createTestQueryClient();
        const file = new File(['email\njamie@example.com'], 'members.csv', {type: 'text/csv'});

        queryClient.setQueryData(memberCountKey, {
            members: [],
            meta: {pagination: {page: 1, limit: 1, pages: 1, total: 10, next: null, prev: null}}
        });

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

        queryClient.setQueryData(memberCountKey, {
            members: [],
            meta: {pagination: {page: 1, limit: 1, pages: 1, total: 10, next: null, prev: null}}
        });

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

    it('syncs the sidebar member count from an unfiltered members list query', async () => {
        const queryClient = createQueryClientWithCurrentUser();
        const memberListKey = ['MembersResponseType', 'http://localhost:3000/ghost/api/admin/members/?include=labels%2Ctiers&limit=100&order=updated_at+desc'];
        const memberDetailKey = ['MembersResponseType', 'http://localhost:3000/ghost/api/admin/members/member-1/'];
        const filteredMemberCountKey = ['MembersResponseType', 'http://localhost:3000/ghost/api/admin/members/?filter=status%3Apaid&limit=1'];

        queryClient.setQueryDefaults(memberListKey, {cacheTime: Infinity});
        queryClient.setQueryDefaults(memberDetailKey, {cacheTime: Infinity});
        queryClient.setQueryDefaults(filteredMemberCountKey, {cacheTime: Infinity});

        queryClient.setQueryData(memberCountKey, {
            members: [],
            meta: {pagination: {page: 1, limit: 1, pages: 1, total: 102466, next: null, prev: null}}
        });
        queryClient.setQueryData(memberListKey, {
            members: [],
            meta: {pagination: {page: 1, limit: 100, pages: 1, total: 45, next: null, prev: null}}
        });
        queryClient.setQueryData(memberDetailKey, {
            members: [{id: 'member-1'}]
        });
        queryClient.setQueryData(filteredMemberCountKey, {
            members: [],
            meta: {pagination: {page: 1, limit: 1, pages: 1, total: 12, next: null, prev: null}}
        });

        await withMockFetch({
            json: {
                members: [],
                meta: {pagination: {page: 1, limit: 100, pages: 1, total: 83427, next: null, prev: null}}
            }
        }, async () => {
            const {result} = renderHookWithProviders(() => useBrowseMembersInfinite(), {queryClient});

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
                expect(queryClient.getQueryData<MembersResponseType>(memberCountKey)?.meta?.pagination.total).toBe(83427);
                expect(queryClient.getQueryData<MembersResponseType>(memberListKey)?.meta?.pagination.total).toBe(45);
                expect(queryClient.getQueryData<MembersResponseType>(memberDetailKey)?.members).toEqual([{id: 'member-1'}]);
                expect(queryClient.getQueryData<MembersResponseType>(filteredMemberCountKey)?.meta?.pagination.total).toBe(12);
            });
        });
    });

    it('does not replace a newer sidebar count cache entry with older members list data', async () => {
        const queryClient = createQueryClientWithCurrentUser();

        queryClient.setQueryData(memberCountKey, {
            members: [],
            meta: {pagination: {page: 1, limit: 1, pages: 1, total: 102466, next: null, prev: null}}
        }, {updatedAt: Date.now() + 60_000});

        await withMockFetch({
            json: {
                members: [],
                meta: {pagination: {page: 1, limit: 100, pages: 1, total: 83427, next: null, prev: null}}
            }
        }, async () => {
            const {result} = renderHookWithProviders(() => useBrowseMembersInfinite(), {queryClient});

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(queryClient.getQueryData<MembersResponseType>(memberCountKey)?.meta?.pagination.total).toBe(102466);
        });
    });

    it('does not sync the sidebar member count from a filtered members list query', async () => {
        const queryClient = createQueryClientWithCurrentUser();

        queryClient.setQueryData(memberCountKey, {
            members: [],
            meta: {pagination: {page: 1, limit: 1, pages: 1, total: 102466, next: null, prev: null}}
        });

        await withMockFetch({
            json: {
                members: [],
                meta: {pagination: {page: 1, limit: 100, pages: 1, total: 12, next: null, prev: null}}
            }
        }, async () => {
            const {result} = renderHookWithProviders(() => useBrowseMembersInfinite({
                searchParams: {
                    filter: 'status:paid',
                    limit: '100',
                    order: 'created_at desc'
                }
            }), {queryClient});

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(queryClient.getQueryData<MembersResponseType>(memberCountKey)?.meta?.pagination.total).toBe(102466);
        });
    });

    it('does not sync the sidebar member count from a searched members list query', async () => {
        const queryClient = createQueryClientWithCurrentUser();

        queryClient.setQueryData(memberCountKey, {
            members: [],
            meta: {pagination: {page: 1, limit: 1, pages: 1, total: 102466, next: null, prev: null}}
        });

        await withMockFetch({
            json: {
                members: [],
                meta: {pagination: {page: 1, limit: 100, pages: 1, total: 12, next: null, prev: null}}
            }
        }, async () => {
            const {result} = renderHookWithProviders(() => useBrowseMembersInfinite({
                searchParams: {
                    limit: '100',
                    order: 'created_at desc',
                    search: 'jamie'
                }
            }), {queryClient});

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(queryClient.getQueryData<MembersResponseType>(memberCountKey)?.meta?.pagination.total).toBe(102466);
        });
    });

    it('does not create a sidebar member count query when one is absent', async () => {
        const queryClient = createQueryClientWithCurrentUser();

        await withMockFetch({
            json: {
                members: [],
                meta: {pagination: {page: 1, limit: 100, pages: 1, total: 83427, next: null, prev: null}}
            }
        }, async () => {
            const {result} = renderHookWithProviders(() => useBrowseMembersInfinite(), {queryClient});

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(queryClient.getQueryData<MembersResponseType>(memberCountKey)).toBeUndefined();
        });
    });
});
