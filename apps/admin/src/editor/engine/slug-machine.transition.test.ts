import { describe, expect, it } from 'vitest';
import {
  reduceSlug,
  viewOf,
  type DeferredSubmission,
  type LoadedPost,
  type SlugEffect,
  type SlugEvent,
  type SlugProposal,
  type SlugState,
  type UnchangedReason,
} from './slug-machine';
import { DEFAULT_TITLE } from './save-engine';
import readme from './README.md?raw';

type Idle = Extract<SlugState, { kind: 'idle' }>;
type Generating = Extract<SlugState, { kind: 'generating' }>;
type Core = Pick<SlugState, 'mode' | 'slug' | 'title'>;

// Tickets: 4 holds the wire, 5 waits in the deferred slot, 6 is the submission being reduced.
const REQUEST = 4;
const DEFERRED = 5;
const SUBMISSION = 6;

const HELLO: Core = { mode: 'derived', slug: 'hello', title: 'Hello' };
const CUSTOM: Core = { mode: 'custom', slug: 'mine', title: 'Hello' };
const BOOM = new Error('boom');

const idle = ({ mode, slug, title }: Core): Idle => ({ kind: 'idle', mode, slug, title });

const started = (
  { mode, slug, title }: Core,
  kind: 'title' | 'manual',
  text: string,
  ticket: number,
): Generating => ({
  kind: 'generating',
  mode,
  slug,
  title,
  request: { ticket, kind, text, slugAtSubmission: slug },
  deferred: null,
});

const deferredTitle = (
  ticket: number,
  value = 'Again',
  slugAtSubmission = 'hello',
): DeferredSubmission => ({
  ticket,
  submission: { kind: 'title', value },
  slugAtSubmission,
});

const deferredManual = (
  ticket: number,
  value = 'yours',
  slugAtSubmission = 'hello',
): DeferredSubmission => ({
  ticket,
  submission: { kind: 'manual', value },
  slugAtSubmission,
});

const IDLE = idle(HELLO);
const IDLE_CUSTOM = idle(CUSTOM);
const WORLD = idle({ mode: 'derived', slug: 'world', title: 'World' });
const OTHER = idle({ mode: 'derived', slug: 'other', title: 'Other' });
const OTHER_CUSTOM = idle({ mode: 'custom', slug: 'my-own', title: 'Other' });
const YOURS = idle({ mode: 'custom', slug: 'yours', title: 'Hello' });
// A post with no slug yet: (Untitled) generates until the first answer lands.
const EMPTY: Core = { mode: 'derived', slug: '', title: '' };
const HI = idle({ mode: 'derived', slug: 'hi', title: 'hi' });

const TITLE = started(HELLO, 'title', 'World', REQUEST);
const TITLE_DEFERRED_TITLE: Generating = { ...TITLE, deferred: deferredTitle(DEFERRED) };
const TITLE_DEFERRED_MANUAL: Generating = { ...TITLE, deferred: deferredManual(DEFERRED) };
const TITLE_FROM_EMPTY_DEFERRED_UNTITLED: Generating = {
  ...started(EMPTY, 'title', 'hi', REQUEST),
  deferred: deferredTitle(DEFERRED, DEFAULT_TITLE, ''),
};
const MANUAL = started(HELLO, 'manual', 'mine', REQUEST);
const MANUAL_DEFERRED_TITLE: Generating = { ...MANUAL, deferred: deferredTitle(DEFERRED) };
const MANUAL_DEFERRED_MANUAL: Generating = { ...MANUAL, deferred: deferredManual(DEFERRED) };
// Only a manual request starts from idle(custom); the settled mode stays custom while it is out.
const MANUAL_CUSTOM = started(CUSTOM, 'manual', 'yours', REQUEST);
const MANUAL_CUSTOM_DEFERRED_TITLE: Generating = {
  ...MANUAL_CUSTOM,
  deferred: deferredTitle(DEFERRED, 'Again', 'mine'),
};
const MANUAL_CUSTOM_DEFERRED_MANUAL: Generating = {
  ...MANUAL_CUSTOM,
  deferred: deferredManual(DEFERRED, 'theirs', 'mine'),
};

