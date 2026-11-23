import { HttpResponse } from 'msw';
import { settingsResponse } from '@tryghost/test-data';

import type { RenderAdminAppOptions } from './render-admin-app';
import { registerAdminApiHandler, registerRoute } from './worker';

/**
 * The fake server's `shared_views` setting for the current test.
 *
 * Ghost keeps the saved member views and posts views in this one setting and serves it through
 * two APIs: `/settings/` returns the whole setting, and `/segments/` lists and changes the member
 * views in it. Admin uses both in one session, so the fake keeps one copy of the setting that both
 * serve, as Ghost does.
 *
 * A test starts with the `shared_views` value of its `browseSettings` boot response, or `[]`.
 * A `browseSettings` response given as a function isn't read, so its views reach `/settings/` but
 * not `/segments/`. Each write through either API (`fakeEditSettings`, `fakeSegmentWrites`)
 * replaces the value for the rest of the test, and `GET /settings/` then serves the replacement.
 */

let declared: string | undefined;
let written: string | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The `shared_views` value in a settings response body, or `undefined` when it has none. */
function sharedViewsIn(body: unknown): string | undefined {
  if (!isRecord(body) || !Array.isArray(body.settings)) {
    return undefined;
  }

  const settings: unknown[] = body.settings;
  const setting = settings.find((entry) => isRecord(entry) && entry.key === 'shared_views');
  return isRecord(setting) && typeof setting.value === 'string' ? setting.value : undefined;
}

/** Starts the test from the `shared_views` value in its `browseSettings` boot response. */
export function declareSharedViews(settingsBody: unknown): void {
  if (typeof settingsBody !== 'function') {
    declared = sharedViewsIn(settingsBody);
  }
}

/** The setting's current value. */
export function currentSharedViews(): string {
  return written ?? declared ?? sharedViewsIn(settingsResponse()) ?? '[]';
}

/** Replaces the setting's value for the rest of the test. */
export function writeSharedViews(value: string): void {
  written = value;
}

/** A settings response body with the setting's value as written in this test, if it was. */
export function withWrittenSharedViews(settingsBody: unknown): unknown {
  if (written === undefined || !isRecord(settingsBody) || !Array.isArray(settingsBody.settings)) {
    return settingsBody;
  }

  const value = written;
  const settings: unknown[] = settingsBody.settings;
  return {
    ...settingsBody,
    settings: settings.map((entry) =>
      isRecord(entry) && entry.key === 'shared_views' ? { ...entry, value } : entry,
    ),
  };
}

/** Called by the harness between tests, alongside the fake API reset. */
export function resetSharedViews(): void {
  declared = undefined;
  written = undefined;
}

interface StoredMemberView {
  name: string;
  route: 'members';
  filter: { filter: string };
}

function isStoredMemberView(view: unknown): view is StoredMemberView {
  return (
    isRecord(view) &&
    view.route === 'members' &&
    typeof view.name === 'string' &&
    isRecord(view.filter) &&
    typeof view.filter.filter === 'string' &&
    view.filter.filter.length > 0
  );
}

/**
 * The stored views, or `undefined` when the value can't be read. Like Ghost, an empty value, `null`
 * and `{}` count as no views.
 */
function storedViews(): unknown[] | undefined {
  const value = currentSharedViews();
  if (value === '') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || (isRecord(parsed) && Object.keys(parsed).length === 0)) {
      return [];
    }
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

interface Segment {
  id: string;
  name: string;
  filter: string;
}

/**
 * A segment's id, as Ghost derives it: the first 24 hex characters of the SHA-256 hash of the
 * filter. The second and later views that share a filter hash a 0xFF byte followed by
 * `JSON.stringify([filter, occurrence])` instead.
 */
async function segmentId(filter: string, occurrence: number): Promise<string> {
  const encoder = new TextEncoder();
  const hashed =
    occurrence === 1
      ? encoder.encode(filter)
      : new Uint8Array([0xff, ...encoder.encode(JSON.stringify([filter, occurrence]))]);
  const digest = await crypto.subtle.digest('SHA-256', hashed);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'));
  return hex.join('').slice(0, 24);
}

