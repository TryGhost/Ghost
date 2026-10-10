import { MutationObserver, onlineManager } from '@tanstack/react-query';
import queryClient from '../../../src/utils/query-client';

describe('queryClient', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it('runs mutations while the browser reports offline', async () => {
    onlineManager.setOnline(false);
    const error = new TypeError('Network request failed');
    const observer = new MutationObserver(queryClient, {
      mutationFn: () => Promise.reject(error),
    });

    await expect(observer.mutate()).rejects.toBe(error);
  });
});