const STATES: readonly SlugState[] = [
  IDLE,
  IDLE_CUSTOM,
  TITLE,
  TITLE_DEFERRED_TITLE,
  TITLE_DEFERRED_MANUAL,
  MANUAL,
  MANUAL_DEFERRED_TITLE,
  MANUAL_DEFERRED_MANUAL,
  MANUAL_CUSTOM,
  MANUAL_CUSTOM_DEFERRED_TITLE,
  MANUAL_CUSTOM_DEFERRED_MANUAL,
];

const loaded = (slug: string, title: string): SlugEvent => ({ type: 'loaded', slug, title });
const acknowledged = (submitted: LoadedPost, acknowledgedPost: LoadedPost): SlugEvent => ({
  type: 'acknowledged',
  submitted,
  acknowledged: acknowledgedPost,
});
const title = (value: string): SlugEvent => ({
  type: 'submitted',
  ticket: SUBMISSION,
  submission: { kind: 'title', value },
});
const manual = (value: string): SlugEvent => ({
  type: 'submitted',
  ticket: SUBMISSION,
  submission: { kind: 'manual', value },
});
const ok = (result: string, ticket = REQUEST): SlugEvent => ({
  type: 'settled',
  ticket,
  outcome: { ok: result },
});
const failed = (ticket = REQUEST): SlugEvent => ({
  type: 'settled',
  ticket,
  outcome: { error: BOOM },
});

const LOADED = loaded('other', 'Other');
const ACK_SLUG = acknowledged(
  { slug: 'hello', title: 'Hello' },
  { slug: 'hello-2', title: 'Hello' },
);
const ACK_TITLE = acknowledged({ slug: 'x', title: 'Hello' }, { slug: 'x', title: 'Hello!' });
const ACK_MISS = acknowledged({ slug: 'old', title: 'Old' }, { slug: 'old-2', title: 'Old!' });
const ACK_MINE = acknowledged({ slug: 'mine', title: 'Hello' }, { slug: 'mine-2', title: 'Hello' });

const EVENTS: readonly SlugEvent[] = [
  LOADED,
  ACK_SLUG,
  title('World'),
  manual('mine'),
  ok('world'),
  failed(),
];

const unchanged = (reason: UnchangedReason, slug = 'hello', error?: unknown): SlugProposal => ({
  slug,
  source: 'unchanged',
  reason,
  ...(error !== undefined && { error }),
});
const generated = (slug: string): SlugProposal => ({ slug, source: 'generated' });
const applied = (slug: string): SlugProposal => ({ slug, source: 'manual' });

const STALE = unchanged('stale');
const REVERTED = unchanged('reverted');
const ERROR = unchanged('error', 'hello', BOOM);
const REVERTED_MINE = unchanged('reverted', 'mine');
const CUSTOM_MINE = unchanged('custom', 'mine');
const ERROR_MINE = unchanged('error', 'mine', BOOM);

const request = (ticket: number, text: string): SlugEffect => ({ type: 'request', ticket, text });
const resolve = (ticket: number, proposal: SlugProposal): SlugEffect => ({
  type: 'resolve',
  ticket,
  proposal,
});
const notify = (state: SlugState, proposal: SlugProposal | null): SlugEffect => ({
  type: 'notify',
  view: viewOf(state),
  proposal,
});
// A superseded ticket resolves with the slug it was submitted against.
const staled = (held: Pick<DeferredSubmission, 'ticket' | 'slugAtSubmission'>): SlugEffect =>
  resolve(held.ticket, unchanged('stale', held.slugAtSubmission));

interface Row {
  readonly from: SlugState;
  readonly event: SlugEvent;
  readonly when: string;
  readonly to: SlugState;
  readonly effects: readonly SlugEffect[];
}

const stays = (from: SlugState, event: SlugEvent, when: string): Row => ({
  from,
  event,
  when,
  to: from,
  effects: [],
});

const changes = (from: SlugState, event: SlugEvent, when: string, to: SlugState): Row => ({
  from,
  event,
  when,
  to,
  effects: [notify(to, null)],
});

const loads = (from: Generating, event: SlugEvent, to: Idle): Row => ({
  from,
  event,
  when: 'always',
  to,
  effects: [
    ...(from.deferred ? [staled(from.deferred)] : []),
    staled(from.request),
    notify(to, null),
  ],
});

const defers = (
  from: Generating,
  event: SlugEvent,
  when: string,
  deferred: DeferredSubmission,
): Row => ({
  from,
  event,
  when,
  to: { ...from, deferred },
  effects: from.deferred ? [staled(from.deferred)] : [],
});

