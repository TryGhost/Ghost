import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminThemeController } from '../../../src/utils/admin-theme';

const controllers: ReturnType<typeof createAdminThemeController>[] = [];
const frames = new Map<number, FrameRequestCallback>();

function controller(onChange?: (theme: 'light' | 'dark') => void) {
  const instance = createAdminThemeController(onChange);
  controllers.push(instance);
  return instance;
}

function systemPreference(dark = false) {
  const query = Object.assign(new EventTarget(), { matches: dark }) as MediaQueryList;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  );
  return {
    query,
    change(matches: boolean) {
      Object.defineProperty(query, 'matches', { value: matches, configurable: true });
      query.dispatchEvent(Object.assign(new Event('change'), { matches }));
    },
  };
}

beforeEach(() => {
  let nextFrame = 1;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = nextFrame;
    nextFrame += 1;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id);
  });
});

afterEach(() => {
  controllers.splice(0).forEach((instance) => instance.destroy());
  frames.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.classList.remove('dark', 'theme-switching');
});

describe('Admin theme controller', () => {
  it('suppresses transitions until the new theme has painted', () => {
    const instance = controller();
    instance.setTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('theme-switching')).toBe(true);
    while (frames.size) {
      const entry = frames.entries().next().value;
      if (entry) {
        frames.delete(entry[0]);
        entry[1](0);
      }
    }
    expect(document.documentElement.classList.contains('theme-switching')).toBe(false);
  });

  it('leaves transitions alone when the theme is already applied', () => {
    const onChange = vi.fn();
    const instance = controller(onChange);
    instance.setTheme('light');
    expect(onChange).toHaveBeenLastCalledWith('light');
    expect(document.documentElement.classList.contains('theme-switching')).toBe(false);
    expect(frames.size).toBe(0);
  });

  it('follows system appearance and stops listening for an explicit choice', () => {
    const { query, change } = systemPreference(true);
    const removeListener = vi.spyOn(query, 'removeEventListener');
    const onChange = vi.fn();
    const instance = controller(onChange);
    instance.setTheme('system');
    expect(onChange).toHaveBeenLastCalledWith('dark');
    change(false);
    expect(onChange).toHaveBeenLastCalledWith('light');
    instance.setTheme('light');
    expect(removeListener).toHaveBeenCalledOnce();
    change(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('releases the system listener on destruction', () => {
    const { query, change } = systemPreference(true);
    const removeListener = vi.spyOn(query, 'removeEventListener');
    const instance = controller();
    instance.setTheme('system');
    instance.destroy();
    change(false);
    expect(removeListener).toHaveBeenCalledOnce();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
