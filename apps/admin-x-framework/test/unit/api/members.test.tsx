import {act, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {currentUserQueryKey} from '../../../src/api/current-user';
import type {UserRoleType} from '../../../src/api/roles';
import {createTestQueryClient, renderHookWithProviders} from '../../../src/test/test-utils';
import {getMemberCountQueryKey, getMemberSigninUrl, useAddMember, useBrowseMembersInfinite, useBulkDeleteMembers, useDeleteMember, useEditMember, useEditMemberSubscription, useImportMembers, useMemberActivityFeed, useMemberCount, useMemberLogout, useRemoveMemberEmailSuppression} from '../../../src/api/members';
import type {MemberActivityEvent, MembersInfiniteResponseType, MembersResponseType} from '../../../src/api/members';
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
    queryClient.setQueryDefaults(memberCountKey, {gcTime: Infinity});
    queryClient.setQueryData(memberCountKey, membersResponse(total), options);
}

function createQueryClientWithCurrentUser(roles: Array<{id: string; name: UserRoleType}> = []) {
    const queryClient = createTestQueryClient();

    queryClient.setQueryDefaults(currentUserQueryKey, {staleTime: Infinity});
    queryClient.setQueryDefaults(memberCountKey, {gcTime: Infinity});
    queryClient.setQueryData(currentUserQueryKey, {
        users: [{
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            roles
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
        const queryClient = createQueryClientWithCurrentUser([{id: 'role-1', name: 'Administrator'}]);

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

    it('does not fetch the member count for roles that cannot manage members', async () => {
        const queryClient = createQueryClientWithCurrentUser([{id: 'role-1', name: 'Editor'}]);

        await withMockFetch({}, async (mockFetch) => {
            const {result} = renderHookWithProviders(() => useMemberCount(), {queryClient});

            await act(async () => {
                await Promise.resolve();
            });

            expect(result.current).toBeUndefined();
            expect(mockFetch.calls).toHaveLength(0);
        });
    });

    it('syncs the sidebar member count from an unfiltered members list query', async () => {
        const queryClient = createQueryClientWithCurrentUser();
        const memberDetailKey = ['MembersResponseType', 'http://localhost:3000/ghost/api/admin/members/member-1/'];

        queryClient.setQueryDefaults(memberDetailKey, {gcTime: Infinity});
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

    describe('member detail operations', () => {
        const apiRoot = 'http://localhost:3000/ghost/api/admin';

        it('edits a member with the members envelope and includes tiers', async () => {
            const queryClient = createTestQueryClient();
            seedMemberCount(queryClient);

            await withMockFetch({json: {members: [{id: 'member-1'}]}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useEditMember(), {queryClient});

                await act(async () => {
                    await result.current.mutateAsync({
                        id: 'member-1',
                        name: 'Jamie',
                        note: 'VIP',
                        labels: [{name: 'VIP', slug: 'vip'}],
                        newsletters: [{id: 'newsletter-1'}]
                    });
                });

                expect(mock.calls[0][0].toString()).toBe(`${apiRoot}/members/member-1/?include=tiers`);
                expect(mock.calls[0][1].method).toBe('PUT');
                expect(JSON.parse(mock.calls[0][1].body)).toEqual({
                    members: [{
                        id: 'member-1',
                        name: 'Jamie',
                        note: 'VIP',
                        labels: [{name: 'VIP', slug: 'vip'}],
                        newsletters: [{id: 'newsletter-1'}]
                    }]
                });

                await waitFor(() => expectQueryInvalidation(queryClient, 'MembersResponseType', true));
            });
        });

        it('deletes a member and cancels Stripe subscriptions when requested', async () => {
            const queryClient = createTestQueryClient();
            seedMemberCount(queryClient);

            await withMockFetch({json: {}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useDeleteMember(), {queryClient});

                await act(async () => {
                    await result.current.mutateAsync({id: 'member-1', cancel: true});
                });

                expect(mock.calls[0][0].toString()).toBe(`${apiRoot}/members/member-1/?cancel=true`);
                expect(mock.calls[0][1].method).toBe('DELETE');
                await waitFor(() => expectQueryInvalidation(queryClient, 'MembersResponseType', true));
            });
        });

        it('deletes a member without cancelling Stripe subscriptions by default', async () => {
            const queryClient = createTestQueryClient();
            seedMemberCount(queryClient);

            await withMockFetch({json: {}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useDeleteMember(), {queryClient});

                await act(async () => {
                    await result.current.mutateAsync({id: 'member-1', cancel: false});
                });

                expect(mock.calls[0][0].toString()).toBe(`${apiRoot}/members/member-1/?cancel=false`);
            });
        });

        it('reads a member signin url for impersonation', async () => {
            const queryClient = createQueryClientWithCurrentUser();

            // The Admin API wraps the payload in a `member_signin_urls` envelope,
            // matching the framework serializer. The hook must unwrap it so
            // consumers get the flat object.
            await withMockFetch({json: {member_signin_urls: [{member_id: 'member-1', url: 'https://example.com/magic'}]}}, async (mock) => {
                const {result} = renderHookWithProviders(() => getMemberSigninUrl('member-1'), {queryClient});

                await waitFor(() => expect(result.current.isSuccess).toBe(true));

                expect(mock.calls[0][0].toString()).toBe(`${apiRoot}/members/member-1/signin_urls/`);
                expect(result.current.data).toEqual({member_id: 'member-1', url: 'https://example.com/magic'});
            });
        });

        it('signs out all sessions for a member', async () => {
            const queryClient = createTestQueryClient();
            seedMemberCount(queryClient);

            await withMockFetch({json: {}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useMemberLogout(), {queryClient});

                await act(async () => {
                    await result.current.mutateAsync({id: 'member-1'});
                });

                expect(mock.calls[0][0].toString()).toBe(`${apiRoot}/members/member-1/sessions/`);
                expect(mock.calls[0][1].method).toBe('DELETE');
                await waitFor(() => expectQueryInvalidation(queryClient, 'MembersResponseType', true));
            });
        });

        it('cancels a subscription at period end', async () => {
            const queryClient = createTestQueryClient();
            seedMemberCount(queryClient);

            await withMockFetch({json: {members: [{id: 'member-1'}]}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useEditMemberSubscription(), {queryClient});

                await act(async () => {
                    await result.current.mutateAsync({memberId: 'member-1', subscriptionId: 'sub_1', cancelAtPeriodEnd: true});
                });

                expect(mock.calls[0][0].toString()).toBe(`${apiRoot}/members/member-1/subscriptions/sub_1/`);
                expect(mock.calls[0][1].method).toBe('PUT');
                expect(JSON.parse(mock.calls[0][1].body)).toEqual({cancel_at_period_end: true});
                await waitFor(() => expectQueryInvalidation(queryClient, 'MembersResponseType', true));
            });
        });

        it('continues a subscription that was set to cancel', async () => {
            const queryClient = createTestQueryClient();
            seedMemberCount(queryClient);

            await withMockFetch({json: {members: [{id: 'member-1'}]}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useEditMemberSubscription(), {queryClient});

                await act(async () => {
                    await result.current.mutateAsync({memberId: 'member-1', subscriptionId: 'sub_1', cancelAtPeriodEnd: false});
                });

                expect(JSON.parse(mock.calls[0][1].body)).toEqual({cancel_at_period_end: false});
            });
        });

        it('immediately cancels a subscription for the complimentary flow', async () => {
            const queryClient = createTestQueryClient();
            seedMemberCount(queryClient);

            await withMockFetch({json: {members: [{id: 'member-1'}]}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useEditMemberSubscription(), {queryClient});

                await act(async () => {
                    await result.current.mutateAsync({memberId: 'member-1', subscriptionId: 'sub_1', status: 'canceled'});
                });

                expect(JSON.parse(mock.calls[0][1].body)).toEqual({status: 'canceled'});
            });
        });

        it('removes a member from the email suppression list', async () => {
            const queryClient = createTestQueryClient();
            seedMemberCount(queryClient);

            await withMockFetch({json: {}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useRemoveMemberEmailSuppression(), {queryClient});

                await act(async () => {
                    await result.current.mutateAsync({id: 'member-1'});
                });

                expect(mock.calls[0][0].toString()).toBe(`${apiRoot}/members/member-1/suppression/`);
                expect(mock.calls[0][1].method).toBe('DELETE');
                await waitFor(() => expectQueryInvalidation(queryClient, 'MembersResponseType', true));
            });
        });

        it('fetches a member activity feed filtered by member id', async () => {
            const queryClient = createQueryClientWithCurrentUser();
            const events: MemberActivityEvent[] = [
                {type: 'signup_event', data: {created_at: '2024-01-02T10:00:00.000Z'}}
            ];

            await withMockFetch({json: {events}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useMemberActivityFeed('member-1'), {queryClient});

                await waitFor(() => expect(result.current.isSuccess).toBe(true));

                const url = new URL(mock.calls[0][0].toString());
                expect(url.pathname).toBe('/ghost/api/admin/members/events/');
                expect(url.searchParams.get('filter')).toBe("data.member_id:'member-1'");
                expect(url.searchParams.get('limit')).toBe('20');
                expect(result.current.data?.events).toEqual(events);
                expect(result.current.data?.isEnd).toBe(true);
            });
        });

        it('advances the activity feed cursor from the last event', async () => {
            const queryClient = createQueryClientWithCurrentUser();
            // A full page (20 events) so another page is requested; cursor comes from the last one.
            const events: MemberActivityEvent[] = Array.from({length: 20}, (_, i) => ({
                type: 'signup_event',
                data: {created_at: `2024-01-02T10:00:${String(i).padStart(2, '0')}.000Z`}
            }));

            await withMockFetch({json: {events}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useMemberActivityFeed('member-1'), {queryClient});

                await waitFor(() => expect(result.current.isSuccess).toBe(true));
                expect(result.current.hasNextPage).toBe(true);

                await act(async () => {
                    await result.current.fetchNextPage();
                });

                const nextUrl = new URL(mock.calls[1][0].toString());
                expect(nextUrl.searchParams.get('filter')).toBe("data.created_at:<'2024-01-02 10:00:19'+data.member_id:'member-1'");
            });
        });
    });
});