const answers = (
  from: SlugState,
  event: SlugEvent,
  when: string,
  to: SlugState,
  ticket: number,
  proposal: SlugProposal,
  before: readonly SlugEffect[] = [],
): Row => ({
  from,
  event,
  when,
  to,
  effects: [...before, resolve(ticket, proposal), notify(to, proposal)],
});

const starts = (
  from: SlugState,
  event: SlugEvent,
  when: string,
  to: Generating,
  before: readonly SlugEffect[] = [],
): Row => ({
  from,
  event,
  when,
  to,
  effects: [...before, request(to.request.ticket, to.request.text), notify(to, null)],
});

const withdrawn = (from: Generating): readonly SlugEffect[] => [
  ...(from.deferred ? [staled(from.deferred)] : []),
  staled(from.request),
];

const finished = (from: SlugState, proposal: SlugProposal): readonly SlugEffect[] => [
  resolve(REQUEST, proposal),
  notify(from, proposal),
];

const GENERATES = 'the title generates';
const SOURCE_TITLE = "it is the slug's source title";
const BLANK_TITLE = 'the title is blank';
const DIFFERS = 'the input differs from the slug';
const NO_EDIT = 'the input is blank or the slug';
const NO_WIRE = 'no request is on the wire';
const DEFERRED_GENERATES = 'the deferred title generates';
const DEFERRED_SOURCE_TITLE = "the deferred title is the slug's source title";
const DEFERRED_BLANK_TITLE = 'the deferred title is blank';
const DEFERRED_DIFFERS = 'the deferred edit differs from the slug';
const DEFERRED_IS_SLUG = 'the deferred edit is the new slug';
const CUSTOM_MODE = 'the settled mode is custom';
const BLANK_ANSWER = 'the answer is blank';
const EDIT_APPLIES = 'the edit applies';
const EDIT_REVERTS = 'the edit reverts';

