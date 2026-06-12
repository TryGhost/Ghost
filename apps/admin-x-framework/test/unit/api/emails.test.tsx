import {waitFor} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {getEmail, getEmailAnalyticsStatus, getEmailBatches, getEmailRecipientFailures, useCancelScheduledEmailAnalytics, useScheduleEmailAnalytics} from '../../../src/api/emails';
import type {EmailAnalyticsStatusResponseType, EmailBatchesResponseType, EmailRecipientFailuresResponseType, EmailsResponseType} from '../../../src/api/emails';
import {currentUserQueryKey} from '../../../src/api/current-user';
import {createTestQueryClient, renderHookWithProviders} from '../../../src/test/test-utils';
import {withMockFetch} from '../../utils/mock-fetch';

// Queries subscribe to the current user (for permission checks), so seed it
// to keep the mocked fetch calls limited to the requests under test
function createQueryClientWithCurrentUser() {
    const queryClient = createTestQueryClient();

    queryClient.setQueryDefaults(currentUserQueryKey, {staleTime: Infinity});
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

describe('emails api', () => {
    it('reads a single email', async () => {
        const response: EmailsResponseType = {
            emails: [{id: 'email-1', status: 'submitted', email_count: 100}]
        };

        await withMockFetch({json: response}, async (mock) => {
            const {result} = renderHookWithProviders(() => getEmail('email-1'), {
                queryClient: createQueryClientWithCurrentUser()
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            const url = new URL(mock.calls[0][0] as string);
            expect(url.pathname).toBe('/ghost/api/admin/emails/email-1/');
            expect(result.current.data).toEqual(response);
        });
    });

    it('requests email batches with recipient counts', async () => {
        const response: EmailBatchesResponseType = {
            batches: [{id: 'batch-1', status: 'submitted', count: {recipients: 500}}]
        };

        await withMockFetch({json: response}, async (mock) => {
            const {result} = renderHookWithProviders(() => getEmailBatches('email-1'), {
                queryClient: createQueryClientWithCurrentUser()
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            const url = new URL(mock.calls[0][0] as string);
            expect(url.pathname).toBe('/ghost/api/admin/emails/email-1/batches/');
            expect(url.searchParams.get('include')).toBe('count.recipients');
            expect(url.searchParams.get('limit')).toBe('all');
            expect(url.searchParams.get('order')).toBe('status asc, created_at desc');
            expect(result.current.data).toEqual(response);
        });
    });

    it('requests recipient failures with member and email_recipient includes', async () => {
        const response: EmailRecipientFailuresResponseType = {
            failures: [{id: 'failure-1', severity: 'permanent', code: 550}]
        };

        await withMockFetch({json: response}, async (mock) => {
            const {result} = renderHookWithProviders(() => getEmailRecipientFailures('email-1'), {
                queryClient: createQueryClientWithCurrentUser()
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            const url = new URL(mock.calls[0][0] as string);
            expect(url.pathname).toBe('/ghost/api/admin/emails/email-1/recipient-failures/');
            expect(url.searchParams.get('include')).toBe('member,email_recipient');
            expect(url.searchParams.get('limit')).toBe('all');
            expect(result.current.data).toEqual(response);
        });
    });

    it('requests the analytics status', async () => {
        const response: EmailAnalyticsStatusResponseType = {
            latest: {running: false, lastStarted: '2024-01-01T00:00:00.000Z'},
            missing: null,
            scheduled: null
        };

        await withMockFetch({json: response}, async (mock) => {
            const {result} = renderHookWithProviders(() => getEmailAnalyticsStatus('email-1'), {
                queryClient: createQueryClientWithCurrentUser()
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            const url = new URL(mock.calls[0][0] as string);
            expect(url.pathname).toBe('/ghost/api/admin/emails/email-1/analytics/');
            expect(result.current.data).toEqual(response);
        });
    });

    it('schedules an analytics refetch with begin/end params', async () => {
        await withMockFetch({json: {}}, async (mock) => {
            const {result} = renderHookWithProviders(() => useScheduleEmailAnalytics(), {
                queryClient: createQueryClientWithCurrentUser()
            });

            await result.current.mutateAsync({
                id: 'email-1',
                begin: '2024-01-01T00:00:00.000Z',
                end: '2024-01-02T00:00:00.000Z'
            });

            const url = new URL(mock.calls[0][0] as string);
            expect(url.pathname).toBe('/ghost/api/admin/emails/email-1/analytics/');
            expect(url.searchParams.get('begin')).toBe('2024-01-01T00:00:00.000Z');
            expect(url.searchParams.get('end')).toBe('2024-01-02T00:00:00.000Z');
            expect((mock.calls[0][1] as RequestInit).method).toBe('PUT');
        });
    });

    it('schedules an analytics refetch without params when no range is given', async () => {
        await withMockFetch({json: {}}, async (mock) => {
            const {result} = renderHookWithProviders(() => useScheduleEmailAnalytics(), {
                queryClient: createQueryClientWithCurrentUser()
            });

            await result.current.mutateAsync({id: 'email-1'});

            const url = new URL(mock.calls[0][0] as string);
            expect(url.pathname).toBe('/ghost/api/admin/emails/email-1/analytics/');
            expect(url.search).toBe('');
        });
    });

    it('cancels the scheduled analytics refetch', async () => {
        await withMockFetch({json: {}}, async (mock) => {
            const {result} = renderHookWithProviders(() => useCancelScheduledEmailAnalytics(), {
                queryClient: createQueryClientWithCurrentUser()
            });

            await result.current.mutateAsync();

            const url = new URL(mock.calls[0][0] as string);
            expect(url.pathname).toBe('/ghost/api/admin/emails/analytics/');
            expect((mock.calls[0][1] as RequestInit).method).toBe('DELETE');
        });
    });
});
