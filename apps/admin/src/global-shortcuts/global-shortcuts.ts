import { useEffect } from 'react';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { useAdminSidebarVisibility } from '@/layout/sidebar-visibility';
import { useIsEmberOwnedRoute } from '@/routes';
import { isMacPlatform } from '@/utils/is-mac-platform';

export type GlobalShortcut = 'openSettings' | 'save';

const SHORTCUT_KEYS: Record<string, GlobalShortcut> = { ',': 'openSettings', s: 'save' };
const SHORTCUT_CODES: Record<string, GlobalShortcut> = { Comma: 'openSettings', KeyS: 'save' };

/** The app-wide shortcut a keydown presses: Cmd on a Mac or Ctrl elsewhere, with no other modifier. */
export function globalShortcut(
  event: KeyboardEvent,
  isMac: boolean = isMacPlatform(),
): GlobalShortcut | null {
  const modifier = isMac ? event.metaKey : event.ctrlKey;
  const otherModifier = isMac ? event.ctrlKey : event.metaKey;

  if (!modifier || otherModifier || event.altKey || event.shiftKey || event.isComposing) {
    return null;
  }

  // autofill sends keydown events without a key
  const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
  // the physical key counts only when its layout types a non-ASCII character
  if (/^[ -~]$/.test(key)) {
    return SHORTCUT_KEYS[key] ?? null;
  }
  return SHORTCUT_CODES[event.code] ?? null;
}

/**
 * On the screens React shows, Cmd/Ctrl+, opens settings while the admin
 * sidebar shows, and Cmd/Ctrl+S never opens the browser's save dialog.
 */
export function useGlobalShortcuts(isSignedIn: boolean): void {
  const { pathname } = useLocation();
  const isEmberOwned = useIsEmberOwnedRoute(pathname);
  const canOpenSettings = useAdminSidebarVisibility() && isSignedIn;
  const navigate = useNavigate();

  useEffect(() => {
    if (isEmberOwned) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = globalShortcut(event);
      if (!shortcut) {
        return;
      }
      event.preventDefault();
      if (shortcut === 'openSettings' && canOpenSettings) {
        navigate('/settings');
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [canOpenSettings, isEmberOwned, navigate]);
}
