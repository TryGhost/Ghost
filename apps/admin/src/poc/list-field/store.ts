/**
 * POC ONLY. What the fake list-field API remembers, kept in this browser's localStorage.
 *
 * Admin and Portal run on the same origin in development, so both read and write this one
 * key: a field created in Settings shows up in Portal, and an answer a member picks in
 * Portal shows up on their record in Admin. Deleted with the rest of `src/poc/` once the
 * backend serves list fields itself.
 */

export type StoredListField = {
  namespace: 'custom';
  key: string;
  name: string;
  type: 'list';
  status: 'active' | 'archived';
  access: { member: 'none' | 'read' | 'write' };
  created_at: string;
  updated_at: string | null;
  options: string[];
  multiple: boolean;
};

type ListFieldStore = {
  version: 1;
  /** The list fields, which the real API has never heard of. */
  fields: StoredListField[];
  /** Every field's key, real ones included, in the order of the last reorder. */
  order: string[];
  /** Answers by member uuid, then field key: the options they chose, as they read then. */
  answers: Record<string, Record<string, string[]>>;
};

const STORE_KEY = 'ghost-poc-list-field';

const empty = (): ListFieldStore => ({ version: 1, fields: [], order: [], answers: {} });

export const readStore = (): ListFieldStore => {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(STORE_KEY) ?? 'null',
    ) as ListFieldStore | null;
    return stored?.version === 1 ? stored : empty();
  } catch {
    return empty();
  }
};

export const writeStore = (store: ListFieldStore) => {
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
};

/** The key Ghost would mint from a name: lowercase letters, digits and underscores, unique among `taken`. */
export const mintKey = (name: string, taken: Iterable<string>): string => {
  const base =
    name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/'/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'field';
  const used = new Set(taken);
  if (!used.has(base)) {
    return base;
  }
  let suffix = 2;
  while (used.has(`${base}_${suffix}`)) {
    suffix += 1;
  }
  return `${base}_${suffix}`;
};

type Metafields = Record<string, Record<string, unknown> | undefined>;

/** A member's metafields with their list answers added, as the real API would return them. */
export const withListAnswers = (metafields: Metafields | undefined, uuid: string): Metafields => {
  const store = readStore();
  const saved = store.answers[uuid] ?? {};
  const answers = Object.fromEntries(
    store.fields.filter((field) => saved[field.key]).map((field) => [field.key, saved[field.key]]),
  );
  return { ...metafields, custom: { ...metafields?.custom, ...answers } };
};

/** Splits a write's list answers from the rest, so Ghost is only sent the fields it knows. */
export const takeListAnswers = (metafields: Metafields | undefined) => {
  const listKeys = new Set(readStore().fields.map((field) => field.key));
  const custom = Object.entries(metafields?.custom ?? {});
  return {
    answers: Object.fromEntries(custom.filter(([key]) => listKeys.has(key))),
    rest: {
      ...metafields,
      custom: Object.fromEntries(custom.filter(([key]) => !listKeys.has(key))),
    },
  };
};

/** Saves a member's list answers. An empty or null answer clears it. */
export const saveListAnswers = (uuid: string, answers: Record<string, unknown>) => {
  const store = readStore();
  const saved = { ...store.answers[uuid] };
  for (const [key, value] of Object.entries(answers)) {
    const picked = Array.isArray(value)
      ? value.filter((answer): answer is string => typeof answer === 'string')
      : [];
    if (picked.length) {
      saved[key] = picked;
    } else {
      delete saved[key];
    }
  }
  writeStore({ ...store, answers: { ...store.answers, [uuid]: saved } });
};
