export type AdminThemeMode = 'light' | 'dark' | 'system';
export type ResolvedAdminTheme = 'light' | 'dark';

/** Optional compatibility effects for a shell with a separate dark stylesheet. */
export interface AdminThemeAdapter {
  preload: () => Promise<void>;
  apply: (theme: ResolvedAdminTheme) => void;
}

export function createAdminThemeController(onChange?: (theme: ResolvedAdminTheme) => void) {
  let mode: AdminThemeMode = 'light';
  let hasTheme = false;
  let adapter: AdminThemeAdapter | undefined;
  let preloadPromise: Promise<void> | undefined;
  let prepared = true;
  let revision = 0;
  let disposed = false;
  let removeSystemListener: (() => void) | undefined;
  let releaseFrame: number | undefined;
  let systemIsDark = false;

  function apply(theme: ResolvedAdminTheme) {
    const html = document.documentElement;
    const isChange = html.classList.contains('dark') !== (theme === 'dark');
    // Without a theme change there are no transitions to hold back, and
    // toggling a class on <html> restyles every element in the document.
    if (!isChange && !adapter) {
      onChange?.(theme);
      return;
    }
    html.classList.add('theme-switching');
    html.classList.toggle('dark', theme === 'dark');
    adapter?.apply(theme);
    onChange?.(theme);

    if (releaseFrame !== undefined) {
      cancelAnimationFrame(releaseFrame);
    }
    // Paint the new theme before restoring hover/focus transitions.
    releaseFrame = requestAnimationFrame(() => {
      releaseFrame = requestAnimationFrame(() => {
        html.classList.remove('theme-switching');
        releaseFrame = undefined;
      });
    });
  }

  function resolveTheme(): ResolvedAdminTheme {
    return mode === 'system' ? (systemIsDark ? 'dark' : 'light') : mode;
  }

  function preload(): Promise<void> {
    if (!adapter) {
      return Promise.resolve();
    }
    preloadPromise ??= adapter.preload().catch((error: unknown) => {
      preloadPromise = undefined;
      throw error;
    });
    return preloadPromise;
  }

  async function setTheme(nextMode: AdminThemeMode): Promise<void> {
    if (disposed) {
      return;
    }
    hasTheme = true;
    mode = nextMode;
    revision += 1;
    const currentRevision = revision;
    removeSystemListener?.();
    removeSystemListener = undefined;

    if (mode === 'system' && typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-color-scheme: dark)');
      systemIsDark = query.matches;
      const handleChange = (event: MediaQueryListEvent) => {
        systemIsDark = event.matches;
        if (prepared && !disposed && currentRevision === revision) {
          apply(resolveTheme());
        }
      };
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', handleChange);
        removeSystemListener = () => query.removeEventListener('change', handleChange);
      } else {
        query.addListener(handleChange);
        removeSystemListener = () => query.removeListener(handleChange);
      }
    }

    if (prepared) {
      apply(resolveTheme());
      return;
    }

    await preload();
    if (!disposed && currentRevision === revision) {
      prepared = true;
      // A system change or newer preference may arrive while styles load.
      apply(resolveTheme());
    }
  }

  return {
    preload,
    setTheme,
    setAdapter(nextAdapter: AdminThemeAdapter): Promise<void> {
      adapter = nextAdapter;
      preloadPromise = undefined;
      prepared = false;
      return hasTheme ? setTheme(mode) : Promise.resolve();
    },
    destroy() {
      disposed = true;
      revision += 1;
      removeSystemListener?.();
      if (releaseFrame !== undefined) {
        cancelAnimationFrame(releaseFrame);
        document.documentElement.classList.remove('theme-switching');
      }
    },
  };
}
