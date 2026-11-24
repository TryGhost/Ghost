import { useSyncExternalStore } from 'react';
import { BACKUP_CODES } from './fake';
import { type ProviderId } from './sso/providers';

/**
 * The whole prototype's state. It stands in for the server: nothing is saved
 * anywhere except `localStorage`, so a refresh mid-demo keeps the scenario.
 *
 * This is a small external store rather than a React context, so it needs no
 * provider in the app tree (one less hook into existing files).
 */
export interface DemoState {
  /** Who is "signed in" in the demo. Changes copy, not real permissions. */
  viewerRole: 'Owner' | 'Administrator';
  plan: 'includes-sso' | 'no-sso';
  sso: {
    status: 'off' | 'connected' | 'failing';
    provider: ProviderId;
    domains: string[];
    /** Domains whose DNS verification record was found. SSO covers only these. */
    verifiedDomains: string[];
    /** The next "Check domains" result. A miss applies once, like the connection test. */
    nextDomainCheck: 'found' | 'missing';
    required: boolean;
    nextTestResult: 'pass' | 'bad-secret' | 'unreachable';
    provisioning: 'invite-only' | 'auto-join';
    autoJoinRole: 'Contributor' | 'Author' | 'Editor';
  };
  /** What the prototype shows. Presets keep these as they are. */
  ui: {
    /** The dashed "Prototype option" box under Single sign-on. */
    showJoinOption: boolean;
  };
  /** Site-wide rules in Settings > Security. */
  policy: {
    /** Everyone not on SSO must use an authenticator app. */
    requireTwoStep: boolean;
    /** Stands in for Ghost's existing "require email 2FA codes" setting. */
    emailCodeEverySignin: boolean;
  };
  twoFactor: {
    /** For the demo user (yourself). */
    method: 'email' | 'app';
    /** The backup codes still unused. Their count is "n of 10 left". */
    backupCodes: string[];
    /** ISO date the authenticator app was added. */
    addedAt: string | null;
    /** Other staff whose two-step verification an Administrator reset. */
    resetUserIds: string[];
  };
  signinScenario: {
    providerOutcome: 'success' | 'rejected' | 'unreachable';
    /** false shows "You don't have access yet" on the SSO flow. */
    hasStaffAccount: boolean;
    /** Signing in on a device Ghost hasn't seen. Without two-step, only then is a code emailed. */
    newDevice: boolean;
    /** Wrong codes in a row on the sign-in demo, since the last pause. */
    failedCodes: number;
    /** When the current sign-in pause ends (ms since epoch), or null. */
    pausedUntil: number | null;
    /** Pauses so far. Each one is twice as long as the last. */
    pauses: number;
  };
}

export type PresetId =
  | 'fresh'
  | 'sso-connected'
  | 'sso-required'
  | 'okta-failing'
  | 'authenticator-on'
  | 'codes-low'
  | 'two-step-required'
  | 'no-sso-plan';

const FRESH: DemoState = {
  viewerRole: 'Owner',
  plan: 'includes-sso',
  sso: {
    status: 'off',
    provider: 'okta',
    domains: ['acme.com', 'acme.co.uk'],
    verifiedDomains: [],
    nextDomainCheck: 'found',
    required: false,
    nextTestResult: 'pass',
    provisioning: 'invite-only',
    autoJoinRole: 'Contributor',
  },
  ui: {
    showJoinOption: false,
  },
  policy: {
    requireTwoStep: false,
    emailCodeEverySignin: false,
  },
  twoFactor: {
    method: 'email',
    backupCodes: [...BACKUP_CODES],
    addedAt: null,
    resetUserIds: [],
  },
  signinScenario: {
    providerOutcome: 'success',
    hasStaffAccount: true,
    newDevice: true,
    failedCodes: 0,
    pausedUntil: null,
    pauses: 0,
  },
};

const today = () => new Date().toISOString();

/** SSO set up, with its domains already verified. */
const connected = (patch: Partial<DemoState['sso']> = {}): DemoState['sso'] => ({
  ...FRESH.sso,
  status: 'connected',
  verifiedDomains: [...FRESH.sso.domains],
  ...patch,
});