const TRANSITIONS: readonly Row[] = [
  changes(IDLE, loaded('my-own', 'Other'), 'the slug is not the slugified title', OTHER_CUSTOM),
  changes(IDLE_CUSTOM, LOADED, 'the slug is the slugified title', OTHER),
  loads(TITLE, LOADED, OTHER),
  loads(TITLE_DEFERRED_TITLE, LOADED, OTHER),
  loads(TITLE_DEFERRED_MANUAL, LOADED, OTHER),
  loads(MANUAL, LOADED, OTHER),
  loads(MANUAL_DEFERRED_TITLE, LOADED, OTHER),
  loads(MANUAL_DEFERRED_MANUAL, LOADED, OTHER),
  loads(MANUAL_CUSTOM, LOADED, OTHER),
  loads(MANUAL_CUSTOM_DEFERRED_TITLE, LOADED, OTHER),
  loads(MANUAL_CUSTOM_DEFERRED_MANUAL, LOADED, OTHER),

  changes(IDLE, ACK_SLUG, 'the slug is still the one submitted', { ...IDLE, slug: 'hello-2' }),
  stays(IDLE_CUSTOM, ACK_MISS, 'neither value is still the one submitted'),
  changes(TITLE, ACK_SLUG, 'the slug is still the one submitted', { ...TITLE, slug: 'hello-2' }),
  stays(TITLE_DEFERRED_TITLE, ACK_MISS, 'neither value is still the one submitted'),
  changes(TITLE_DEFERRED_MANUAL, ACK_TITLE, 'the title is still the one submitted', {
    ...TITLE_DEFERRED_MANUAL,
    title: 'Hello!',
  }),
  changes(MANUAL, ACK_SLUG, 'the slug is still the one submitted', { ...MANUAL, slug: 'hello-2' }),
  stays(MANUAL_DEFERRED_TITLE, ACK_MISS, 'neither value is still the one submitted'),
  changes(MANUAL_DEFERRED_MANUAL, ACK_TITLE, 'the title is still the one submitted', {
    ...MANUAL_DEFERRED_MANUAL,
    title: 'Hello!',
  }),
  changes(MANUAL_CUSTOM, ACK_MINE, 'the slug is still the one submitted', {
    ...MANUAL_CUSTOM,
    slug: 'mine-2',
  }),
  stays(MANUAL_CUSTOM_DEFERRED_TITLE, ACK_MISS, 'neither value is still the one submitted'),
  changes(MANUAL_CUSTOM_DEFERRED_MANUAL, ACK_MINE, 'the slug is still the one submitted', {
    ...MANUAL_CUSTOM_DEFERRED_MANUAL,
    slug: 'mine-2',
  }),

  starts(IDLE, title('World'), GENERATES, started(HELLO, 'title', 'World', SUBMISSION)),
  answers(IDLE, title(' Hello '), SOURCE_TITLE, IDLE, SUBMISSION, unchanged('same-title')),
  answers(IDLE, title(' '), BLANK_TITLE, IDLE, SUBMISSION, unchanged('frozen')),
  answers(
    IDLE_CUSTOM,
    title('World'),
    'always',
    IDLE_CUSTOM,
    SUBMISSION,
    unchanged('custom', 'mine'),
  ),
  defers(TITLE, title('Again'), GENERATES, deferredTitle(SUBMISSION)),
  answers(
    TITLE,
    title('Hello'),
    SOURCE_TITLE,
    IDLE,
    SUBMISSION,
    unchanged('same-title'),
    withdrawn(TITLE),
  ),
  answers(TITLE, title(''), BLANK_TITLE, IDLE, SUBMISSION, unchanged('frozen'), withdrawn(TITLE)),
  defers(TITLE_DEFERRED_TITLE, title('Again'), GENERATES, deferredTitle(SUBMISSION)),
  answers(
    TITLE_DEFERRED_TITLE,
    title('Hello'),
    SOURCE_TITLE,
    IDLE,
    SUBMISSION,
    unchanged('same-title'),
    withdrawn(TITLE_DEFERRED_TITLE),
  ),
  defers(TITLE_DEFERRED_MANUAL, title('Again'), GENERATES, deferredTitle(SUBMISSION)),
  answers(
    TITLE_DEFERRED_MANUAL,
    title(''),
    BLANK_TITLE,
    IDLE,
    SUBMISSION,
    unchanged('frozen'),
    withdrawn(TITLE_DEFERRED_MANUAL),
  ),
  defers(MANUAL, title('World'), 'always', deferredTitle(SUBMISSION, 'World')),
  defers(MANUAL_DEFERRED_TITLE, title('World'), 'always', deferredTitle(SUBMISSION, 'World')),
  defers(MANUAL_DEFERRED_MANUAL, title('World'), 'always', deferredTitle(SUBMISSION, 'World')),
  defers(MANUAL_CUSTOM, title('World'), 'always', deferredTitle(SUBMISSION, 'World', 'mine')),
  defers(
    MANUAL_CUSTOM_DEFERRED_TITLE,
    title('World'),
    'always',
    deferredTitle(SUBMISSION, 'World', 'mine'),
  ),
  defers(
    MANUAL_CUSTOM_DEFERRED_MANUAL,
    title('World'),
    'always',
    deferredTitle(SUBMISSION, 'World', 'mine'),
  ),

  starts(IDLE, manual(' mine '), DIFFERS, started(HELLO, 'manual', 'mine', SUBMISSION)),
  answers(IDLE, manual(' hello '), NO_EDIT, IDLE, SUBMISSION, REVERTED),
  starts(IDLE_CUSTOM, manual('yours'), DIFFERS, started(CUSTOM, 'manual', 'yours', SUBMISSION)),
  answers(IDLE_CUSTOM, manual(''), NO_EDIT, IDLE_CUSTOM, SUBMISSION, unchanged('reverted', 'mine')),
  defers(TITLE, manual('mine'), DIFFERS, deferredManual(SUBMISSION, 'mine')),
  answers(TITLE, manual(''), NO_EDIT, TITLE, SUBMISSION, REVERTED),
  defers(TITLE_DEFERRED_TITLE, manual('mine'), DIFFERS, deferredManual(SUBMISSION, 'mine')),
  answers(TITLE_DEFERRED_TITLE, manual(''), NO_EDIT, TITLE_DEFERRED_TITLE, SUBMISSION, REVERTED),
  defers(TITLE_DEFERRED_MANUAL, manual('mine'), DIFFERS, deferredManual(SUBMISSION, 'mine')),
  answers(TITLE_DEFERRED_MANUAL, manual(''), NO_EDIT, TITLE, SUBMISSION, REVERTED, [
    resolve(DEFERRED, STALE),
  ]),
  defers(MANUAL, manual('yours'), DIFFERS, deferredManual(SUBMISSION)),
  answers(MANUAL, manual('hello'), NO_EDIT, IDLE, SUBMISSION, REVERTED, withdrawn(MANUAL)),
  defers(MANUAL_DEFERRED_TITLE, manual('yours'), DIFFERS, deferredManual(SUBMISSION)),
  starts(
    MANUAL_DEFERRED_TITLE,
    manual(''),
    `${NO_EDIT}; ${DEFERRED_GENERATES}`,
    started(HELLO, 'title', 'Again', DEFERRED),
    [resolve(REQUEST, STALE), resolve(SUBMISSION, REVERTED), notify(IDLE, REVERTED)],
  ),
  answers(
    { ...MANUAL, deferred: deferredTitle(DEFERRED, 'Hello') },
    manual(''),
    `${NO_EDIT}; ${DEFERRED_SOURCE_TITLE}`,
    IDLE,
    DEFERRED,
    unchanged('same-title'),
    [resolve(REQUEST, STALE), resolve(SUBMISSION, REVERTED), notify(IDLE, REVERTED)],
  ),
  answers(
    { ...MANUAL, deferred: deferredTitle(DEFERRED, '') },
    manual(''),
    `${NO_EDIT}; ${DEFERRED_BLANK_TITLE}`,
    IDLE,
    DEFERRED,
    unchanged('frozen'),
    [resolve(REQUEST, STALE), resolve(SUBMISSION, REVERTED), notify(IDLE, REVERTED)],
  ),
  defers(MANUAL_DEFERRED_MANUAL, manual('yours'), DIFFERS, deferredManual(SUBMISSION)),
  answers(
    MANUAL_DEFERRED_MANUAL,
    manual(''),
    NO_EDIT,
    IDLE,
    SUBMISSION,
    REVERTED,
    withdrawn(MANUAL_DEFERRED_MANUAL),
  ),
  defers(MANUAL_CUSTOM, manual('theirs'), DIFFERS, deferredManual(SUBMISSION, 'theirs', 'mine')),
  answers(
    MANUAL_CUSTOM,
    manual('mine'),
    NO_EDIT,
    IDLE_CUSTOM,
    SUBMISSION,
    REVERTED_MINE,
    withdrawn(MANUAL_CUSTOM),
  ),
  defers(
    MANUAL_CUSTOM_DEFERRED_TITLE,
    manual('theirs'),
    DIFFERS,
    deferredManual(SUBMISSION, 'theirs', 'mine'),
  ),
  answers(
    MANUAL_CUSTOM_DEFERRED_TITLE,
    manual(''),
    `${NO_EDIT}; ${CUSTOM_MODE}`,
    IDLE_CUSTOM,
    DEFERRED,
    CUSTOM_MINE,
    [
      staled(MANUAL_CUSTOM.request),
      resolve(SUBMISSION, REVERTED_MINE),
      notify(IDLE_CUSTOM, REVERTED_MINE),
    ],
  ),
  defers(
    MANUAL_CUSTOM_DEFERRED_MANUAL,
    manual('other'),
    DIFFERS,
    deferredManual(SUBMISSION, 'other', 'mine'),
  ),
  answers(
    MANUAL_CUSTOM_DEFERRED_MANUAL,
    manual(''),
    NO_EDIT,
    IDLE_CUSTOM,
    SUBMISSION,
    REVERTED_MINE,
    withdrawn(MANUAL_CUSTOM_DEFERRED_MANUAL),
  ),

  stays(IDLE, ok('world'), NO_WIRE),
  stays(IDLE_CUSTOM, ok('world'), NO_WIRE),
  answers(TITLE, ok('world'), 'the answer is not blank', WORLD, REQUEST, generated('world')),
  answers(TITLE, ok('  '), 'the answer is blank', IDLE, REQUEST, unchanged('empty-result')),
  starts(
    TITLE_DEFERRED_TITLE,
    ok('world'),
    DEFERRED_GENERATES,
    started(WORLD, 'title', 'Again', DEFERRED),
    finished(WORLD, generated('world')),
  ),
  answers(
    { ...TITLE, deferred: deferredTitle(DEFERRED, 'World') },
    ok('world'),
    DEFERRED_SOURCE_TITLE,
    WORLD,
    DEFERRED,
    unchanged('same-title', 'world'),
    finished(WORLD, generated('world')),
  ),
  answers(
    TITLE_FROM_EMPTY_DEFERRED_UNTITLED,
    ok('hi'),
    'the deferred title is (Untitled) and the answer is the first slug',
    HI,
    DEFERRED,
    unchanged('frozen', 'hi'),
    finished(HI, generated('hi')),
  ),
  starts(
    TITLE_DEFERRED_TITLE,
    ok(''),
    `${BLANK_ANSWER}; ${DEFERRED_GENERATES}`,
    started(HELLO, 'title', 'Again', DEFERRED),
    finished(IDLE, unchanged('empty-result')),
  ),
  starts(
    TITLE_DEFERRED_MANUAL,
    ok('world'),
    DEFERRED_DIFFERS,
    started(WORLD, 'manual', 'yours', DEFERRED),
    finished(WORLD, generated('world')),
  ),
  answers(
    { ...TITLE, deferred: deferredManual(DEFERRED, 'world') },
    ok('world'),
    DEFERRED_IS_SLUG,
    WORLD,
    DEFERRED,
    unchanged('reverted', 'world'),
    finished(WORLD, generated('world')),
  ),
  starts(
    TITLE_DEFERRED_MANUAL,
    ok(''),
    `${BLANK_ANSWER}; ${DEFERRED_DIFFERS}`,
    started(HELLO, 'manual', 'yours', DEFERRED),
    finished(IDLE, unchanged('empty-result')),
  ),
  answers(MANUAL, ok('mine'), 'the answer is applied', IDLE_CUSTOM, REQUEST, applied('mine')),
  answers(MANUAL, ok('hello'), 'the answer is the current slug', IDLE, REQUEST, REVERTED),
  answers(
    MANUAL,
    ok('hello-2'),
    'the answer only appends a counter to the slug',
    IDLE,
    REQUEST,
    REVERTED,
  ),
  answers(MANUAL, ok(''), 'the answer is blank', IDLE, REQUEST, unchanged('empty-result')),
  answers(
    MANUAL_DEFERRED_TITLE,
    ok('mine'),
    'the edit applies',
    IDLE_CUSTOM,
    DEFERRED,
    unchanged('custom', 'mine'),
    finished(IDLE_CUSTOM, applied('mine')),
  ),
  starts(
    MANUAL_DEFERRED_TITLE,
    ok('hello'),
    `${EDIT_REVERTS}; ${DEFERRED_GENERATES}`,
    started(HELLO, 'title', 'Again', DEFERRED),
    finished(IDLE, REVERTED),
  ),
  answers(
    { ...MANUAL, deferred: deferredTitle(DEFERRED, 'Hello') },
    ok('hello'),
    `${EDIT_REVERTS}; ${DEFERRED_SOURCE_TITLE}`,
    IDLE,
    DEFERRED,
    unchanged('same-title'),
    finished(IDLE, REVERTED),
  ),
  answers(
    { ...MANUAL, deferred: deferredTitle(DEFERRED, '') },
    ok('hello'),
    `${EDIT_REVERTS}; ${DEFERRED_BLANK_TITLE}`,
    IDLE,
    DEFERRED,
    unchanged('frozen'),
    finished(IDLE, REVERTED),
  ),
  starts(
    MANUAL_DEFERRED_TITLE,
    ok(''),
    `${BLANK_ANSWER}; ${DEFERRED_GENERATES}`,
    started(HELLO, 'title', 'Again', DEFERRED),
    finished(IDLE, unchanged('empty-result')),
  ),
  starts(
    MANUAL_DEFERRED_MANUAL,
    ok('mine'),
    `${EDIT_APPLIES}; ${DEFERRED_DIFFERS}`,
    started(CUSTOM, 'manual', 'yours', DEFERRED),
    finished(IDLE_CUSTOM, applied('mine')),
  ),
  answers(
    { ...MANUAL, deferred: deferredManual(DEFERRED, 'mine') },
    ok('mine'),
    `${EDIT_APPLIES}; ${DEFERRED_IS_SLUG}`,
    IDLE_CUSTOM,
    DEFERRED,
    REVERTED_MINE,
    finished(IDLE_CUSTOM, applied('mine')),
  ),
  starts(
    MANUAL_DEFERRED_MANUAL,
    ok('hello'),
    `${EDIT_REVERTS}; ${DEFERRED_DIFFERS}`,
    started(HELLO, 'manual', 'yours', DEFERRED),
    finished(IDLE, REVERTED),
  ),
  starts(
    MANUAL_DEFERRED_MANUAL,
    ok(''),
    `${BLANK_ANSWER}; ${DEFERRED_DIFFERS}`,
    started(HELLO, 'manual', 'yours', DEFERRED),
    finished(IDLE, unchanged('empty-result')),
  ),
  answers(MANUAL_CUSTOM, ok('yours'), 'the answer is applied', YOURS, REQUEST, applied('yours')),
  answers(
    MANUAL_CUSTOM,
    ok('mine'),
    'the answer is the current slug',
    IDLE_CUSTOM,
    REQUEST,
    REVERTED_MINE,
  ),
  answers(
    MANUAL_CUSTOM,
    ok(''),
    BLANK_ANSWER,
    IDLE_CUSTOM,
    REQUEST,
    unchanged('empty-result', 'mine'),
  ),
  answers(
    MANUAL_CUSTOM_DEFERRED_TITLE,
    ok('yours'),
    EDIT_APPLIES,
    YOURS,
    DEFERRED,
    unchanged('custom', 'yours'),
    finished(YOURS, applied('yours')),
  ),
  answers(
    MANUAL_CUSTOM_DEFERRED_TITLE,
    ok('mine'),
    `${EDIT_REVERTS}; ${CUSTOM_MODE}`,
    IDLE_CUSTOM,
    DEFERRED,
    CUSTOM_MINE,
    finished(IDLE_CUSTOM, REVERTED_MINE),
  ),
  starts(
    MANUAL_CUSTOM_DEFERRED_MANUAL,
    ok('yours'),
    `${EDIT_APPLIES}; ${DEFERRED_DIFFERS}`,
    started(YOURS, 'manual', 'theirs', DEFERRED),
    finished(YOURS, applied('yours')),
  ),
  starts(
    MANUAL_CUSTOM_DEFERRED_MANUAL,
    ok('mine'),
    `${EDIT_REVERTS}; ${DEFERRED_DIFFERS}`,
    started(CUSTOM, 'manual', 'theirs', DEFERRED),
    finished(IDLE_CUSTOM, REVERTED_MINE),
  ),

  stays(IDLE, failed(), NO_WIRE),
  stays(IDLE_CUSTOM, failed(), NO_WIRE),
  answers(TITLE, failed(), 'always', IDLE, REQUEST, ERROR),
  starts(
    TITLE_DEFERRED_TITLE,
    failed(),
    DEFERRED_GENERATES,
    started(HELLO, 'title', 'Again', DEFERRED),
    finished(IDLE, ERROR),
  ),
  starts(
    TITLE_DEFERRED_MANUAL,
    failed(),
    DEFERRED_DIFFERS,
    started(HELLO, 'manual', 'yours', DEFERRED),
    finished(IDLE, ERROR),
  ),
  answers(MANUAL, failed(), 'always', IDLE, REQUEST, ERROR),
  starts(
    MANUAL_DEFERRED_TITLE,
    failed(),
    DEFERRED_GENERATES,
    started(HELLO, 'title', 'Again', DEFERRED),
    finished(IDLE, ERROR),
  ),
  answers(
    { ...MANUAL, deferred: deferredTitle(DEFERRED, 'Hello') },
    failed(),
    DEFERRED_SOURCE_TITLE,
    IDLE,
    DEFERRED,
    unchanged('same-title'),
    finished(IDLE, ERROR),
  ),
  answers(
    { ...MANUAL, deferred: deferredTitle(DEFERRED, '') },
    failed(),
    DEFERRED_BLANK_TITLE,
    IDLE,
    DEFERRED,
    unchanged('frozen'),
    finished(IDLE, ERROR),
  ),
  starts(
    MANUAL_DEFERRED_MANUAL,
    failed(),
    DEFERRED_DIFFERS,
    started(HELLO, 'manual', 'yours', DEFERRED),
    finished(IDLE, ERROR),
  ),
  answers(MANUAL_CUSTOM, failed(), 'always', IDLE_CUSTOM, REQUEST, ERROR_MINE),
  answers(
    MANUAL_CUSTOM_DEFERRED_TITLE,
    failed(),
    CUSTOM_MODE,
    IDLE_CUSTOM,
    DEFERRED,
    CUSTOM_MINE,
    finished(IDLE_CUSTOM, ERROR_MINE),
  ),
  starts(
    MANUAL_CUSTOM_DEFERRED_MANUAL,
    failed(),
    DEFERRED_DIFFERS,
    started(CUSTOM, 'manual', 'theirs', DEFERRED),
    finished(IDLE_CUSTOM, ERROR_MINE),
  ),
];

