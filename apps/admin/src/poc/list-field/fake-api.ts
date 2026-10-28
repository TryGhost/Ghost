/**
 * POC ONLY. Answers the Admin API's custom field requests for list fields from
 * localStorage, and passes everything else through to Ghost untouched.
 *
 * The UI is written against the real endpoints and the shape a list field is expected to
 * have over the API (see README.md), so nothing outside `src/poc/` knows this exists.
 * Removing it is deleting this folder and the import in `main.tsx`.
 */
import {
  type StoredListField,
  mintKey,
  readStore,
  saveListAnswers,
  takeListAnswers,
  withListAnswers,
  writeStore,
} from './store';

type FieldInput = {
  key?: string;
  name?: string;
  type?: string;
  status?: StoredListField['status'];
  access?: StoredListField['access'];
  options?: string[];
  multiple?: boolean;
};
type Body = { members_metafields?: FieldInput[] };
type FieldsResponse = { members_metafields: Array<{ key: string; name: string }> };

const readJson = async <T>(response: Response) => (await response.json()) as T;

const FIELDS_PATH = /\/api\/admin\/members\/metafields\/custom\/(?:([^/]+)\/)?$/;
const MEMBERS_PATH = /\/api\/admin\/members\/(?:([a-f0-9]{24})\/)?$/;

type Member = { uuid: string; metafields?: Record<string, Record<string, unknown> | undefined> };
type MembersBody = { members?: Member[] };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// The error Ghost sends for a name already in use, so the modal highlights the name input.
const nameTaken = () =>
  json(422, {
    errors: [
      {
        type: 'ValidationError',
        message: 'Validation error, cannot save custom field.',
        context: 'A custom field with this name already exists.',
        property: 'name',
      },
    ],
  });

const sameName = (a: unknown, b: unknown) =>
  typeof a === 'string' &&
  typeof b === 'string' &&
  a.trim().toLowerCase() === b.trim().toLowerCase();

// Ghost's fields stay in the order Ghost returns them, which every reorder is sent to. Each
// list field goes in after the field it last followed in the stored order, and one the order
// has never seen goes last, where Ghost puts a new field. A stale order, such as a phone's
// seed, can then only misplace list fields, never Ghost's own.
const inStoredOrder = <T extends { key: string }>(real: T[], list: T[], order: string[]): T[] => {
  const result = [...real];
  const placeOf = (key: string) => {
    const place = order.indexOf(key);
    return place === -1 ? Infinity : place;
  };
  for (const field of [...list].sort((a, b) => placeOf(a.key) - placeOf(b.key))) {
    const place = order.indexOf(field.key);
    if (place === -1) {
      result.push(field);
      continue;
    }
    const before = order
      .slice(0, place)
      .reverse()
      .map((key) => result.findIndex((placed) => placed.key === key))
      .find((index) => index !== -1);
    result.splice(before === undefined ? 0 : before + 1, 0, field);
  }
  return result;
};

