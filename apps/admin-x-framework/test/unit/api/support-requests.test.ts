import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderHookWithProviders } from '../../../src/test/test-utils';
import { useSendSupportRequest } from '../../../src/api/support-requests';
import { withMockFetch } from '../../utils/mock-fetch';

describe('support requests api', () => {
  it('sends the request to the support requests endpoint in its resource shape', async () => {
    await withMockFetch({ status: 202 }, async (mock) => {
      const { result } = renderHookWithProviders(() => useSendSupportRequest());

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          subject: 'Cannot publish a post',
          message: 'Please help',
          source: 'docsbot',
          pageUrl: 'http://localhost:2368/ghost/#/posts',
          conversationUrl: null,
          transcript: '**User**\nI cannot publish a post',
        });
      });

      expect(mock.calls).toHaveLength(1);
      const [url, options] = mock.calls[0];
      expect(new URL(url).pathname).toBe('/ghost/api/admin/support_requests/');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({
        support_requests: [
          {
            name: 'Ada Lovelace',
            email: 'ada@example.com',
            subject: 'Cannot publish a post',
            message: 'Please help',
            source: 'docsbot',
            page_url: 'http://localhost:2368/ghost/#/posts',
            conversation_url: null,
            transcript: '**User**\nI cannot publish a post',
          },
        ],
      });
    });
  });
});