function describeState(state: SlugState): string {
  if (state.kind === 'idle') {
    return `idle(${state.mode})`;
  }
  const parts: string[] = [state.request.kind];
  if (state.deferred) {
    parts.push(`deferred ${state.deferred.submission.kind}`);
  }
  // The settled mode is only named when it is custom; derived is the default.
  return `generating(${parts.join(', ')}${state.mode === 'custom' ? '; custom' : ''})`;
}

function describeEvent(event: SlugEvent): string {
  switch (event.type) {
    case 'submitted':
      return `submitted(${event.submission.kind})`;
    case 'settled':
      return `settled(${'ok' in event.outcome ? 'ok' : 'error'})`;
    default:
      return event.type;
  }
}

function describeOutcome(proposal: SlugProposal): string {
  return proposal.source === 'unchanged' ? proposal.reason : proposal.source;
}

// Names the ticket an effect settles by where the reduced state held it.
function describeTicket(row: Row, ticket: number): string {
  if (row.event.type === 'submitted' && ticket === row.event.ticket) {
    return 'submission';
  }
  if (row.from.kind === 'generating' && ticket === row.from.request.ticket) {
    return 'request';
  }
  if (row.from.kind === 'generating' && ticket === row.from.deferred?.ticket) {
    return 'deferred';
  }
  throw new Error(`ticket ${ticket} is not held by ${describeState(row.from)}`);
}

