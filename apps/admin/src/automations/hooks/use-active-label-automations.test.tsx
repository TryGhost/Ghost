import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { useActiveLabelAutomations } from './use-active-label-automations';

const { fetchApi } = vi.hoisted(() => ({ fetchApi: vi.fn() }));
vi.mock('@tryghost/admin-x-framework/hooks', () => ({
  useFeatureFlag: () => true,
  useFetchApi: () => fetchApi,
}));

function renderLookup(enabled: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  return renderHook(() => useActiveLabelAutomations({ enabled }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

const notFound = () => new APIError(new Response(null, { status: 404 }));
const summary = { id: 'a', name: 'Guide', status: 'active' };

beforeEach(() => fetchApi.mockReset());

describe('Active label automation lookup', () => {
  it('does not request automations until enabled', () => {
    const { result } = renderLookup(false);
    expect(result.current).toMatchObject({ data: [], isLoading: false, isError: false });
    expect(fetchApi).not.toHaveBeenCalled();
  });

  it('returns no references for an automation deleted after browse', async () => {
    fetchApi.mockResolvedValueOnce({ automations: [summary] }).mockRejectedValueOnce(notFound());
    const { result } = renderLookup(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({ data: [], isError: false });
  });

  it.each([404, 500])(
    'reports a %s lookup failure and retries with only active trigger references',
    async (status) => {
      fetchApi.mockRejectedValueOnce(new APIError(new Response(null, { status })));
      const { result } = renderLookup(true);
      await waitFor(() => expect(result.current.isError).toBe(true));

      fetchApi
        .mockResolvedValueOnce({
          automations: [summary, { id: 'inactive', name: 'Inactive', status: 'inactive' }],
        })
        .mockResolvedValueOnce({
          automations: [
            { ...summary, trigger_rules: [{ trigger_type: 'label_added', label_id: 'guide' }] },
          ],
        });
      await act(async () => {
        await result.current.retry();
      });
      await waitFor(() => expect(result.current.isError).toBe(false));
      expect(result.current.data).toEqual([{ id: 'a', name: 'Guide', labelIds: ['guide'] }]);
    },
  );

  it.each([
    {
      scenario: 'a non-string automation ID',
      stage: 'browse',
      response: { automations: [{ ...summary, id: 42 }] },
    },
    {
      scenario: 'an invalid automation status',
      stage: 'browse',
      response: { automations: [{ ...summary, status: null }] },
    },
    {
      scenario: 'missing trigger rules',
      stage: 'detail',
      response: { automations: [summary] },
    },
    {
      scenario: 'a missing label ID',
      stage: 'detail',
      response: { automations: [{ ...summary, trigger_rules: [{ trigger_type: 'label_added' }] }] },
    },
    {
      scenario: 'a non-string label ID',
      stage: 'detail',
      response: {
        automations: [
          { ...summary, trigger_rules: [{ trigger_type: 'label_added', label_id: 42 }] },
        ],
      },
    },
    {
      scenario: 'a null trigger rule',
      stage: 'detail',
      response: { automations: [{ ...summary, trigger_rules: [null] }] },
    },
  ])('reports $scenario as a lookup failure', async ({ stage, response }) => {
    if (stage === 'browse') {
      fetchApi.mockResolvedValueOnce(response);
    } else {
      fetchApi.mockResolvedValueOnce({ automations: [summary] }).mockResolvedValueOnce(response);
    }
    const { result } = renderLookup(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({ data: [], isError: true });
    if (stage === 'browse') {
      expect(fetchApi).toHaveBeenCalledTimes(1);
    }
  });
});
