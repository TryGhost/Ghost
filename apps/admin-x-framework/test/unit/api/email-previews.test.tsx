import {waitFor} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {getPostEmailPreview} from '../../../src/api/email-previews';
import type {EmailPreviewResponseType} from '../../../src/api/email-previews';
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

describe('email previews api', () => {
    it('requests the post email preview with memberSegment and newsletter params', async () => {
        const response: EmailPreviewResponseType = {
            email_previews: [{html: '<html><body>Hi</body></html>', plaintext: 'Hi', subject: 'Test subject'}]
        };

        await withMockFetch({json: response}, async (mock) => {
            const {result} = renderHookWithProviders(() => getPostEmailPreview('post-1', {
                searchParams: {memberSegment: 'status:free', newsletter: 'default-newsletter'}
            }), {queryClient: createQueryClientWithCurrentUser()});

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            const url = new URL(mock.calls[0][0] as string);
            expect(url.pathname).toBe('/ghost/api/admin/email_previews/posts/post-1/');
            expect(url.searchParams.get('memberSegment')).toBe('status:free');
            expect(url.searchParams.get('newsletter')).toBe('default-newsletter');
            expect((mock.calls[0][1] as RequestInit).method).toBe('GET');
            expect(result.current.data).toEqual(response);
        });
    });

    it('requests without search params when none are provided', async () => {
        const response: EmailPreviewResponseType = {email_previews: [{html: '<html></html>', subject: 'Subject'}]};

        await withMockFetch({json: response}, async (mock) => {
            const {result} = renderHookWithProviders(() => getPostEmailPreview('post-1'), {
                queryClient: createQueryClientWithCurrentUser()
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            const url = new URL(mock.calls[0][0] as string);
            expect(url.pathname).toBe('/ghost/api/admin/email_previews/posts/post-1/');
            expect(url.search).toBe('');
        });
    });
});
