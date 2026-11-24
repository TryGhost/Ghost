import { DEMO_OWNER_FALLBACK, useOwnerEmail } from '@/auth-prototype/people';

const EMAIL_KEY = 'ghost-auth-prototype-signin-email';
export const STRIP_KEY = 'ghost-auth-prototype-strip-dismissed';

export function readSession(key: string): string {
  try {
    return window.sessionStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

export function writeSession(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the demo falls back to an empty email.
  }
}

/** The email being signed in with, carried between the demo screens. */
export function getDemoEmail(): string {
  return readSession(EMAIL_KEY);
}

export function setDemoEmail(email: string) {
  writeSession(EMAIL_KEY, email.trim().toLowerCase());
}

/** True for the site owner's email (the real owner, or the demo stand-in). */
export function useIsOwnerEmail(): (email: string) => boolean {
  const ownerEmail = useOwnerEmail();
  return (email) => {
    const normalized = email.trim().toLowerCase();
    return normalized === ownerEmail.toLowerCase() || normalized === DEMO_OWNER_FALLBACK;
  };
}
