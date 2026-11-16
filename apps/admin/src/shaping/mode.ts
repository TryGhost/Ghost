import { clearDb } from './db';

// Whether the mocks are on, remembered in this browser. Every change reloads
// the page, because the mocks are wired in before Admin starts.
//
// Not a URL parameter: Admin's dev server only serves Admin at exactly
// `/ghost/` (its screens live after the `#`), so `/ghost/?mock=off` is handed
// to Ghost itself, which has no built Admin in development and errors.

const MODE_KEY = 'shaping.mock.mode';

export type MockMode = 'on' | 'off';

export const readMode = (): MockMode => {
  try {
    return localStorage.getItem(MODE_KEY) === 'off' ? 'off' : 'on';
  } catch {
    return 'on';
  }
};

export const switchMocks = (mode: MockMode) => {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Storage blocked: the reload keeps the current mode.
  }
  window.location.reload();
};

// Throw away edits; the reload reseeds the demo data.
export const resetMockData = () => {
  clearDb();
  switchMocks('on');
};

// A faked Stripe connection (see handlers.ts). Off by default: the site's real
// Stripe setting applies.
const STRIPE_KEY = 'shaping.mock.stripe';

export const readFakeStripe = (): boolean => {
  try {
    return localStorage.getItem(STRIPE_KEY) === 'on';
  } catch {
    return false;
  }
};

export const switchFakeStripe = (on: boolean) => {
  try {
    localStorage.setItem(STRIPE_KEY, on ? 'on' : 'off');
  } catch {
    // Storage blocked: the reload keeps the current setting.
  }
  window.location.reload();
};

// Faked email tracking settings (Settings → Analytics: Email opens / Email
// clicks). On by default; see handlers.ts.
export type TrackingSetting = 'opens' | 'clicks';
const trackingKey = (setting: TrackingSetting) => `shaping.mock.track.${setting}`;

export const readFakeTracking = (setting: TrackingSetting): boolean => {
  try {
    return localStorage.getItem(trackingKey(setting)) !== 'off';
  } catch {
    return true;
  }
};

export const switchFakeTracking = (setting: TrackingSetting, on: boolean) => {
  try {
    localStorage.setItem(trackingKey(setting), on ? 'on' : 'off');
  } catch {
    // Storage blocked: the reload keeps the current setting.
  }
  window.location.reload();
};
