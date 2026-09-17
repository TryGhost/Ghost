import { describe, expect, it } from 'vitest';
import { slugify } from '@tryghost/string';
import { deferred, type Deferred } from '@/utils/deferred';
import {
  createSlugMachine,
  type SlugMachine,
  type SlugMachineOptions,
  type SlugProposal,
} from './slug-machine';
import { createSlugMachine as createLegacySlugMachine } from './slug-machine.legacy';

/**
 * Differential oracle for the reducer rewrite: seeded scenario programs run
 * against the legacy implementation and the current one. Traces are compared at
 * macrotask boundaries, proposals per submission once every generator settled.
 * Deleted with the legacy copy once the rewrite lands.
 */

type Factory = (options: SlugMachineOptions) => SlugMachine;

type Step =
  | { op: 'loaded'; slug: string; title: string }
  | { op: 'acknowledged'; matchSlug: boolean; matchTitle: boolean; slug: string; title: string }
  | { op: 'title'; value: string }
  | { op: 'manual'; value: string }
  | { op: 'resolve'; index: number; result: 'slugified' | 'current' | 'incremented' | 'blank' }
  | { op: 'reject'; index: number }
  | { op: 'flush' };

const POSTS = [
  { slug: '', title: '' },
  { slug: 'hello', title: 'Hello' },
  { slug: 'my-slug', title: 'Hello' },
  { slug: 'untitled', title: '(Untitled)' },
  { slug: 'foo-copy-2', title: 'Foo (Copy)' },
];
const TITLES = ['', 'Hello', 'Changed', 'Other', '(Untitled)', 'Hello (Copy)', '  Hello  '];
const MANUALS = ['', 'hello', 'mine', 'other', '  Mine  ', 'changed', 'hello-2'];
const RESULTS = ['slugified', 'current', 'incremented', 'blank'] as const;

function lcg(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function program(seed: number): Step[] {
  const random = lcg(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const steps: Step[] = [{ op: 'loaded', ...pick(POSTS) }];
  const length = 6 + Math.floor(random() * 9);
  for (let index = 0; index < length; index += 1) {
    const roll = random();
    if (roll < 0.25) {
      steps.push({ op: 'title', value: pick(TITLES) });
    } else if (roll < 0.45) {
      steps.push({ op: 'manual', value: pick(MANUALS) });
    } else if (roll < 0.65) {
      steps.push({ op: 'resolve', index: Math.floor(random() * 3), result: pick(RESULTS) });
    } else if (roll < 0.7) {
      steps.push({ op: 'reject', index: Math.floor(random() * 3) });
    } else if (roll < 0.85) {
      steps.push({ op: 'flush' });
    } else if (roll < 0.93) {
      steps.push({ op: 'loaded', ...pick(POSTS) });
    } else {
      steps.push({
        op: 'acknowledged',
        matchSlug: random() < 0.6,
        matchTitle: random() < 0.6,
        slug: pick(['hello-2', 'my-slug-2', 'server']),
        title: pick(['Hello', 'Server Title']),
      });
    }
  }
  return steps;
}

const flush = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

interface Trace {
  checkpoints: string[];
  proposals: Record<number, SlugProposal>;
  unresolved: number;
}

async function run(create: Factory, steps: Step[]): Promise<Trace> {
  const outstanding: Array<{ text: string; request: Deferred<string> }> = [];
  const events: unknown[] = [];
  const calls: string[] = [];
  const proposals: Record<number, SlugProposal> = {};
  let submissions = 0;
  const machine = create({
    generateSlug: (text) => {
      const request = deferred<string>();
      outstanding.push({ text, request });
      calls.push(text);
      return request.promise;
    },
    onListenerError: () => {},
  });
  machine.subscribe((state, proposal) => {
    events.push({
      mode: state.mode,
      slug: state.slug,
      title: state.title,
      pending: state.pending,
      proposal,
    });
  });
  const track = (submission: Promise<SlugProposal>): void => {
    const index = submissions;
    submissions += 1;
    void submission.then((proposal) => {
      proposals[index] = proposal;
    });
  };
  const settle = (step: Extract<Step, { op: 'resolve' | 'reject' }>): void => {
    if (outstanding.length === 0) {
      return;
    }
    const [{ text, request }] = outstanding.splice(step.index % outstanding.length, 1);
    if (step.op === 'reject') {
      request.reject(new Error('boom'));
      return;
    }
    const current = machine.getState().slug;
    const result = {
      slugified: slugify(text),
      current,
      incremented: `${current}-2`,
      blank: '  ',
    }[step.result];
    request.resolve(result);
  };

  const checkpoints: string[] = [];
  for (const step of steps) {
    switch (step.op) {
      case 'loaded':
        machine.loaded({ slug: step.slug, title: step.title });
        break;
      case 'acknowledged': {
        const state = machine.getState();
        machine.saveAcknowledged(
          {
            slug: step.matchSlug ? state.slug : 'nope',
            title: step.matchTitle ? state.title : 'Nope',
          },
          { slug: step.slug, title: step.title },
        );
        break;
      }
      case 'title':
        track(machine.titleCommitted(step.value));
        break;
      case 'manual':
        track(machine.slugEdited(step.value));
        break;
      case 'resolve':
      case 'reject':
        settle(step);
        break;
      case 'flush':
        await flush();
        checkpoints.push(JSON.stringify({ events, calls }));
        break;
    }
  }
  // A settled request can start a deferred one, so settle until the wire is quiet.
  for (;;) {
    await flush();
    if (outstanding.length === 0) {
      break;
    }
    const { text, request } = outstanding.shift()!;
    request.resolve(slugify(text));
  }
  checkpoints.push(JSON.stringify({ events, calls }));
  return { checkpoints, proposals, unresolved: submissions - Object.keys(proposals).length };
}

describe('slug machine parity', () => {
  it('matches the legacy implementation over seeded scenario programs', async () => {
    for (let seed = 1; seed <= 400; seed += 1) {
      const steps = program(seed);
      const label = `seed ${seed}: ${JSON.stringify(steps)}`;
      const expected = await run(createLegacySlugMachine, steps);
      const actual = await run(createSlugMachine, steps);
      expect(expected.unresolved, label).toBe(0);
      expect(actual.checkpoints, label).toEqual(expected.checkpoints);
      expect(actual.proposals, label).toEqual(expected.proposals);
      expect(actual.unresolved, label).toBe(0);
    }
  });
});
