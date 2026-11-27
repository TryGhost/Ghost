export type AdminThemeMode = 'light' | 'dark' | 'system';
export type ResolvedAdminTheme = 'light' | 'dark';

export function createAdminThemeController(onChange?: (theme: ResolvedAdminTheme) => void) {
  let mode: AdminThemeMode = 'light';
  let disposed = false;
  let removeSystemListener: (() => void) | undefined;
  let releaseFrame: number | undefined;
  let systemIsDark = false;

  function apply(theme: ResolvedAdminTheme) {
    const html = document.documentElement;
    const isChange = html.classList.contains('dark') !== (theme === 'dark');
    // Without a theme change there are no transitions to hold back, and
    // toggling a class on <html> restyles every element in the document.
    if (!isChange) {
      onChange?.(theme);
      return;
    }
    html.classList.add('theme-switching');
    html.classList.toggle('dark', theme === 'dark');
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

  function setTheme(nextMode: AdminThemeMode) {
    if (disposed) {
      return;
    }
    mode = nextMode;
    removeSystemListener?.();
    removeSystemListener = undefined;

    if (mode === 'system' && typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-color-scheme: dark)');
      systemIsDark = query.matches;
      const handleChange = (event: MediaQueryListEvent) => {
        systemIsDark = event.matches;
        apply(resolveTheme());
      };
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', handleChange);
        removeSystemListener = () => query.removeEventListener('change', handleChange);
      } else {
        query.addListener(handleChange);
        removeSystemListener = () => query.removeListener(handleChange);
      }
    }

    apply(resolveTheme());
  }

  return {
    setTheme,
    destroy() {
      disposed = true;
      removeSystemListener?.();
      if (releaseFrame !== undefined) {
        cancelAnimationFrame(releaseFrame);
        document.documentElement.classList.remove('theme-switching');
      }
    },
  };
}
