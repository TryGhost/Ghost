import { describe, expect, it } from 'vitest';
import {
  getListReturnNavigationState,
  readListReturnState,
  rememberListReturnState,
} from './list-return-state';

describe('list breadcrumb state', () => {
  it('carries scroll and expanded rows across differently encoded return URLs', () => {
    rememberListReturnState('/members?search=hello%20world&filter=status%3Apaid', {
      scrollPosition: 4200,
    });
    rememberListReturnState('/members?filter=status%3Apaid&search=hello+world', {
      unlockedItemCount: 2000,
    });
    const usr = getListReturnNavigationState('/members/?filter=status%3Apaid&search=hello+world');
    expect(
      readListReturnState({ usr }, '/members?search=hello%20world&filter=status%3Apaid'),
    ).toEqual({ scrollPosition: 4200, unlockedItemCount: 2000 });
  });

  it('does not restore another filter or resource', () => {
    rememberListReturnState('/posts?tag=news', { scrollPosition: 500 });
    const usr = getListReturnNavigationState('/posts?tag=news');
    expect(readListReturnState({ usr }, '/posts')).toBeUndefined();
    expect(readListReturnState({ usr }, '/pages?tag=news')).toBeUndefined();
    expect(readListReturnState({}, '/posts?tag=news')).toBeUndefined();
  });

  it('snapshots the return state without modifying previously created entries', () => {
    rememberListReturnState('/posts?tag=snapshot', { scrollPosition: 500 });
    const usr = getListReturnNavigationState('/posts?tag=snapshot');
    rememberListReturnState('/posts?tag=snapshot', { scrollPosition: 1000 });
    expect(readListReturnState({ usr }, '/posts?tag=snapshot')?.scrollPosition).toBe(500);
  });

  it('ignores malformed history state', () => {
    expect(readListReturnState({ usr: { listReturn: null } }, '/posts')).toBeUndefined();
    expect(
      readListReturnState(
        { usr: { listReturn: { path: '/posts?', scrollPosition: NaN, unlockedItemCount: -1 } } },
        '/posts',
      ),
    ).toEqual({ scrollPosition: undefined, unlockedItemCount: undefined });
  });
});