/** The member views in `views` as segments, each with its view and the view's position. */
async function listSegments(
  views: unknown[],
): Promise<Array<{ segment: Segment; view: StoredMemberView; index: number }>> {
  const occurrences = new Map<string, number>();
  const listed: Array<{ segment: Segment; view: StoredMemberView; index: number }> = [];

  for (const [index, view] of views.entries()) {
    if (!isStoredMemberView(view)) {
      continue;
    }
    const occurrence = (occurrences.get(view.filter.filter) ?? 0) + 1;
    occurrences.set(view.filter.filter, occurrence);
    const id = await segmentId(view.filter.filter, occurrence);
    listed.push({ segment: { id, name: view.name, filter: view.filter.filter }, view, index });
  }

  return listed;
}

/** `GET /segments/`: the member views in the setting, in order. */
export async function segmentsResponse(): Promise<{ segments: Segment[] }> {
  const listed = await listSegments(storedViews() ?? []);
  return { segments: listed.map(({ segment }) => segment) };
}

/**
 * Holds `GET /segments/` until the returned function is called, then answers it from the fake
 * setting, as a slow server would. Call the function before the test ends.
 */
export function holdSegmentsList(): () => void {
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  registerRoute('GET', '/segments/ (held)');
  registerAdminApiHandler(async (request, apiPath) => {
    if (request.method !== 'GET' || apiPath !== '/segments/') {
      return undefined;
    }
    await released;
    return HttpResponse.json(await segmentsResponse());
  });

  return release;
}

/** A saved view in the `shared_views` setting's stored form. */
export interface StoredView {
  name: string;
  route: 'members' | 'posts' | 'pages';
  color?: string;
  filter: Record<string, string>;
}

/** Views saved before the test, through the `browseSettings` boot response. */
export function withSavedViews(...views: StoredView[]): RenderAdminAppOptions {
  return {
    boot: {
      browseSettings: {
        response: settingsResponse({ settings: { shared_views: JSON.stringify(views) } }),
      },
    },
  };
}

/** Replaces the stored views as another session would, without Admin's caches knowing. */
export function replaceSavedViewsElsewhere(...views: StoredView[]): void {
  writeSharedViews(JSON.stringify(views));
}

type SegmentAction = 'save' | 'edit' | 'delete';

/** The fields every Ghost error body carries, around a refusal's own. */
function ghostError(fields: {
  type: string;
  message: string;
  context: string;
  code: string | null;
  property: string | null;
  details: unknown[] | null;
}) {
  return { ghostErrorCode: null, help: null, id: crypto.randomUUID(), ...fields };
}

/**
 * Ghost's body for a segments write its service refuses: a generic summary in `message`, the
 * reason in `context`, no code, and no `details`. An unknown id is a 404; anything else is a 422
 * validation error.
 */
function segmentsRefusal(
  action: SegmentAction,
  refusal: 'not-found' | 'invalid',
  context: string,
  property: string | null = null,
): Response {
  const notFound = refusal === 'not-found';
  const summary = notFound ? 'Resource not found error' : 'Validation error';
  return HttpResponse.json(
    {
      errors: [
        ghostError({
          type: notFound ? 'NotFoundError' : 'ValidationError',
          message: `${summary}, cannot ${action} segment.`,
          context,
          code: null,
          property,
          details: null,
        }),
      ],
    },
    { status: notFound ? 404 : 422 },
  );
}

/** A problem with a write body, as a Zod issue in an error's `details`. */
export interface SegmentBodyIssue {
  code: string;
  message: string;
  path: Array<string | number>;
  keys?: string[];
}

/**
 * Ghost's body for a segments write the API framework refuses before the service runs, because
 * the request body has the wrong shape: a validation error with no code, the generic context
 * "Validation failed for body.", and the issue in `details`.
 */
