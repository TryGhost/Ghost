import { describe, expect, it } from 'vitest';
import {
  transition,
  type SaveEngineContext,
  type SaveEngineEvent,
  type SaveEngineState,
  type SaveError,
  type SaveErrorKind,
  type SaveIntent,
} from './save-engine';
import {
  conflict,
  hostLimit,
  notFound,
  sessionInvalid,
  transport,
  unknown,
  validation,
} from './__test-utils__/engine-harness';

type StateKind = SaveEngineState['kind'];
type EventKind = SaveEngineEvent['kind'];

const ERRORS: Record<SaveErrorKind, SaveError> = {
  'session-invalid': sessionInvalid,
  'not-found': notFound,
  conflict,
  'host-limit': hostLimit,
  transport,
  validation,
  unknown,
};

// One representative per state; a row's `from` names one of these.
const STATES: { [K in StateKind]: Extract<SaveEngineState, { kind: K }> } = {
  idle: { kind: 'idle' },
  debouncing: { kind: 'debouncing' },
  saving: { kind: 'saving', intent: 'autosave' },
  'pending-coalesced': { kind: 'pending-coalesced', intent: 'autosave', pending: 'explicit' },
  'reauth-pending': { kind: 'reauth-pending', intent: 'explicit' },
  error: { kind: 'error', intent: 'field', error: validation },
  conflict: { kind: 'conflict', intent: 'explicit', error: conflict },
  halted: { kind: 'halted' },
  crashed: { kind: 'crashed' },
  disposed: { kind: 'disposed' },
};

function queue(fields: Partial<SaveEngineContext> = {}): SaveEngineContext {
  return { inFlight: null, pending: null, frozen: false, armed: false, ...fields };
}

function failed(kind: SaveErrorKind, intent: SaveIntent, persisted = true): SaveEngineEvent {
  return { kind: 'save-failed', intent, error: ERRORS[kind], persisted };
}

const TIMER_ARMED: SaveEngineEvent = { kind: 'timer-armed' };
const COALESCED: SaveEngineEvent = { kind: 'coalesced' };
const SAVE_STARTED: SaveEngineEvent = { kind: 'save-started' };
const DRAINED: SaveEngineEvent = { kind: 'drained' };
const REAUTH_ABANDONED: SaveEngineEvent = { kind: 'reauth-abandoned', error: sessionInvalid };
const CONTENT_RELOADED: SaveEngineEvent = { kind: 'content-reloaded' };
const DISPOSED: SaveEngineEvent = { kind: 'disposed' };

const EMPTY = queue();
const ARMED = queue({ armed: true });
const EXPLICIT_IN_FLIGHT = queue({ inFlight: 'explicit' });
const EXPLICIT_PENDING = queue({ inFlight: 'autosave', pending: 'explicit' });

const saving = (intent: SaveIntent): SaveEngineState => ({ kind: 'saving', intent });
const errorState = (intent: SaveIntent, kind: SaveErrorKind): SaveEngineState => ({
  kind: 'error',
  intent,
  error: ERRORS[kind],
});

type TransitionRow = readonly [
  from: StateKind,
  event: SaveEngineEvent,
  queue: SaveEngineContext,
  to: SaveEngineState,
];