export function installListFieldFakeApi() {
  const realFetch = window.fetch.bind(window);

  const readBody = (init?: RequestInit): Body => {
    try {
      return typeof init?.body === 'string' ? (JSON.parse(init.body) as Body) : {};
    } catch {
      return {};
    }
  };

  // Every real field, archived included: names and keys are unique across both.
  const realFields = async (url: URL, init?: RequestInit) => {
    const browse = new URL(url);
    browse.search = '';
    browse.searchParams.set('filter', 'status:[active,archived]');
    const response = await realFetch(browse, { credentials: 'include', headers: init?.headers });
    return response.ok ? (await readJson<FieldsResponse>(response)).members_metafields : [];
  };

  const browse = async (url: URL, init?: RequestInit) => {
    const response = await realFetch(url, init);
    if (!response.ok) {
      return response;
    }
    const body = await readJson<FieldsResponse>(response);
    const store = readStore();
    const withArchived = url.searchParams.get('filter')?.includes('archived');
    const listFields = store.fields.filter((field) => withArchived || field.status === 'active');
    return json(response.status, {
      ...body,
      members_metafields: inStoredOrder(body.members_metafields, listFields, store.order),
    });
  };

  const create = async (url: URL, init: RequestInit | undefined, input: FieldInput) => {
    const real = await realFields(url, init);
    const store = readStore();
    const name = (input.name ?? '').trim();
    if ([...real, ...store.fields].some((field) => sameName(field.name, name))) {
      return nameTaken();
    }
    const field: StoredListField = {
      namespace: 'custom',
      key: mintKey(
        name,
        [...real, ...store.fields].map((existing) => existing.key),
      ),
      name,
      type: 'list',
      status: 'active',
      access: input.access ?? { member: 'none' },
      created_at: new Date().toISOString(),
      updated_at: null,
      options: input.options ?? [],
      multiple: Boolean(input.multiple),
    };
    writeStore({ ...store, fields: [...store.fields, field] });
    return json(201, { members_metafields: [field] });
  };

  const edit = async (
    url: URL,
    init: RequestInit | undefined,
    field: StoredListField,
    patch: FieldInput,
  ) => {
    const store = readStore();
    if (patch.name !== undefined && !sameName(patch.name, field.name)) {
      const real = await realFields(url, init);
      const others = [...real, ...store.fields.filter((other) => other.key !== field.key)];
      if (others.some((other) => sameName(other.name, patch.name))) {
        return nameTaken();
      }
    }
    const updated: StoredListField = {
      ...field,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.access ? { access: patch.access } : {}),
      ...(patch.options ? { options: patch.options } : {}),
      ...(patch.multiple !== undefined ? { multiple: patch.multiple } : {}),
      updated_at: new Date().toISOString(),
    };
    writeStore({
      ...store,
      fields: store.fields.map((stored) => (stored.key === field.key ? updated : stored)),
    });
    return json(200, { members_metafields: [updated] });
  };

  const remove = (field: StoredListField) => {
    const store = readStore();
    const answers = Object.fromEntries(
      Object.entries(store.answers).map(([member, byField]) => [
        member,
        Object.fromEntries(Object.entries(byField).filter(([key]) => key !== field.key)),
      ]),
    );
    writeStore({
      ...store,
      fields: store.fields.filter((stored) => stored.key !== field.key),
      order: store.order.filter((key) => key !== field.key),
      answers,
    });
    return new Response(null, { status: 204 });
  };

  // The real API is told the order of its own fields only, and the whole order is kept
  // here, so list fields can sit anywhere among them.
  const reorder = async (url: URL, init: RequestInit | undefined, keys: string[]) => {
    const store = readStore();
    const listKeys = new Set(store.fields.map((field) => field.key));
    const response = await realFetch(url, {
      ...init,
      body: JSON.stringify({
        members_metafields: keys.filter((key) => !listKeys.has(key)).map((key) => ({ key })),
      }),
    });
    if (!response.ok) {
      return response;
    }
    const body = await readJson<FieldsResponse>(response);
    writeStore({ ...store, order: keys });
    return json(response.status, {
      ...body,
      members_metafields: inStoredOrder(body.members_metafields, store.fields, keys),
    });
  };

  // Members come back with their list answers among their other values, and a write's list
  // answers are kept here while the rest goes to Ghost.
  const members = async (url: URL, method: string, init?: RequestInit) => {
    if (method !== 'GET' && method !== 'PUT') {
      return realFetch(url, init);
    }
    let answers: Record<string, unknown> = {};
    let forwarded = init;
    if (method === 'PUT') {
      const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as MembersBody) : {};
      const [member] = body.members ?? [];
      if (member?.metafields) {
        const taken = takeListAnswers(member.metafields);
        answers = taken.answers;
        forwarded = {
          ...init,
          body: JSON.stringify({ ...body, members: [{ ...member, metafields: taken.rest }] }),
        };
      }
    }
    const response = await realFetch(url, forwarded);
    if (!response.ok) {
      return response;
    }
    const body = await readJson<MembersBody>(response);
    if (method === 'PUT' && body.members?.[0]) {
      saveListAnswers(body.members[0].uuid, answers);
    }
    // Always added, include or not: a member read carries its values whatever it asked for.
    return json(response.status, {
      ...body,
      members: body.members?.map((member) => ({
        ...member,
        metafields: withListAnswers(member.metafields, member.uuid),
      })),
    });
  };

  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input, window.location.href);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (MEMBERS_PATH.test(url.pathname)) {
      return members(url, method, init);
    }
    const match = url.pathname.match(FIELDS_PATH);
    if (!match) {
      return realFetch(input, init);
    }

    const key = match[1] ? decodeURIComponent(match[1]) : undefined;
    const body = readBody(init);

    if (!key) {
      if (method === 'GET') {
        return browse(url, init);
      }
      if (method === 'POST' && body.members_metafields?.[0]?.type === 'list') {
        return create(url, init, body.members_metafields[0]);
      }
      if (method === 'PUT') {
        return reorder(
          url,
          init,
          (body.members_metafields ?? []).map((field) => field.key ?? ''),
        );
      }
      return realFetch(input, init);
    }

    const field = readStore().fields.find((stored) => stored.key === key);
    if (!field) {
      return realFetch(input, init);
    }
    if (method === 'PUT') {
      return edit(url, init, field, body.members_metafields?.[0] ?? {});
    }
    if (method === 'DELETE') {
      return remove(field);
    }
    return realFetch(input, init);
  };
}
