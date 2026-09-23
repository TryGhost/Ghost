import { describe, expect, it } from 'vitest';
import {
  INITIAL_SLUG_STATE,
  transition,
  viewSlugState,
  type DeferredSubmission,
  type SlugEvent,
  type SlugOutput,
  type SlugState,
  type SlugStep,
  type UnchangedReason,
} from './slug-machine';

type IdleState = Extract<SlugState, { kind: 'idle' }>;
type GeneratingState = Extract<SlugState, { kind: 'generating' }>;

const HELLO = {
  mode: 'derived',
  slug: 'hello',
  title: 'Hello',
  lastCommittedTitle: 'Hello',
} as const;
const BOOM = new Error('boom');

const idle = (patch: Partial<IdleState> = {}): IdleState => ({
  kind: 'idle',
  ticket: 3,
  ...HELLO,
  ...patch,
});

const generating = (
  source: GeneratingState['source'],
  request: string | null,
  patch: Partial<GeneratingState> = {},
): GeneratingState => ({
  kind: 'generating',
  ticket: 4,
  source,
  request,
  deferred: null,
  ...HELLO,
  ...patch,
});

const title = (value: string): SlugEvent => ({ kind: 'title-committed', title: value });
const edit = (input: string): SlugEvent => ({ kind: 'slug-edited', input });
const answered = (ticket: number, result: string): SlugEvent => ({
  kind: 'answered',
  ticket,
  result,
});
const failed = (ticket: number): SlugEvent => ({ kind: 'failed', ticket, error: BOOM });
const released = (ticket: number): SlugEvent => ({ kind: 'released', ticket });
const loaded = (slug: string, postTitle: string): SlugEvent => ({
  kind: 'loaded',
  post: { slug, title: postTitle },
});
const acknowledged = (slug: string): SlugEvent => ({
  kind: 'acknowledged',
  submitted: { slug: 'hello', title: 'Hello' },
  acknowledged: { slug, title: 'Hello' },
});

const DEFERRED_EDIT: DeferredSubmission = {
  submission: { source: 'manual', value: 'mine' },
  slugAtSubmission: 'hello',
};
const DEFERRED_TITLE: DeferredSubmission = {
  submission: { source: 'title', value: 'World' },
  slugAtSubmission: 'hello',
};

const IDLE = idle();
const IDLE_CUSTOM = idle({ mode: 'custom', slug: 'mine' });
const TITLE_LIVE = generating('title', 'World', { lastCommittedTitle: 'World' });
const TITLE_ANSWERED = generating('title', null, {
  slug: 'world',
  title: 'World',
  lastCommittedTitle: 'World',
});
const MANUAL_LIVE = generating('manual', 'mine');
const MANUAL_HELD = generating('manual', null);
const MANUAL_APPLIED = generating('manual', null, { mode: 'custom', slug: 'mine' });

const SILENT: SlugOutput = { kind: 'silent' };
const CHANGED: SlugOutput = { kind: 'changed' };
const requested = (ticket: number, text: string): SlugOutput => ({
  kind: 'requested',
  ticket,
  text,
});
const refused = (ticket: number, reason: UnchangedReason, slug = 'hello'): SlugOutput => ({
  kind: 'refused',
  ticket,
  proposal: { slug, source: 'unchanged', reason },
});
const unchanged = (reason: UnchangedReason, slug = 'hello', error?: unknown): SlugOutput => ({
  kind: 'proposed',
  proposal: { slug, source: 'unchanged', reason, ...(error !== undefined && { error }) },
});
const applied = (slug: string, source: 'generated' | 'manual'): SlugOutput => ({
  kind: 'proposed',
  proposal: { slug, source },
});

interface TransitionRow {
  readonly from: SlugState;
  readonly event: SlugEvent;
  readonly when: string;
  readonly to: SlugState;
  readonly output: SlugOutput;
  readonly dropped?: DeferredSubmission;
  readonly promoted?: DeferredSubmission;
}

