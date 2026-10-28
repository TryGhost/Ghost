/**
 * POC ONLY. Portal's half of the fake list-field API: list fields and a member's answers
 * come from the localStorage store Admin's fake writes (`apps/admin/src/poc/list-field/`),
 * and everything else goes to Ghost untouched.
 *
 * Admin and Portal share an origin in development, so a field created in Settings and an
 * answer saved in either app are seen by both. Portal can't import Admin's code, so the
 * store's shape is restated here and the two must agree. Removing this is deleting this
 * folder and the call in `index.jsx`.
 */

import { SEED } from './seed';

const STORE_KEY = 'ghost-poc-list-field';

type Metafields = {
  custom?: Record<string, unknown>;
  [namespace: string]: Record<string, unknown> | undefined;
};
type Member = { uuid?: string; metafields?: Metafields };
type ListField = {
  key: string;
  status: 'active' | 'archived';
  access: { member: 'none' | 'read' | 'write' };
};
type Store = {
  version: 1;
  fields: ListField[];
  order: string[];
  answers: Record<string, Record<string, string[]>>;
};

const FIELDS_PATH = /\/members\/api\/member\/metafields\/custom\/?$/;
const MEMBER_PATH = /\/members\/api\/member\/?$/;

const readStore = (): Store => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null') as Store | null;
    return stored?.version === 1 ? stored : { version: 1, fields: [], order: [], answers: {} };
  } catch {
    return { version: 1, fields: [], order: [], answers: {} };
  }
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// The member with their list answers among their other values.
const withAnswers = (member: Member): Member => {
  const store = readStore();
  const saved = (member.uuid && store.answers[member.uuid]) || {};
  const answers = Object.fromEntries(
    store.fields.filter((field) => saved[field.key]).map((field) => [field.key, saved[field.key]]),
  );
  return {
    ...member,
    metafields: { ...member.metafields, custom: { ...member.metafields?.custom, ...answers } },
  };
};

const saveAnswers = (uuid: string, answers: Record<string, unknown>) => {
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
  window.localStorage.setItem(
    STORE_KEY,
    JSON.stringify({ ...store, answers: { ...store.answers, [uuid]: saved } }),
  );
};

export function installListFieldFakeApi() {
  const realFetch = window.fetch.bind(window);

  // A browser that has never had a store starts from the seed, so a phone sees the same
  // fields and answers as the machine the POC was built on.
  if (window.localStorage.getItem(STORE_KEY) === null) {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(SEED));
  }

  // The fields opened to members: Ghost's and the active list fields, in Settings' order.
  const fields = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await realFetch(input, init);
    if (!response.ok) {
      return response;
    }
    const body = (await response.json()) as { members_metafields?: Array<{ key: string }> };
    const store = readStore();
    const open = store.fields.filter(
      (field) => field.status === 'active' && field.access.member !== 'none',
    );
    const placeOf = new Map(store.order.map((key, place) => [key, place]));
    const all = [...(body.members_metafields ?? []), ...open].sort(
      (a, b) => (placeOf.get(a.key) ?? Infinity) - (placeOf.get(b.key) ?? Infinity),
    );
    return json(response.status, { ...body, members_metafields: all });
  };

  // A save's list answers are kept in the store and the rest of it goes to Ghost.
  const member = async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    let answers: Record<string, unknown> = {};
    let forwarded = init;
    if (method === 'PUT' && typeof init?.body === 'string') {
      const body = JSON.parse(init.body) as { metafields?: Metafields };
      if (body.metafields) {
        const listKeys = new Set(readStore().fields.map((field) => field.key));
        const custom = Object.entries(body.metafields.custom ?? {});
        answers = Object.fromEntries(custom.filter(([key]) => listKeys.has(key)));
        forwarded = {
          ...init,
          body: JSON.stringify({
            ...body,
            metafields: {
              ...body.metafields,
              custom: Object.fromEntries(custom.filter(([key]) => !listKeys.has(key))),
            },
          }),
        };
      }
    }
    const response = await realFetch(input, forwarded);
    if (!response.ok || response.status === 204) {
      return response;
    }
    const body = (await response.json()) as Member;
    if (method === 'PUT' && body.uuid) {
      saveAnswers(body.uuid, answers);
    }
    return json(response.status, withAnswers(body));
  };

  window.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input, window.location.href);
    if (FIELDS_PATH.test(url.pathname)) {
      return fields(input, init);
    }
    if (MEMBER_PATH.test(url.pathname)) {
      return member(input, init);
    }
    return realFetch(input, init);
  };
}
