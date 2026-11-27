import { useEffect } from 'react';
import { toast } from 'sonner';

// Carries a confirmation across the reload that follows a session change.
const AUTH_NOTICE_KEY = 'ghost-admin:auth-notice';

const NOTICES = {
  'password-updated': 'Password updated',
} as const;

type AuthNotice = keyof typeof NOTICES;

const isAuthNotice = (value: string | null): value is AuthNotice =>
  value !== null && Object.hasOwn(NOTICES, value);

export function leaveAuthNotice(notice: AuthNotice): void {
  try {
    window.sessionStorage.setItem(AUTH_NOTICE_KEY, notice);
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
      const notice = window.sessionStorage.getItem(AUTH_NOTICE_KEY);
      window.sessionStorage.removeItem(AUTH_NOTICE_KEY);
      if (isAuthNotice(notice)) {
        toast.info(NOTICES[notice]);
      }
    } catch {
      // Nothing was left behind.
    }
  }, [enabled]);
}