/** The transition table. Answers and releases for a ticket that does not hold the slot are silent. */
const TRANSITIONS: readonly TransitionRow[] = [
  {
    from: IDLE,
    event: title('World'),
    when: 'the title generates',
    to: generating('title', 'World', { lastCommittedTitle: 'World' }),
    output: requested(4, 'World'),
  },
  {
    from: IDLE,
    event: title(' Hello '),
    when: "it is the slug's source title",
    to: generating('title', null),
    output: refused(4, 'same-title'),
  },
  {
    from: IDLE,
    event: title(' '),
    when: 'the title is blank',
    to: generating('title', null, { lastCommittedTitle: '' }),
    output: refused(4, 'frozen'),
  },
  {
    from: IDLE_CUSTOM,
    event: title('World'),
    when: 'always',
    to: generating('title', null, { mode: 'custom', slug: 'mine', lastCommittedTitle: 'World' }),
    output: refused(4, 'custom', 'mine'),
  },
  {
    from: IDLE,
    event: edit(' mine '),
    when: 'the input differs from the slug',
    to: MANUAL_LIVE,
    output: requested(4, 'mine'),
  },
  {
    from: IDLE,
    event: edit(' hello '),
    when: 'the input is blank or the slug',
    to: MANUAL_HELD,
    output: refused(4, 'reverted'),
  },
  {
    from: IDLE,
    event: answered(3, 'late'),
    when: 'always',
    to: IDLE,
    output: SILENT,
  },
  {
    from: IDLE,
    event: loaded('my-own', 'Other'),
    when: 'the slug is not the slugified title',
    to: idle({ mode: 'custom', slug: 'my-own', title: 'Other', lastCommittedTitle: 'Other' }),
    output: CHANGED,
  },
  {
    from: IDLE_CUSTOM,
    event: loaded('other', 'Other'),
    when: 'the slug is the slugified title',
    to: idle({ slug: 'other', title: 'Other', lastCommittedTitle: 'Other' }),
    output: CHANGED,
  },
  {
    from: IDLE,
    event: acknowledged('hello-2'),
    when: 'the slug is still the one submitted',
    to: idle({ slug: 'hello-2' }),
    output: CHANGED,
  },
  {
    from: TITLE_LIVE,
    event: answered(4, 'world'),
    when: 'the ticket holds the slot',
    to: TITLE_ANSWERED,
    output: applied('world', 'generated'),
  },
  {
    from: TITLE_LIVE,
    event: answered(3, 'late'),
    when: 'the ticket is older',
    to: TITLE_LIVE,
    output: SILENT,
  },
  {
    from: TITLE_LIVE,
    event: answered(4, '  '),
    when: 'the answer is blank',
    to: generating('title', null, { lastCommittedTitle: 'World' }),
    output: unchanged('empty-result'),
  },
  {
    from: TITLE_LIVE,
    event: failed(4),
    when: 'the ticket holds the slot',
    to: generating('title', null, { lastCommittedTitle: 'World' }),
    output: unchanged('error', 'hello', BOOM),
  },
  {
    from: TITLE_LIVE,
    event: title('Again'),
    when: 'the title generates',
    to: {
      ...TITLE_LIVE,
      lastCommittedTitle: 'Again',
      deferred: { submission: { source: 'title', value: 'Again' }, slugAtSubmission: 'hello' },
    },
    output: {
      kind: 'deferred',
      deferred: { submission: { source: 'title', value: 'Again' }, slugAtSubmission: 'hello' },
    },
  },
  {
    from: { ...TITLE_LIVE, deferred: DEFERRED_EDIT },
    event: title('Hello'),
    when: "it is the slug's source title",
    to: generating('title', null),
    output: unchanged('same-title'),
    dropped: DEFERRED_EDIT,
  },
  {
    from: TITLE_LIVE,
    event: title(''),
    when: 'the title is blank',
    to: generating('title', null, { lastCommittedTitle: '' }),
    output: unchanged('frozen'),
  },
  {
    from: TITLE_LIVE,
    event: edit('mine'),
    when: 'the input differs from the slug',
    to: { ...TITLE_LIVE, deferred: DEFERRED_EDIT },
    output: { kind: 'deferred', deferred: DEFERRED_EDIT },
  },
  {
    from: { ...TITLE_LIVE, deferred: DEFERRED_EDIT },
    event: edit(''),
    when: 'the input is blank or the slug',
    to: TITLE_LIVE,
    output: unchanged('reverted'),
    dropped: DEFERRED_EDIT,
  },
  {
    from: { ...TITLE_LIVE, deferred: DEFERRED_EDIT },
    event: loaded('hello', 'Hello'),
    when: 'always',
    to: idle({ ticket: 4 }),
    output: CHANGED,
    dropped: DEFERRED_EDIT,
  },
  {
    from: TITLE_ANSWERED,
    event: acknowledged('hello-2'),
    when: 'the slug moved on since the save',
    to: TITLE_ANSWERED,
    output: SILENT,
  },
  {
    from: TITLE_ANSWERED,
    event: released(4),
    when: 'nothing is deferred',
    to: idle({ ticket: 4, slug: 'world', title: 'World', lastCommittedTitle: 'World' }),
    output: SILENT,
  },
  {
    from: { ...TITLE_ANSWERED, deferred: DEFERRED_EDIT },
    event: released(4),
    when: 'an edit is deferred',
    to: generating('manual', 'mine', {
      ticket: 5,
      slug: 'world',
      title: 'World',
      lastCommittedTitle: 'World',
    }),
    output: requested(5, 'mine'),
    promoted: DEFERRED_EDIT,
  },
  {
    from: MANUAL_LIVE,
    event: answered(4, 'mine'),
    when: 'the ticket holds the slot',
    to: MANUAL_APPLIED,
    output: applied('mine', 'manual'),
  },
  {
    from: MANUAL_LIVE,
    event: answered(4, 'hello'),
    when: 'the answer is the current slug',
    to: MANUAL_HELD,
    output: unchanged('reverted'),
  },
  {
    from: MANUAL_LIVE,
    event: answered(4, 'hello-2'),
    when: 'the answer only appends a counter to the slug',
    to: MANUAL_HELD,
    output: unchanged('reverted'),
  },
  {
    from: MANUAL_LIVE,
    event: edit('hello'),
    when: 'the input is blank or the slug',
    to: MANUAL_HELD,
    output: unchanged('reverted'),
  },
  {
    from: MANUAL_HELD,
    event: answered(4, 'mine'),
    when: 'the request was withdrawn',
    to: MANUAL_HELD,
    output: SILENT,
  },
  {
    from: MANUAL_LIVE,
    event: title('World'),
    when: 'always',
    to: { ...MANUAL_LIVE, deferred: DEFERRED_TITLE },
    output: { kind: 'deferred', deferred: DEFERRED_TITLE },
  },
  {
    from: { ...MANUAL_APPLIED, deferred: DEFERRED_TITLE },
    event: released(4),
    when: 'the edit applied and a title is deferred',
    to: generating('title', null, {
      ticket: 5,
      mode: 'custom',
      slug: 'mine',
      lastCommittedTitle: 'World',
    }),
    output: refused(5, 'custom', 'mine'),
    promoted: DEFERRED_TITLE,
  },
  {
    from: { ...MANUAL_HELD, deferred: DEFERRED_TITLE },
    event: released(4),
    when: 'the edit did not apply and a title is deferred',
    to: generating('title', 'World', { ticket: 5, lastCommittedTitle: 'World' }),
    output: requested(5, 'World'),
    promoted: DEFERRED_TITLE,
  },
];

