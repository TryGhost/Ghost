import { describe, expect, it, vi } from 'vitest';
import { appearanceItem } from './actions-source';

describe('appearanceItem', () => {
  it.each([
    ['light', 'Switch to dark mode', 'dark'],
    ['dark', 'Switch to light mode', 'light'],
  ] as const)('on a %s screen offers %j', async (resolved, title, mode) => {
    const setTheme = vi.fn(() => Promise.resolve());
    const item = appearanceItem(resolved, setTheme);

    expect(item).toMatchObject({ kind: 'action', title });
    expect(item.keywords).toContain('toggle');
    if (item.kind === 'action') {
      await item.run();
    }
    expect(setTheme).toHaveBeenCalledWith(mode);
  });
});
