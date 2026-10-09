import { describe, expect, it, vi } from 'vitest';
import { appearanceItems } from './actions-source';

const titles = (...args: Parameters<typeof appearanceItems>) =>
  appearanceItems(...args).map(({ title }) => title);

describe('appearanceItems', () => {
  const setTheme = () => Promise.resolve();

  it.each([
    ['light', 'light', ['Switch to dark mode', 'Use system appearance']],
    ['dark', 'dark', ['Switch to light mode', 'Use system appearance']],
    ['system', 'light', ['Switch to dark mode']],
    ['system', 'dark', ['Switch to light mode']],
  ] as const)(
    'offers the opposite of what shows for %s on a %s screen',
    (theme, resolved, expected) => {
      expect(titles(theme, resolved, setTheme)).toEqual(expected);
    },
  );

  it('runs the matching appearance', async () => {
    const set = vi.fn(() => Promise.resolve());
    const [toDark, toSystem] = appearanceItems('light', 'light', set);

    for (const item of [toDark, toSystem]) {
      if (item.kind === 'action') {
        await item.run();
      }
    }

    expect(set.mock.calls).toEqual([['dark'], ['system']]);
  });
});
