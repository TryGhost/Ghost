import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, reloadAfterChunkLoadError } from './chunk-load-recovery';

const { reloadAdmin } = vi.hoisted(() => ({ reloadAdmin: vi.fn() }));

vi.mock('@/auth/api', () => ({ reloadAdmin }));

const chunkError = () =>
  new TypeError(
    'Failed to fetch dynamically imported module: https://assets.ghost.io/admin/abc/assets/posts-route-CcVF6TSP.js',
  );
const route = { pathname: '/posts', search: '?type=draft' };

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://assets.ghost.io/admin/abc/assets/posts-route.js',
    'error loading dynamically imported module: https://assets.ghost.io/admin/abc/assets/signin.js',
    'Importing a module script failed.',
    'Unable to preload CSS for /admin/assets/editor-screen.css',
  ])('recognises "%s"', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it('leaves other errors alone', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch'))).toBe(false);
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError('Importing a module script failed.')).toBe(false);
  });
});

describe('reloadAfterChunkLoadError', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    reloadAdmin.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('reloads the admin at the route once the error has been handled', () => {
    expect(reloadAfterChunkLoadError(chunkError(), route)).toBe(true);
    expect(reloadAdmin).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(reloadAdmin.mock.calls).toEqual([['/posts?type=draft']]);
  });

  it('leaves the failure on screen when it reloaded for one less than a minute ago', () => {
    reloadAfterChunkLoadError(chunkError(), route);
    vi.advanceTimersByTime(59 * 1000);

    expect(reloadAfterChunkLoadError(chunkError(), route)).toBe(false);
    vi.runAllTimers();
    expect(reloadAdmin).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);

    expect(reloadAfterChunkLoadError(chunkError(), route)).toBe(true);
    vi.runAllTimers();
    expect(reloadAdmin).toHaveBeenCalledTimes(2);
  });

  it('reloads when the clock has moved back since the last reload', () => {
    sessionStorage.setItem('ghost-admin-chunk-load-reload', String(Date.now() + 5 * 60 * 1000));

    expect(reloadAfterChunkLoadError(chunkError(), route)).toBe(true);
  });

  it('does not reload while offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    expect(reloadAfterChunkLoadError(chunkError(), route)).toBe(false);
    vi.runAllTimers();
    expect(reloadAdmin).not.toHaveBeenCalled();
  });

  it('does not reload when it cannot remember having reloaded', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    expect(reloadAfterChunkLoadError(chunkError(), route)).toBe(false);
    vi.runAllTimers();
    expect(reloadAdmin).not.toHaveBeenCalled();
  });

  it('does not reload for other errors', () => {
    expect(reloadAfterChunkLoadError(new Error('Route crashed'), route)).toBe(false);
    vi.runAllTimers();
    expect(reloadAdmin).not.toHaveBeenCalled();
  });
});