function describeState(state: SlugState): string {
  if (state.kind === 'idle') {
    return `idle(${state.mode})`;
  }
  const parts = [state.source, state.request === null ? 'held' : 'live', state.mode];
  if (state.deferred) {
    parts.push(`deferred ${state.deferred.submission.source}`);
  }
  return `generating(${parts.join(', ')})`;
}

function describeEvent(from: SlugState, event: SlugEvent): string {
  switch (event.kind) {
    case 'answered':
    case 'failed':
    case 'released':
      return `${event.kind}(${event.ticket === from.ticket ? 'slot' : 'older'} ticket)`;
    default:
      return event.kind;
  }
}

function describeOutput(step: Pick<SlugStep, 'output' | 'dropped' | 'promoted'>): string {
  const { output } = step;
  const main =
    output.kind === 'proposed' || output.kind === 'refused'
      ? `${output.kind}(${output.proposal.source === 'unchanged' ? output.proposal.reason : output.proposal.source})`
      : output.kind;
  return [main, step.dropped && 'drops deferred', step.promoted && 'starts deferred']
    .filter(Boolean)
    .join(', ');
}

function stepOf(row: TransitionRow): SlugStep {
  return {
    state: row.to,
    output: row.output,
    ...(row.dropped && { dropped: row.dropped }),
    ...(row.promoted && { promoted: row.promoted }),
  };
}

describe('slug machine transition', () => {
  it.each(
    TRANSITIONS.map((row) => {
      const label = `${describeState(row.from)} --${describeEvent(row.from, row.event)}--> ${describeState(row.to)} when ${row.when}: ${describeOutput(row)}`;
      return [label, row] as const;
    }),
  )('%s', (_label, row) => {
    const step = transition(row.from, row.event);
    expect({
      state: step.state,
      output: step.output,
      ...(step.dropped && { dropped: step.dropped }),
      ...(step.promoted && { promoted: step.promoted }),
    }).toEqual(stepOf(row));
  });

  const SAMPLES: readonly SlugState[] = [
    INITIAL_SLUG_STATE,
    IDLE,
    IDLE_CUSTOM,
    TITLE_LIVE,
    TITLE_ANSWERED,
    MANUAL_LIVE,
    MANUAL_HELD,
    { ...MANUAL_APPLIED, deferred: DEFERRED_TITLE },
  ];

  it.each(SAMPLES.map((state) => [describeState(state), state] as const))(
    '%s ignores answers and releases for a ticket that does not hold the slot',
    (_label, state) => {
      for (const ticket of [state.ticket - 1, state.ticket + 1]) {
        for (const event of [answered(ticket, 'late'), failed(ticket), released(ticket)]) {
          const step = transition(state, event);
          expect(step.state).toBe(state);
          expect(step.output).toEqual(SILENT);
        }
      }
    },
  );

  it.each([
    [describeState(IDLE_CUSTOM), IDLE_CUSTOM, { status: 'custom', mode: 'custom', pending: false }],
    [
      'idle(derived) after a blank commit',
      idle({ lastCommittedTitle: '' }),
      { status: 'frozen', mode: 'derived', pending: false },
    ],
    [describeState(TITLE_LIVE), TITLE_LIVE, { status: 'derived', mode: 'derived', pending: true }],
    [describeState(MANUAL_LIVE), MANUAL_LIVE, { status: 'custom', mode: 'custom', pending: true }],
    [
      describeState(MANUAL_HELD),
      MANUAL_HELD,
      { status: 'derived', mode: 'derived', pending: false },
    ],
  ] as const)('%s reads as %o', (_label, state, view) => {
    expect(viewSlugState(state)).toMatchObject(view);
  });
});