export const PRESETS: { id: PresetId; label: string; build: () => DemoState }[] = [
  { id: 'fresh', label: 'Fresh site', build: () => FRESH },
  {
    id: 'sso-connected',
    label: 'SSO connected',
    build: () => ({ ...FRESH, sso: connected() }),
  },
  {
    id: 'sso-required',
    label: 'SSO required',
    build: () => ({ ...FRESH, sso: connected({ required: true }) }),
  },
  {
    id: 'okta-failing',
    label: 'Okta failing',
    build: () => ({ ...FRESH, sso: connected({ status: 'failing', required: true }) }),
  },
  {
    id: 'authenticator-on',
    label: 'Authenticator on',
    build: () => ({
      ...FRESH,
      twoFactor: { ...FRESH.twoFactor, method: 'app', addedAt: today() },
    }),
  },
  {
    id: 'codes-low',
    label: 'Codes running low',
    build: () => ({
      ...FRESH,
      twoFactor: {
        ...FRESH.twoFactor,
        method: 'app',
        backupCodes: BACKUP_CODES.slice(8),
        addedAt: today(),
      },
    }),
  },
  {
    id: 'two-step-required',
    label: 'Two-step required',
    build: () => ({ ...FRESH, policy: { ...FRESH.policy, requireTwoStep: true } }),
  },
  { id: 'no-sso-plan', label: 'No SSO on plan', build: () => ({ ...FRESH, plan: 'no-sso' }) },
];

const STORAGE_KEY = 'ghost-auth-prototype-state';
const listeners = new Set<() => void>();

/** Merge stored state onto the defaults, so an older saved shape still loads. */
function load(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return FRESH;
    }
    const saved = JSON.parse(raw) as Partial<DemoState>;
    return {
      ...FRESH,
      ...saved,
      sso: { ...FRESH.sso, ...saved.sso },
      ui: { ...FRESH.ui, ...saved.ui },
      policy: { ...FRESH.policy, ...saved.policy },
      twoFactor: { ...FRESH.twoFactor, ...saved.twoFactor },
      signinScenario: { ...FRESH.signinScenario, ...saved.signinScenario },
    };
  } catch {
    return FRESH;
  }
}

let state: DemoState = typeof window === 'undefined' ? FRESH : load();

function save() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: state lasts until the page reloads.
  }
}

export function getDemoState(): DemoState {
  return state;
}

export function setDemoState(next: DemoState | ((current: DemoState) => DemoState)) {
  state = typeof next === 'function' ? next(state) : next;
  save();
  listeners.forEach((listener) => listener());
}

export function updateSso(patch: Partial<DemoState['sso']>) {
  setDemoState((current) => ({ ...current, sso: { ...current.sso, ...patch } }));
}

export function updateUi(patch: Partial<DemoState['ui']>) {
  setDemoState((current) => ({ ...current, ui: { ...current.ui, ...patch } }));
}

export function updatePolicy(patch: Partial<DemoState['policy']>) {
  setDemoState((current) => ({ ...current, policy: { ...current.policy, ...patch } }));
}

export function updateTwoFactor(patch: Partial<DemoState['twoFactor']>) {
  setDemoState((current) => ({ ...current, twoFactor: { ...current.twoFactor, ...patch } }));
}

export function updateSignin(patch: Partial<DemoState['signinScenario']>) {
  setDemoState((current) => ({
    ...current,
    signinScenario: { ...current.signinScenario, ...patch },
  }));
}

export function applyPreset(id: PresetId) {
  const preset = PRESETS.find((candidate) => candidate.id === id) ?? PRESETS[0];
  setDemoState((current) => ({ ...preset.build(), ui: current.ui }));
}

export function resetDemo() {
  setDemoState(FRESH);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, getDemoState, () => FRESH);
}

/** True when SSO is set up, whether or not sign-ins are currently working. */
export function isSsoConfigured(sso: DemoState['sso']): boolean {
  return sso.status === 'connected' || sso.status === 'failing';
}
