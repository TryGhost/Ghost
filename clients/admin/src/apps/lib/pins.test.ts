import { describe, expect, it } from 'vitest';
import { resolvePinnedApps, setAppPinned } from './pins';

describe('resolvePinnedApps', () => {
  it('pins the first three apps in install order while nothing is decided', () => {
    expect(resolvePinnedApps(['a', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c']);
  });

  it('puts the apps the user pinned first, in the order they pinned them', () => {
    expect(resolvePinnedApps(['a', 'b', 'c'], { pinned: ['c', 'b'], unpinned: [] })).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  it('leaves out the apps the user unpinned', () => {
    expect(resolvePinnedApps(['a', 'b', 'c'], { pinned: [], unpinned: ['a'] })).toEqual(['b', 'c']);
  });

  it('pins a new app while there is room', () => {
    const pins = { pinned: ['a'], unpinned: ['b'] };
    expect(resolvePinnedApps(['a', 'b', 'c'], pins)).toEqual(['a', 'c']);
  });

  it('drops apps that are no longer installed', () => {
    expect(resolvePinnedApps(['b'], { pinned: ['a', 'b'], unpinned: ['c'] })).toEqual(['b']);
  });

  it('never has more than three, even if more were saved', () => {
    const pins = { pinned: ['a', 'b', 'c', 'd'], unpinned: [] };
    expect(resolvePinnedApps(['a', 'b', 'c', 'd'], pins)).toEqual(['a', 'b', 'c']);
  });

  it('ignores ids saved twice', () => {
    expect(resolvePinnedApps(['a', 'b'], { pinned: ['a', 'a'], unpinned: [] })).toEqual(['a', 'b']);
  });
});

describe('setAppPinned', () => {
  it('records every installed app as pinned or unpinned', () => {
    expect(setAppPinned(['a', 'b', 'c', 'd'], undefined, 'b', false)).toEqual({
      pinned: ['a', 'c'],
      unpinned: ['b', 'd'],
    });
  });

  it('keeps the gap an unpin leaves, rather than moving an untouched app into it', () => {
    const installed = ['a', 'b', 'c', 'd'];
    const pins = setAppPinned(installed, undefined, 'a', false);
    expect(resolvePinnedApps(installed, pins)).toEqual(['b', 'c']);
  });

  it('adds a pinned app at the end', () => {
    const pins = setAppPinned(
      ['a', 'b', 'c', 'd'],
      { pinned: ['c'], unpinned: ['a', 'b', 'd'] },
      'a',
      true,
    );
    expect(pins.pinned).toEqual(['c', 'a']);
  });

  it('changes nothing when there is no room', () => {
    expect(setAppPinned(['a', 'b', 'c', 'd'], undefined, 'd', true)).toEqual({
      pinned: ['a', 'b', 'c'],
      unpinned: ['d'],
    });
  });

  it('drops apps that are no longer installed', () => {
    expect(setAppPinned(['b'], { pinned: ['a'], unpinned: ['c'] }, 'b', false)).toEqual({
      pinned: [],
      unpinned: ['b'],
    });
  });
});