/** The state chart. A (state, event) pair with no row leaves the state unchanged for any queue. */
const TRANSITIONS: readonly TransitionRow[] = [
  ['idle', TIMER_ARMED, ARMED, { kind: 'debouncing' }],
  ['debouncing', TIMER_ARMED, ARMED, { kind: 'debouncing' }],
  ['saving', TIMER_ARMED, queue({ inFlight: 'autosave', armed: true }), STATES.saving],
  [
    'pending-coalesced',
    TIMER_ARMED,
    queue({ inFlight: 'autosave', pending: 'explicit', armed: true }),
    STATES['pending-coalesced'],
  ],
  ['reauth-pending', TIMER_ARMED, queue({ frozen: true, armed: true }), STATES['reauth-pending']],
  ['reauth-pending', TIMER_ARMED, ARMED, { kind: 'debouncing' }],
  ['error', TIMER_ARMED, ARMED, STATES.error],
  ['conflict', TIMER_ARMED, ARMED, STATES.conflict],

  ['idle', COALESCED, EXPLICIT_PENDING, STATES['pending-coalesced']],
  ['debouncing', COALESCED, EXPLICIT_PENDING, STATES['pending-coalesced']],
  ['saving', COALESCED, EXPLICIT_PENDING, STATES['pending-coalesced']],
  [
    'pending-coalesced',
    COALESCED,
    queue({ inFlight: 'autosave', pending: 'publish' }),
    { kind: 'pending-coalesced', intent: 'autosave', pending: 'publish' },
  ],
  [
    'reauth-pending',
    COALESCED,
    queue({ frozen: true, pending: 'autosave' }),
    STATES['reauth-pending'],
  ],
  ['error', COALESCED, EXPLICIT_PENDING, STATES['pending-coalesced']],
  ['conflict', COALESCED, EXPLICIT_PENDING, STATES['pending-coalesced']],

  ['idle', SAVE_STARTED, EXPLICIT_IN_FLIGHT, saving('explicit')],
  ['debouncing', SAVE_STARTED, EXPLICIT_IN_FLIGHT, saving('explicit')],
  ['saving', SAVE_STARTED, EXPLICIT_IN_FLIGHT, saving('explicit')],
  ['pending-coalesced', SAVE_STARTED, EXPLICIT_IN_FLIGHT, saving('explicit')],
  ['reauth-pending', SAVE_STARTED, EXPLICIT_IN_FLIGHT, saving('explicit')],
  ['error', SAVE_STARTED, EXPLICIT_IN_FLIGHT, saving('explicit')],
  ['conflict', SAVE_STARTED, EXPLICIT_IN_FLIGHT, saving('explicit')],

  ['idle', DRAINED, EMPTY, { kind: 'idle' }],
  ['debouncing', DRAINED, EMPTY, { kind: 'idle' }],
  ['saving', DRAINED, EMPTY, { kind: 'idle' }],
  ['saving', DRAINED, ARMED, { kind: 'debouncing' }],
  ['pending-coalesced', DRAINED, EMPTY, { kind: 'idle' }],
  ['reauth-pending', DRAINED, EMPTY, { kind: 'idle' }],
  ['error', DRAINED, ARMED, STATES.error],
  ['conflict', DRAINED, EMPTY, STATES.conflict],

  [
    'saving',
    failed('session-invalid', 'autosave'),
    EMPTY,
    { kind: 'reauth-pending', intent: 'autosave' },
  ],
  ['saving', failed('not-found', 'autosave'), EMPTY, { kind: 'halted' }],
  ['saving', failed('not-found', 'autosave', false), EMPTY, { kind: 'crashed' }],
  [
    'saving',
    failed('conflict', 'autosave'),
    EMPTY,
    { kind: 'conflict', intent: 'autosave', error: conflict },
  ],
  ['saving', failed('validation', 'autosave'), EMPTY, errorState('autosave', 'validation')],
  ['saving', failed('host-limit', 'autosave'), EMPTY, errorState('autosave', 'host-limit')],
  ['saving', failed('transport', 'autosave'), EMPTY, errorState('autosave', 'transport')],
  ['saving', failed('unknown', 'autosave'), EMPTY, errorState('autosave', 'unknown')],
  ['idle', failed('unknown', 'explicit'), EMPTY, errorState('explicit', 'unknown')],
  ['debouncing', failed('unknown', 'autosave'), EMPTY, errorState('autosave', 'unknown')],
  [
    'pending-coalesced',
    failed('transport', 'autosave'),
    EMPTY,
    errorState('autosave', 'transport'),
  ],
  ['reauth-pending', failed('unknown', 'explicit'), EMPTY, errorState('explicit', 'unknown')],
  ['error', failed('transport', 'explicit'), EMPTY, errorState('explicit', 'transport')],
  ['conflict', failed('unknown', 'explicit'), EMPTY, errorState('explicit', 'unknown')],

  ['reauth-pending', REAUTH_ABANDONED, EMPTY, errorState('explicit', 'session-invalid')],

  ['conflict', CONTENT_RELOADED, EMPTY, { kind: 'idle' }],
  ['conflict', CONTENT_RELOADED, ARMED, { kind: 'debouncing' }],

  ['idle', DISPOSED, EMPTY, { kind: 'disposed' }],
  ['debouncing', DISPOSED, EMPTY, { kind: 'disposed' }],
  ['saving', DISPOSED, EMPTY, { kind: 'disposed' }],
  ['pending-coalesced', DISPOSED, EMPTY, { kind: 'disposed' }],
  ['reauth-pending', DISPOSED, EMPTY, { kind: 'disposed' }],
  ['error', DISPOSED, EMPTY, { kind: 'disposed' }],
  ['conflict', DISPOSED, EMPTY, { kind: 'disposed' }],
  ['halted', DISPOSED, EMPTY, { kind: 'disposed' }],
  ['crashed', DISPOSED, EMPTY, { kind: 'disposed' }],
];

