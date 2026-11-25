import { importFiles } from '../../../../../utils/csv-import-files';
import assert from 'node:assert/strict';
import { DiskMediaCache } from '../../../../../../core/server/services/content-import/import/media-cache';
import {
  MediaInliningFailure,
  PostMediaInliner,
} from '../../../../../../core/server/services/content-import/import/media';
import type { PostData } from '../../../../../../core/server/services/content-import/import/post-data';

describe('CSV disk media cache', function () {
  const url = 'https://assets.example/photo.jpg?size=1';
  const stored = {
    status: 'stored' as const,
    sourceUrl: url,
    storedUrl: '/content/images/photo.jpg',
  };

  it('stores exact keys privately per run and removes them on close', async function () {
    const cache = new DiskMediaCache(importFiles);
    const other = new DiskMediaCache(importFiles);
    try {
      assert.equal(await cache.get(url), undefined);
      await cache.set(url, stored);
      assert.deepEqual(await cache.get(url), stored);
      assert.equal(await cache.get(url + '#different'), undefined);
      assert.equal(await other.get(url), undefined);
      await cache.close();
      assert.equal(await cache.get(url), undefined);
    } finally {
      await cache.close();
      await cache.close();
      await other.close();
    }
  });

  it('reuses stored results and failures without serializing transport errors', async function () {
    const failed = 'https://assets.example/missing.jpg';
    const transport = {
      get error(): never {
        throw new Error('private transport information');
      },
    };
    let requests = 0;
    const onStored = vi.fn(async () => {});
    const inliner = new PostMediaInliner({
      cache: new DiskMediaCache(importFiles),
      onStored,
      isLocalMediaUrl: () => false,
      media: {
        importUrl: async (sourceUrl) => {
          requests += 1;
          return sourceUrl === url
            ? stored
            : {
                status: 'failed',
                sourceUrl,
                reason: 'Missing file',
                stage: 'download',
                error: transport,
              };
        },
      },
    });
    try {
      for (const source of [url, failed, url, failed]) {
        const post = { feature_image: source } as PostData;
        if (source === failed) {
          await assert.rejects(
            inliner.inline(post),
            (error: unknown) =>
              error instanceof MediaInliningFailure && error.failures[0].reason === 'Missing file',
          );
        } else {
          await inliner.inline(post);
          assert.equal(post.feature_image, stored.storedUrl);
        }
      }
      assert.equal(requests, 2);
      expect(onStored).toHaveBeenCalledTimes(1);
    } finally {
      await inliner.close();
    }
  });

  it.each([new Error('Read failed'), { code: 'EACCES' }, 'Read failed', null])(
    'propagates non-missing cache read errors: %s',
    async function (failure) {
      const removeDirectory = vi.fn(async () => {});
      const cache = new DiskMediaCache({
        ...importFiles,
        createTempDirectory: async () => '/private/import-cache',
        readCache: async () => {
          throw failure;
        },
        removeDirectory,
      });
      await assert.rejects(cache.get(url), (error) => error === failure);
      await cache.close();
      expect(removeDirectory).toHaveBeenCalledExactlyOnceWith('/private/import-cache');
    },
  );

  it('does not create scratch files until used and retries failed cleanup', async function () {
    const failure = new Error('Cleanup failed');
    const createTempDirectory = vi.fn(async () => '/private/import-cache');
    const removeDirectory = vi.fn(async () => {}).mockRejectedValueOnce(failure);
    const writeCache = vi.fn(async () => {});
    const cache = new DiskMediaCache({
      ...importFiles,
      createTempDirectory,
      removeDirectory,
      writeCache,
    });
    await cache.close();
    expect(createTempDirectory).not.toHaveBeenCalled();
    await Promise.all([cache.set(url, stored), cache.set(url + '#other', stored)]);
    expect(createTempDirectory).toHaveBeenCalledExactlyOnceWith('csv-media-cache-');
    expect(writeCache).toHaveBeenCalledTimes(2);
    await assert.rejects(cache.close(), (error) => error === failure);
    await cache.close();
    await cache.close();
    expect(removeDirectory).toHaveBeenCalledTimes(2);
  });
});
