import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorResource } from './koenig-loader';

const fetchKoenigLexical = vi.hoisted(() => vi.fn<() => Promise<unknown>>());

vi.mock('@/utils/fetch-koenig-lexical', () => ({ fetchKoenigLexical }));

const importLoader = () => import('./koenig-loader');

/** Drives the resource past its pending state by awaiting the promise Suspense would throw. */
const settle = async (resource: EditorResource) => {
  try {
    resource.read();
  } catch (thrown) {
    if (!(thrown instanceof Promise)) {
      throw thrown;
    }
    await thrown;
  }
};

describe('loadKoenig', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchKoenigLexical.mockReset();
  });

  it('hands every caller the same resource and fetches once', async () => {
    const koenig = { KoenigComposer: () => null };
    fetchKoenigLexical.mockResolvedValue(koenig);

    const { loadKoenig } = await importLoader();
    const first = loadKoenig();
    const second = loadKoenig();

    expect(second).toBe(first);
    expect(fetchKoenigLexical).toHaveBeenCalledTimes(1);

    await settle(first);
    expect(second.read()).toBe(koenig);
  });

  it('retries after a failed load instead of replaying the error', async () => {
    const koenig = { KoenigComposer: () => null };
    fetchKoenigLexical.mockRejectedValueOnce(new Error('offline'));
    fetchKoenigLexical.mockResolvedValueOnce(koenig);

    const { loadKoenig } = await importLoader();
    const failed = loadKoenig();
    await settle(failed);

    expect(() => failed.read()).toThrow('offline');

    const retried = loadKoenig();
    expect(retried).not.toBe(failed);

    await settle(retried);
    expect(retried.read()).toBe(koenig);
    expect(fetchKoenigLexical).toHaveBeenCalledTimes(2);
  });
});
