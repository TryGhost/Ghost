import { renderHook, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { withMockFetch } from '../../utils/mock-fetch';
import { FrameworkProvider } from '../../../src/providers/framework-provider';

const fetchApiCalls = vi.hoisted(() => [] as { endpoint: unknown; options: RequestOptionsLike }[]);

interface RequestOptionsLike {
  sessionExpiryRedirect?: boolean;
}

// Wraps the real transport so requests still run, and records what each call asked for
vi.mock('../../../src/utils/api/fetch-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/utils/api/fetch-api')>();
  return {
    ...actual,
    useFetchApi: () => {
      const fetchApi = actual.useFetchApi();
      return (endpoint: unknown, options: RequestOptionsLike = {}) => {
        fetchApiCalls.push({ endpoint, options });
        return (fetchApi as (...args: unknown[]) => Promise<unknown>)(endpoint, options);
      };
    },
  };
});

import { getImageUrl, useUploadImage } from '../../../src/api/images';

const wrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
  <FrameworkProvider
    externalNavigate={() => {}}
    ghostVersion="5.x"
    sentryDSN=""
    unsplashConfig={{
      Authorization: '',
      'Accept-Version': '',
      'Content-Type': '',
      'App-Pragma': '',
      'X-Unsplash-Cache': true,
    }}
    onDelete={() => {}}
    onInvalidate={() => {}}
    onUpdate={() => {}}
  >
    {children}
  </FrameworkProvider>
);

describe('getImageUrl', () => {
  it.each(['https://example.com/image.png', '/content/images/image.png'])(
    'accepts an uploaded image URL (%s)',
    (url) => {
      expect(getImageUrl({ images: [{ url, ref: null }] })).toBe(url);
    },
  );

  it.each([
    null,
    {},
    { images: [] },
    { images: [{}] },
    { images: [{ url: 123 }] },
    { images: [{ url: true }] },
    { images: [{ url: '' }] },
  ])('rejects a malformed upload response (%j)', (response) => {
    expect(() => getImageUrl(response)).toThrow();
  });
});

describe('useUploadImage', () => {
  const uploaded = { images: [{ url: 'https://example.com/image.png', ref: null }] };

  const upload = async (payload: { file: File; sessionExpiryRedirect?: boolean }) => {
    fetchApiCalls.length = 0;
    await withMockFetch({ json: uploaded }, async () => {
      const { result } = renderHook(() => useUploadImage(), { wrapper });
      await waitFor(() => expect(result.current.mutateAsync).toBeTypeOf('function'));
      await result.current.mutateAsync(payload);
    });
    return fetchApiCalls[0]?.options;
  };

  it('keeps the session-expiry redirect when the caller asks for nothing', async () => {
    const options = await upload({ file: new File(['image'], 'hills.png') });

    expect(options?.sessionExpiryRedirect).toBeUndefined();
  });

  it('passes the session-expiry opt-out to the transport', async () => {
    const options = await upload({
      file: new File(['image'], 'hills.png'),
      sessionExpiryRedirect: false,
    });

    expect(options?.sessionExpiryRedirect).toBe(false);
  });
});
