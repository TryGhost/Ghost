import { act, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderHookWithProviders } from '../../../src/test/test-utils';
import { useEmailPreview, useSendTestEmail } from '../../../src/api/email-previews';
import { withMockFetch } from '../../utils/mock-fetch';

const previewCall = (mock: any) =>
  mock.calls.find(([input]: [unknown]) => String(input).includes('/email_previews/'));

const requestBody = (mock: any) => JSON.parse(previewCall(mock)[1].body as string);

describe('email previews api', () => {
  it('reads an email preview with the full audience and newsletter params', async () => {
    await withMockFetch(
      {
        json: {
          email_previews: [{ html: '<p>Hi</p>', plaintext: 'Hi', subject: 'Hello' }],
          // the permissions gate fetches the current user through the same mock
          users: [{ id: 'user-1', roles: [] }],
        },
        headers: { 'content-type': 'application/json' },
      },
      async (mock) => {
        const { result } = renderHookWithProviders(() =>
          useEmailPreview('post-1', {
            memberStatus: 'paid',
            memberTier: 'gold',
            newsletter: 'weekly',
          }),
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const url = new URL(previewCall(mock)[0] as string);
        expect(url.pathname).toBe('/ghost/api/admin/email_previews/posts/post-1/');
        expect(Object.fromEntries(url.searchParams.entries())).toEqual({
          member_status: 'paid',
          member_tier: 'gold',
          newsletter: 'weekly',
        });
        expect(result.current.data?.email_previews[0].subject).toBe('Hello');
      },
    );
  });

  it('omits audience params that are not provided', async () => {
    await withMockFetch(
      {
        json: {
          email_previews: [{ html: '<p>Hi</p>', plaintext: 'Hi', subject: 'Hello' }],
          users: [{ id: 'user-1', roles: [] }],
        },
        headers: { 'content-type': 'application/json' },
      },
      async (mock) => {
        const { result } = renderHookWithProviders(() =>
          useEmailPreview('post-1', { memberStatus: 'free' }),
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const url = new URL(previewCall(mock)[0] as string);
        expect(Object.fromEntries(url.searchParams.entries())).toEqual({
          member_status: 'free',
        });
      },
    );
  });

  it('rejects an invalid email preview response', async () => {
    await withMockFetch(
      {
        json: {
          email_previews: null,
          users: [{ id: 'user-1', roles: [] }],
        },
        headers: { 'content-type': 'application/json' },
      },
      async () => {
        const { result } = renderHookWithProviders(() => useEmailPreview('post-1'));

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.data).toBeUndefined();
      },
    );
  });

  it('sends a test email with the audience and newsletter in the body', async () => {
    await withMockFetch({ status: 204 }, async (mock) => {
      const { result } = renderHookWithProviders(() => useSendTestEmail());

      await act(async () => {
        await result.current.mutateAsync({
          postId: 'post-1',
          emails: ['test@example.com'],
          memberStatus: 'paid',
          memberTier: 'gold',
          newsletter: 'weekly',
        });
      });

      const [url, options] = previewCall(mock);
      expect(new URL(url as string).pathname).toBe('/ghost/api/admin/email_previews/posts/post-1/');
      expect(options.method).toBe('POST');
      expect(requestBody(mock)).toEqual({
        emails: ['test@example.com'],
        newsletter: 'weekly',
        member_status: 'paid',
        member_tier: 'gold',
      });
    });
  });

  it('sends a test email with only the recipient when no audience is given', async () => {
    await withMockFetch({ status: 204 }, async (mock) => {
      const { result } = renderHookWithProviders(() => useSendTestEmail());

      await act(async () => {
        await result.current.mutateAsync({
          postId: 'post-1',
          emails: ['test@example.com'],
        });
      });

      expect(requestBody(mock)).toEqual({ emails: ['test@example.com'] });
    });
  });
});