function play(events: readonly SlugEvent[], from: SlugState = INITIAL_SLUG_STATE): SlugStep[] {
  const steps: SlugStep[] = [];
  let state = from;
  for (const event of events) {
    const step = transition(state, event);
    steps.push(step);
    state = step.state;
  }
  return steps;
}

const outputs = (steps: readonly SlugStep[]): string[] => steps.map(describeOutput);

describe('slug machine interleavings', () => {
  it('runs a manual edit typed during a title generation once the generation settles', () => {
    const steps = play([
      loaded('hello', 'Hello'),
      title('World'),
      edit('mine'),
      answered(1, 'world'),
      released(1),
      answered(2, 'mine'),
      released(2),
    ]);

    expect(outputs(steps)).toEqual([
      'changed',
      'requested',
      'deferred',
      'proposed(generated)',
      'requested, starts deferred',
      'proposed(manual)',
      'silent',
    ]);
    expect(steps.at(-1)?.state).toEqual(
      idle({
        ticket: 2,
        mode: 'custom',
        slug: 'mine',
        title: 'World',
        lastCommittedTitle: 'World',
      }),
    );
  });

  it('refuses a title committed during a manual generation once the edit applies', () => {
    const steps = play([loaded('hello', 'Hello'), edit('mine'), title('World')]);
    expect(viewSlugState(steps[2].state)).toMatchObject({ mode: 'custom', pending: true });

    const editApplied = play([answered(1, 'mine'), released(1), released(2)], steps[2].state);
    expect(outputs(editApplied)).toEqual([
      'proposed(manual)',
      'refused(custom), starts deferred',
      'silent',
    ]);

    const failedEdit = play([failed(1), released(1), answered(2, 'world')], steps[2].state);
    expect(outputs(failedEdit)).toEqual([
      'proposed(error)',
      'requested, starts deferred',
      'proposed(generated)',
    ]);
    expect(failedEdit.at(-1)?.state).toMatchObject({ mode: 'derived', slug: 'world' });
  });

  it('drops an answer that arrives after its submission settled or was withdrawn', () => {
    const settled = play([
      loaded('hello', 'Hello'),
      title('World'),
      answered(1, 'world'),
      released(1),
    ]);
    const afterSettle = settled.at(-1)!.state;
    expect(transition(afterSettle, answered(1, 'again'))).toEqual({
      state: afterSettle,
      output: SILENT,
    });

    const withdrawn = play([loaded('hello', 'Hello'), title('World'), title('Hello')]);
    const late = transition(withdrawn.at(-1)!.state, answered(1, 'world'));
    expect(late.output).toEqual(SILENT);
    expect(late.state.slug).toBe('hello');
  });

  it('discards in-flight and deferred work when a post loads mid-flight', () => {
    const steps = play([
      loaded('hello', 'Hello'),
      title('World'),
      edit('mine'),
      loaded('other', 'Other'),
      answered(1, 'world'),
      released(1),
      title('Next'),
    ]);

    expect(outputs(steps)).toEqual([
      'changed',
      'requested',
      'deferred',
      'changed, drops deferred',
      'silent',
      'silent',
      'requested',
    ]);
    expect(steps[6].output).toEqual(requested(2, 'Next'));
  });

  it('ignores an acknowledgement for a slug and title the generation already replaced', () => {
    const steps = play([
      loaded('hello', 'Hello'),
      title('World'),
      answered(1, 'world'),
      {
        kind: 'acknowledged',
        submitted: { slug: 'hello', title: 'Hello' },
        acknowledged: { slug: 'hello-2', title: 'Hello!' },
      },
    ]);

    expect(steps[3].output).toEqual(SILENT);
    expect(steps[3].state).toBe(steps[2].state);
  });
});