function describeEffect(row: Row, effect: SlugEffect): string {
  switch (effect.type) {
    case 'request':
      return `request(${describeTicket(row, effect.ticket)})`;
    case 'resolve':
      return `resolve(${describeTicket(row, effect.ticket)}: ${describeOutcome(effect.proposal)})`;
    case 'notify':
      return `notify(${effect.proposal ? describeOutcome(effect.proposal) : 'null'})`;
  }
}

function describeEffects(row: Row): string {
  if (row.effects.length === 0) {
    return 'none';
  }
  return row.effects.map((effect) => describeEffect(row, effect)).join(', ');
}

function renderRow(row: Row): string[] {
  return [
    `\`${describeState(row.from)}\``,
    `\`${describeEvent(row.event)}\``,
    row.when,
    `\`${describeState(row.to)}\``,
    describeEffects(row),
  ];
}

// The README's table is checked against TRANSITIONS; header and separator rows are skipped.
function readmeTable(): string[][] {
  const start = readme.indexOf('<!-- slug-machine-transitions:start -->');
  const end = readme.indexOf('<!-- slug-machine-transitions:end -->');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return readme
    .slice(start, end)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))
    .slice(2)
    .map((line) =>
      line
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim()),
    );
}

const pair = (state: SlugState, event: SlugEvent): string =>
  `${describeState(state)} + ${describeEvent(event)}`;