// Every payload shape an event can take, so an unlisted pair is checked against all of them.
const EVENT_SAMPLES: { [K in EventKind]: ReadonlyArray<Extract<SaveEngineEvent, { kind: K }>> } = {
  'timer-armed': [{ kind: 'timer-armed' }],
  coalesced: [{ kind: 'coalesced' }],
  'save-started': [{ kind: 'save-started' }],
  drained: [{ kind: 'drained' }],
  'save-failed': Object.values(ERRORS).flatMap((error) => [
    { kind: 'save-failed', intent: 'explicit', error, persisted: true } as const,
    { kind: 'save-failed', intent: 'explicit', error, persisted: false } as const,
  ]),
  'reauth-abandoned': [{ kind: 'reauth-abandoned', error: sessionInvalid }],
  'content-reloaded': [{ kind: 'content-reloaded' }],
  disposed: [{ kind: 'disposed' }],
};

const QUEUES: SaveEngineContext[] = [null, 'explicit' as const].flatMap((inFlight) =>
  [null, 'autosave' as const].flatMap((pending) =>
    [false, true].flatMap((frozen) =>
      [false, true].map((armed) => ({ inFlight, pending, frozen, armed })),
    ),
  ),
);

function describeState(state: SaveEngineState): string {
  switch (state.kind) {
    case 'saving':
    case 'reauth-pending':
      return `${state.kind}(${state.intent})`;
    case 'pending-coalesced':
      return `${state.kind}(${state.intent}, ${state.pending})`;
    case 'error':
    case 'conflict':
      return `${state.kind}(${state.intent}, ${state.error.kind})`;
    default:
      return state.kind;
  }
}

function describeEvent(event: SaveEngineEvent): string {
  switch (event.kind) {
    case 'save-failed':
      return `${event.kind}(${event.intent}, ${event.error.kind}${event.persisted ? '' : ', new post'})`;
    case 'reauth-abandoned':
      return `${event.kind}(${event.error.kind})`;
    default:
      return event.kind;
  }
}

function describeQueue(context: SaveEngineContext): string {
  const parts = [
    context.inFlight && `${context.inFlight} in flight`,
    context.pending && `${context.pending} pending`,
    context.frozen && 'frozen',
    context.armed && 'timer armed',
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'empty';
}

const STATE_KINDS = Object.keys(STATES) as StateKind[];
const EVENT_KINDS = Object.keys(EVENT_SAMPLES) as EventKind[];
const named = new Set(TRANSITIONS.map(([from, event]) => `${from} ${event.kind}`));
const unnamed = STATE_KINDS.flatMap((state) =>
  EVENT_KINDS.filter((event) => !named.has(`${state} ${event}`)).map(
    (event) => [state, event] as const,
  ),
);

describe('save engine transition', () => {
  it.each(
    TRANSITIONS.map((row) => {
      const [from, event, context, to] = row;
      const title = `${describeState(STATES[from])} --${describeEvent(event)}--> ${describeState(to)} (queue: ${describeQueue(context)})`;
      return [title, row] as const;
    }),
  )('%s', (_title, [from, event, context, to]) => {
    expect(transition(STATES[from], event, context)).toEqual(to);
  });

  it.each(unnamed)('%s ignores %s under every queue', (stateKind, eventKind) => {
    const state = STATES[stateKind];
    for (const event of EVENT_SAMPLES[eventKind]) {
      for (const context of QUEUES) {
        expect(transition(state, event, context)).toBe(state);
      }
    }
  });
});
