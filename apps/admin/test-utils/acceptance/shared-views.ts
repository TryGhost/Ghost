import { HttpResponse } from 'msw';
import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import { settingsResponse } from '@tryghost/test-data';

import type { RenderAdminAppOptions } from './render-admin-app';
import { registerAdminApiHandler, registerRoute } from './worker';

/**
 * The fake server's saved views for the current test.
 *
 * Ghost keeps them in two places. The views of the posts and pages lists are entries of the
 * `shared_views` setting, which `/settings/` returns and saves. The saved member views are
 * segments, with a store of their own, which `/segments/` lists and changes. Ghost doesn't read
 * the setting for member views, so a member view saved through `/settings/` is not a segment.
 *
 * A test declares its views together, in the `shared_views` value of its `browseSettings` boot
 * response (see `withSavedViews`). The fake stores them as Ghost does: the member views with a
 * filter become segments, and the rest stay in the setting. A `browseSettings` response given as
 * a function isn't read, so its views reach `/settings/` as they are and none become segments.
 * Each write through either API (`fakeEditSettings`, `fakeSegmentWrites`) changes its own store
 * for the rest of the test.
 */

/** The setting's value as the test declared it, without the views that became segments. */
let declared: string | undefined;
/** The setting's value as last saved through `/settings/` in this test. */
let written: string | undefined;
/** The segments, in order. Each keeps the id and the slug it was given when it was added. */
let segmentViews: Segment[] = [];
/** How many segments this test has added, which the next segment's id is made from. */
let segmentsAdded = 0;

/**
 * A slug made from `name` as Ghost mints one, without transliterating it or checking it against
 * Ghost's filter parser, and numbered when one of `others` has it.
 */
