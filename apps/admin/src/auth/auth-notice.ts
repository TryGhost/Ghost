import { useEffect } from 'react';
import { toast } from 'sonner';

// Carries a confirmation across the reload that follows a session change.
const AUTH_NOTICE_KEY = 'ghost-admin:auth-notice';

export function leaveAuthNotice(message: string): void {
  try {
    window.sessionStorage.setItem(AUTH_NOTICE_KEY, message);
  } catch {
    // Storage can be unavailable; the confirmation is then skipped.
  }
}

/** Shows a confirmation left before the last reload, once. */
export function useAuthNotice(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    try {
      const message = window.sessionStorage.getItem(AUTH_NOTICE_KEY);
      window.sessionStorage.removeItem(AUTH_NOTICE_KEY);
      if (message) {
        toast.info(message);
      }
    } catch {
      // Nothing was left behind.
    }
  }, [enabled]);
}
