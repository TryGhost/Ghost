import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminThemeController } from '../../../src/utils/admin-theme';

const controllers: ReturnType<typeof createAdminThemeController>[] = [];
const frames = new Map<number, FrameRequestCallback>();

function controller(onChange?: (theme: 'light' | 'dark') => void) {
  const instance = createAdminThemeController(onChange);
  controllers.push(instance);
  return instance;
}

function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
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
  it('suppresses transitions until the new theme has painted', async () => {
    const instance = controller();
    await instance.setTheme('dark');
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

  it('leaves transitions alone when the theme is already applied', async () => {
    const onChange = vi.fn();
    const instance = controller(onChange);
    await instance.setTheme('light');
    expect(onChange).toHaveBeenLastCalledWith('light');
    expect(document.documentElement.classList.contains('theme-switching')).toBe(false);
    expect(frames.size).toBe(0);
  });

  it('follows system appearance and stops listening for an explicit choice', async () => {
    const { query, change } = systemPreference(true);
    const removeListener = vi.spyOn(query, 'removeEventListener');
    const onChange = vi.fn();
    const instance = controller(onChange);
    await instance.setTheme('system');
    expect(onChange).toHaveBeenLastCalledWith('dark');
    change(false);
    expect(onChange).toHaveBeenLastCalledWith('light');
    await instance.setTheme('light');
    expect(removeListener).toHaveBeenCalledOnce();
    change(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('uses the latest system appearance while a stylesheet is loading', async () => {
    const { change } = systemPreference(false);
    const load = deferred();
    const apply = vi.fn();
    const instance = controller();
    const attaching = instance.setAdapter({ preload: () => load.promise, apply });
    const switching = instance.setTheme('system');
    change(true);
    expect(apply).not.toHaveBeenCalled();
    load.resolve();
    await Promise.all([attaching, switching]);
    expect(apply).toHaveBeenCalledExactlyOnceWith('dark');
  });

  it('does not let an earlier stylesheet completion overwrite a newer choice', async () => {
    const load = deferred();
    const apply = vi.fn();
    const instance = controller();
    const attaching = instance.setAdapter({ preload: () => load.promise, apply });
    const dark = instance.setTheme('dark');
    const light = instance.setTheme('light');
    load.resolve();
    await Promise.all([attaching, dark, light]);
    expect(apply).toHaveBeenCalledExactlyOnceWith('light');
  });

  it('cannot apply pending styles after handing ownership to another shell', async () => {
    const load = deferred();
    const apply = vi.fn();
    const previous = controller();
    await previous.setTheme('light');
    const attaching = previous.setAdapter({ preload: () => load.promise, apply });
    previous.destroy();
    await controller().setTheme('dark');
    load.resolve();
    await attaching;
    expect(apply).not.toHaveBeenCalled();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('retains the previous appearance on a load failure and allows a retry', async () => {
    const preload = vi
      .fn()
      .mockRejectedValueOnce(new Error('load failed'))
      .mockResolvedValue(undefined);
    const apply = vi.fn();
    const instance = controller();
    await instance.setTheme('light');
    await expect(instance.setAdapter({ preload, apply })).rejects.toThrow('load failed');
    expect(apply).not.toHaveBeenCalled();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    await instance.setTheme('dark');
    expect(apply).toHaveBeenCalledExactlyOnceWith('dark');
  });

  it('releases the system listener on destruction', async () => {
    const { query, change } = systemPreference(true);
    const removeListener = vi.spyOn(query, 'removeEventListener');
    const instance = controller();
    await instance.setTheme('system');
    instance.destroy();
    change(false);
    expect(removeListener).toHaveBeenCalledOnce();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