export function segmentsBodyError(action: 'save' | 'edit', issue: SegmentBodyIssue) {
  return {
    errors: [
      ghostError({
        type: 'ValidationError',
        message: `Validation error, cannot ${action} segment.`,
        context: 'Validation failed for body.',
        code: null,
        property: issue.path.join('.'),
        details: [issue],
      }),
    ],
  };
}

const MAX_NAME_LENGTH = 191;
const SAVED_VIEWS_INVALID = 'Cannot modify saved views because shared_views is invalid';

/**
 * The segment a write body sends, read as strictly as Ghost reads it: `name` is trimmed, a
 * read-only `id` is ignored, and any other field is refused. Returns the refusing `Response`
 * when the body isn't one Ghost accepts.
 */
function readSegmentInput(
  body: unknown,
  action: 'save' | 'edit',
): { name: string; filter?: string } | Response {
  const refuse = (issue: SegmentBodyIssue) =>
    HttpResponse.json(segmentsBodyError(action, issue), { status: 422 });
  const segments: unknown[] = isRecord(body) && Array.isArray(body.segments) ? body.segments : [];
  const segment = segments[0];
  const at = (field?: string) => ['body', 'segments', 0, ...(field ? [field] : [])];

  if (!isRecord(segment)) {
    return refuse({ code: 'invalid_type', message: 'Invalid input', path: ['body', 'segments'] });
  }
  const unknownKeys = Object.keys(segment).filter((key) => !['id', 'name', 'filter'].includes(key));
  if (unknownKeys.length > 0) {
    return refuse({
      code: 'unrecognized_keys',
      keys: unknownKeys,
      message: `Unrecognized key: ${unknownKeys.map((key) => `"${key}"`).join(', ')}`,
      path: at(),
    });
  }
  if (typeof segment.name !== 'string') {
    return refuse({ code: 'invalid_type', message: 'Name must be a string', path: at('name') });
  }
  const filter = segment.filter;
  if ((filter !== undefined || action === 'save') && typeof filter !== 'string') {
    return refuse({ code: 'invalid_type', message: 'Filter must be a string', path: at('filter') });
  }

  const name = segment.name.trim();
  if (name.length === 0) {
    return refuse({ code: 'custom', message: 'Name cannot be empty', path: at('name') });
  }
  if ([...name].length > MAX_NAME_LENGTH) {
    return refuse({
      code: 'custom',
      message: `Name cannot be longer than ${MAX_NAME_LENGTH} characters`,
      path: at('name'),
    });
  }
  if (filter === '') {
    return refuse({ code: 'custom', message: 'Filter cannot be empty', path: at('filter') });
  }
  return { name, filter };
}

/**
 * Whether a saved member view, other than the one at `exceptIndex`, has `name`. As in Ghost, a
 * member view without a filter counts, although it isn't listed as a segment.
 */
function isNameTaken(views: unknown[], name: string, exceptIndex?: number): boolean {
  const normalized = name.trim().toLowerCase();
  return views.some(
    (view, index) =>
      index !== exceptIndex &&
      isRecord(view) &&
      view.route === 'members' &&
      isRecord(view.filter) &&
      typeof view.name === 'string' &&
      view.name.trim().toLowerCase() === normalized,
  );
}

async function addSegment(body: unknown): Promise<Response> {
  const input = readSegmentInput(body, 'save');
  if (input instanceof Response) {
    return input;
  }
  const views = storedViews();
  if (!views) {
    return segmentsRefusal('save', 'invalid', SAVED_VIEWS_INVALID);
  }
  if (isNameTaken(views, input.name)) {
    return segmentsRefusal('save', 'invalid', 'A view with this name already exists', 'name');
  }
  const filter = input.filter ?? '';
  if (views.some((view) => isStoredMemberView(view) && view.filter.filter === filter)) {
    return segmentsRefusal('save', 'invalid', 'A view with this filter already exists', 'filter');
  }

  writeSharedViews(
    JSON.stringify([...views, { name: input.name, route: 'members', filter: { filter } }]),
  );
  const { segments } = await segmentsResponse();
  return HttpResponse.json({ segments: segments.slice(-1) }, { status: 201 });
}

