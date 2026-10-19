import type {
  AutomationActionLink,
  AutomationDetail,
  AutomationRun,
} from '@tryghost/admin-x-framework/api/automations';

// The fake backend's data, kept in localStorage so edits survive reloads.
// Bump VERSION when the shape changes; an older copy is reseeded.

const STORAGE_KEY = 'shaping.mock.db';
const VERSION = 4;

export type MockRun = AutomationRun & { automation_id: string };

export type MockDb = {
  version: number;
  automations: AutomationDetail[];
  runs: MockRun[];
  // Clicked links per email action, keyed by action id.
  links: Record<string, AutomationActionLink[]>;
};

let db: MockDb | null = null;

export const loadDb = (): MockDb | null => {
  if (db) {
    return db;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as MockDb) : null;
    db = parsed?.version === VERSION ? parsed : null;
  } catch {
    db = null;
  }
  return db;
};

export const setDb = (next: Omit<MockDb, 'version'>) => {
  db = { ...next, version: VERSION };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage full or blocked: keep the in-memory copy for this page.
  }
};

export const getDb = (): MockDb => {
  const current = loadDb();
  if (!current) {
    throw new Error('Shaping mocks: data used before it was seeded');
  }
  return current;
};

export const saveDb = () => {
  if (db) {
    setDb(db);
  }
};

export const clearDb = () => {
  db = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
};

export const newId = (): string => {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};
