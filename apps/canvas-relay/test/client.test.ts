import { afterEach, expect, it, vi } from 'vitest';
import { callRelay } from '../src/client.ts';

const connection = {
  serviceUrl: 'https://relay.example',
  tenant: 'alpha',
  session: '4940cd02-e9fd-4000-8000-432e84c088a5',
  token: 'private',
};
const call = {
  id: 'ba0ac528-e1ba-4d1f-8a7c-66ab0a2c1c5a',
  epoch: '07d8d7f0-0a72-4a1a-8b0d-796003cdf7e3',
  tool: 'ghost_canvas_edit',
  input: { context: {} },
};
afterEach(() => {
  vi.unstubAllGlobals();
});
it('never retries admission after a lost HTTP reply', async () => {
  const fetch = vi.fn().mockRejectedValue(new Error('Reply lost'));
  vi.stubGlobal('fetch', fetch);
  await expect(callRelay(connection, call)).rejects.toThrow('Reply lost');
  expect(fetch).toHaveBeenCalledOnce();
  expect(fetch.mock.calls[0]![1]).toMatchObject({
    method: 'POST',
    redirect: 'error',
    credentials: 'omit',
  });
  expect(JSON.parse(fetch.mock.calls[0]![1].body).id).toBe(call.id);
});
it('observes completion without resubmitting a dispatched edit', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ id: call.id, epoch: call.epoch, status: 'dispatched' }))
    .mockResolvedValueOnce(
      Response.json({
        id: call.id,
        epoch: call.epoch,
        status: 'completed',
        result: { status: 'ok', data: { revision: 'accepted' } },
      }),
    );
  vi.stubGlobal('fetch', fetch);
  expect(await callRelay(connection, call)).toMatchObject({
    status: 'completed',
    result: { data: { revision: 'accepted' } },
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1]![0]).toContain(`/calls/${call.id}`);
  expect(fetch.mock.calls[1]![1].method).toBeUndefined();
});