async function renameSegment(id: string, body: unknown): Promise<Response> {
  const input = readSegmentInput(body, 'edit');
  if (input instanceof Response) {
    return input;
  }
  const views = storedViews();
  if (!views) {
    return segmentsRefusal('edit', 'invalid', SAVED_VIEWS_INVALID);
  }
  const target = (await listSegments(views)).find(({ segment }) => segment.id === id);
  if (!target) {
    return segmentsRefusal('edit', 'not-found', 'Segment not found.');
  }
  if (input.filter !== undefined && input.filter !== target.segment.filter) {
    return segmentsRefusal('edit', 'invalid', "A segment's filter cannot be changed", 'filter');
  }
  if (isNameTaken(views, input.name, target.index)) {
    return segmentsRefusal('edit', 'invalid', 'A view with this name already exists', 'name');
  }

  const renamed = { ...target.view, name: input.name };
  writeSharedViews(
    JSON.stringify(views.map((view, index) => (index === target.index ? renamed : view))),
  );
  return HttpResponse.json({ segments: [{ ...target.segment, name: input.name }] });
}

async function deleteSegment(id: string): Promise<Response> {
  const views = storedViews();
  if (!views) {
    return segmentsRefusal('delete', 'invalid', SAVED_VIEWS_INVALID);
  }
  const target = (await listSegments(views)).find(({ segment }) => segment.id === id);
  if (!target) {
    return segmentsRefusal('delete', 'not-found', 'Segment not found.');
  }

  writeSharedViews(JSON.stringify(views.filter((_, index) => index !== target.index)));
  return new HttpResponse(null, { status: 204 });
}

const SEGMENT_PATH = /^\/segments\/(?:([^/?]+)\/)?$/;

export interface SegmentWrite {
  method: string;
  /** The request path relative to the admin API, e.g. `/segments/<id>/`. */
  path: string;
  body: unknown;
}

export interface SegmentWritesCapture {
  /** Every segments write, oldest first. */
  requests: SegmentWrite[];
}

export interface FakeSegmentWritesOptions {
  /**
   * Holds every write until this settles, for a spec that acts while a save is in flight. Each
   * request is still captured as soon as it arrives.
   */
  respondAfter?: Promise<unknown>;
}

/**
 * Handles `POST /segments/`, `PUT /segments/:id/` and `DELETE /segments/:id/` the way Ghost does:
 * each changes the member views in the test's `shared_views` setting, and a write Ghost would
 * refuse is answered with Ghost's error body. Captures every write.
 */
export function fakeSegmentWrites({
  respondAfter,
}: FakeSegmentWritesOptions = {}): SegmentWritesCapture {
  const requests: SegmentWrite[] = [];

  registerRoute('POST', '/segments/');
  registerRoute('PUT', '/segments/:id/');
  registerRoute('DELETE', '/segments/:id/');
  registerAdminApiHandler(async (request, apiPath) => {
    const match = SEGMENT_PATH.exec(apiPath);
    if (!match || !['POST', 'PUT', 'DELETE'].includes(request.method)) {
      return undefined;
    }

    const id = match[1] === undefined ? undefined : decodeURIComponent(match[1]);
    const body: unknown = request.method === 'DELETE' ? undefined : await request.clone().json();
    requests.push({ method: request.method, path: apiPath, body });
    await respondAfter;

    if (request.method === 'POST' && id === undefined) {
      return addSegment(body);
    }
    if (request.method === 'PUT' && id !== undefined) {
      return renameSegment(id, body);
    }
    if (request.method === 'DELETE' && id !== undefined) {
      return deleteSegment(id);
    }
    return undefined;
  });

  return { requests };
}