function slugFor(name: string, others: Segment[]): string {
  const base =
    name
      .toLowerCase()
      .replace(/'/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'segment';
  let slug = base;
  for (let number = 2; others.some((other) => other.slug === slug); number += 1) {
    slug = `${base}-${number}`;
  }
  return slug;
}

/** A new segment under `slug`, with an id no other segment of the test has, as Ghost gives each. */
function newSegment(name: string, filter: string, slug: string): Segment {
  segmentsAdded += 1;
  return { id: segmentsAdded.toString(16).padStart(24, '0'), name, slug, filter };
}

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
 * Stores `value`, a `shared_views` value that holds every kind of saved view, as Ghost stores
 * them: its member views with a filter as the segments, and the rest as the setting's value. A
 * value that isn't a list of views is the setting's value as it is, and there are no segments.
 */
function storeViews(value: string): string {
  // A view that is still there keeps its id, as a segment does when others are deleted.
  const previous = segmentViews;
  segmentViews = [];
  let views: unknown;
  try {
    views = JSON.parse(value);
  } catch {
    return value;
  }
  if (!Array.isArray(views)) {
    return value;
  }
  const entries: unknown[] = views;
  segmentViews = entries
    .filter(isStoredMemberView)
    .reduce<Segment[]>(
      (stored, view) => [
        ...stored,
        previous.find(({ name, filter }) => name === view.name && filter === view.filter.filter) ??
          newSegment(view.name, view.filter.filter, slugFor(view.name, [...previous, ...stored])),
      ],
      [],
    );
  return JSON.stringify(entries.filter((view) => !isStoredMemberView(view)));
}

/**
 * Starts the test from the `shared_views` value in its `browseSettings` boot response. A
 * response that has no such value declares nothing, so the views the test already has stay.
 */
export function declareSharedViews(settingsBody: unknown): void {
  const value = typeof settingsBody === 'function' ? undefined : sharedViewsIn(settingsBody);
  if (value !== undefined) {
    declared = storeViews(value);
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

/**
 * A settings response body with the setting's value as the fake stores it: without the views
 * that became segments, and as saved in this test, if it was.
 */
export function withStoredSharedViews(settingsBody: unknown): unknown {
  const value = written ?? declared;
  if (value === undefined || !isRecord(settingsBody) || !Array.isArray(settingsBody.settings)) {
    return settingsBody;
  }

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
  segmentViews = [];
  segmentsAdded = 0;
}

/** The segments, each with its position. */
function listSegments(): Array<{ segment: Segment; index: number }> {
  return segmentViews.map((segment, index) => ({ segment, index }));
}

/** `GET /segments/`: the segments, in order. */
export function segmentsResponse(): { segments: Segment[] } {
  return { segments: [...segmentViews] };
}

/**
 * Holds `GET /segments/` until the returned function is called, then answers it from the fake's
 * segments, as a slow server would. Call the function before the test ends.
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
    return HttpResponse.json(segmentsResponse());
  });

  return release;
}

/** A saved view in the form the `shared_views` setting stores one. */
export interface StoredView {
  name: string;
  route: 'members' | 'posts' | 'pages';
  color?: string;
  filter: Record<string, string>;
}

/**
 * Views saved before the test, declared through the `browseSettings` boot response. The fake
 * stores the member views among them as segments.
 */
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
  written = storeViews(JSON.stringify(views));
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

/**
 * The segment a write body sends, read as strictly as Ghost reads it: `name` is trimmed, a
 * read-only `id` is ignored, a change can give a `slug`, which has to be text, and any other field
 * is refused, as Admin never sends one. Returns the refusing `Response` when the body isn't one
 * Ghost accepts.
 */
function readSegmentInput(
  body: unknown,
  action: 'save' | 'edit',
): { name: string; filter?: string; slug?: string } | Response {
  const refuse = (issue: SegmentBodyIssue) =>
    HttpResponse.json(segmentsBodyError(action, issue), { status: 422 });
  const segments: unknown[] = isRecord(body) && Array.isArray(body.segments) ? body.segments : [];
  const segment = segments[0];
  const at = (field?: string) => ['body', 'segments', 0, ...(field ? [field] : [])];

  if (!isRecord(segment)) {
    return refuse({ code: 'invalid_type', message: 'Invalid input', path: ['body', 'segments'] });
  }
  const fields = action === 'edit' ? ['id', 'name', 'slug', 'filter'] : ['id', 'name', 'filter'];
  const unknownKeys = Object.keys(segment).filter((key) => !fields.includes(key));
  if (unknownKeys.length > 0) {
    return refuse({
      code: 'unrecognized_keys',
      keys: unknownKeys,
      message: `Unrecognized key: ${unknownKeys.map((key) => `"${key}"`).join(', ')}`,
      path: at(),
    });
  }
  const slug = segment.slug;
  if (slug !== undefined && typeof slug !== 'string') {
    return refuse({ code: 'invalid_type', message: 'Slug must be a string', path: at('slug') });
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
  return { name, filter, slug };
}

/** Whether a segment, other than the one at `exceptIndex`, has `name`, ignoring case. */
function isNameTaken(name: string, exceptIndex?: number): boolean {
  const normalized = name.trim().toLowerCase();
  return segmentViews.some(
    (view, index) => index !== exceptIndex && view.name.trim().toLowerCase() === normalized,
  );
}

function addSegment(body: unknown, filtersAreUnique: boolean): Response {
  const input = readSegmentInput(body, 'save');
  if (input instanceof Response) {
    return input;
  }
  if (isNameTaken(input.name)) {
    return segmentsRefusal('save', 'invalid', 'A view with this name already exists', 'name');
  }
  const filter = input.filter ?? '';
  // Ghost lets two segments have one filter under different names. A version from before
  // segments had ids of their own rejects the second.
  if (filtersAreUnique && segmentViews.some((view) => view.filter === filter)) {
    return segmentsRefusal('save', 'invalid', 'A view with this filter already exists', 'filter');
  }
  const segment = newSegment(input.name, filter, slugFor(input.name, segmentViews));
  segmentViews = [...segmentViews, segment];
  return HttpResponse.json({ segments: [segment] }, { status: 201 });
}

function renameSegment(id: string, body: unknown): Response {
  const input = readSegmentInput(body, 'edit');
  if (input instanceof Response) {
    return input;
  }
  const target = listSegments().find(({ segment }) => segment.id === id);
  if (!target) {
    return segmentsRefusal('edit', 'not-found', 'Segment not found.');
  }
  if (input.filter !== undefined && input.filter !== target.segment.filter) {
    return segmentsRefusal('edit', 'invalid', "A segment's filter cannot be changed", 'filter');
  }
  if (input.slug !== undefined && input.slug !== target.segment.slug) {
    return segmentsRefusal('edit', 'invalid', "A segment's slug cannot be changed", 'slug');
  }
  if (isNameTaken(input.name, target.index)) {
    return segmentsRefusal('edit', 'invalid', 'A view with this name already exists', 'name');
  }

  segmentViews = segmentViews.map((view, index) =>
    index === target.index ? { ...view, name: input.name } : view,
  );
  return HttpResponse.json({ segments: [{ ...target.segment, name: input.name }] });
}

function deleteSegment(id: string): Response {
  const target = listSegments().find(({ segment }) => segment.id === id);
  if (!target) {
    return segmentsRefusal('delete', 'not-found', 'Segment not found.');
  }

  segmentViews = segmentViews.filter((_, index) => index !== target.index);
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
  /**
   * Answers as a version of Ghost from before segments had ids of their own, which rejects a new
   * segment with a filter another segment has. Admin runs against such a server until it
   * updates.
   */
  filtersAreUnique?: boolean;
}

/**
 * Handles `POST /segments/`, `PUT /segments/:id/` and `DELETE /segments/:id/` the way Ghost does:
 * each changes the fake's segments, and a write Ghost would refuse is answered with Ghost's error
 * body. Captures every write.
 */
export function fakeSegmentWrites({
  respondAfter,
  filtersAreUnique = false,
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
      return addSegment(body, filtersAreUnique);
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