describe('slug machine transition', () => {
  it.each(
    TRANSITIONS.map((row) => {
      const label = `${describeState(row.from)} --${describeEvent(row.event)}--> ${describeState(row.to)} when ${row.when}: ${describeEffects(row)}`;
      return [label, row] as const;
    }),
  )('%s', (_label, row) => {
    expect(reduceSlug(row.from, row.event)).toEqual({ state: row.to, effects: row.effects });
  });

  it('has a row for every state and event pair', () => {
    const covered = new Set(TRANSITIONS.map((row) => pair(row.from, row.event)));
    const expected = STATES.flatMap((state) => EVENTS.map((event) => pair(state, event)));
    expect(expected.filter((key) => !covered.has(key))).toEqual([]);
    expect(new Set(TRANSITIONS.map((row) => describeState(row.from)))).toEqual(
      new Set(STATES.map(describeState)),
    );
  });

  it('is the table in the engine README', () => {
    expect(readmeTable()).toEqual(TRANSITIONS.map(renderRow));
  });

  it.each(STATES.map((state) => [describeState(state), state] as const))(
    '%s ignores an answer for a ticket that is not on the wire',
    (_label, state) => {
      for (const ticket of [REQUEST - 1, DEFERRED]) {
        for (const event of [ok('late', ticket), failed(ticket)]) {
          expect(reduceSlug(state, event)).toEqual({ state, effects: [] });
        }
      }
    },
  );
});
