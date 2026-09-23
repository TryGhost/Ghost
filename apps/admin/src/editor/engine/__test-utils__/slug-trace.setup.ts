// Throwaway oracle: run with `--setupFiles` and SLUG_TRACE_FILE set to record every slug
// machine's public surface. Removed once the reducer lands.
import { appendFileSync } from 'node:fs';
import { expect, vi } from 'vitest';
import type * as SlugMachineModule from '@/editor/engine/slug-machine';

type Module = typeof SlugMachineModule;

const target = process.env.SLUG_TRACE_FILE;
let sequence = 0;

function show(value: unknown): string {
  if (value instanceof Error) {
    return `Error(${value.message})`;
  }
  if (value === undefined) {
    return 'undefined';
  }
  return JSON.stringify(value, (_key, inner: unknown) =>
    inner instanceof Error ? `Error(${inner.message})` : inner,
  );
}

function record(machineId: number, line: string): void {
  if (!target) {
    return;
  }
  const state = expect.getState();
  const file = (state.testPath ?? '').replace(/^.*\/src\//, 'src/');
  sequence += 1;
  appendFileSync(
    target,
    `${file}\t${String(sequence).padStart(7, '0')}\t${state.currentTestName ?? ''}\t#${machineId}\t${line}\n`,
  );
}

let machines = 0;

function traced(actual: Module): Module['createSlugMachine'] {
  return (options) => {
    machines += 1;
    const id = machines;
    let calls = 0;
    const machine = actual.createSlugMachine({
      ...options,
      generateSlug: (text) => {
        record(id, `generate ${show(text)}`);
        const result = options.generateSlug(text);
        void result.then(
          (value) => record(id, `generated ${show(text)} -> ${show(value)}`),
          (error: unknown) => record(id, `generate-failed ${show(text)} -> ${show(error)}`),
        );
        return result;
      },
    });
    machine.subscribe((state, proposal) => {
      record(id, `notify ${show(state)} ${show(proposal)}`);
    });
    const call = <T>(name: string, args: unknown[], run: () => T): T => {
      calls += 1;
      const callId = calls;
      record(id, `call ${callId} ${name}${show(args)} before ${show(machine.getState())}`);
      const result = run();
      record(id, `return ${callId} after ${show(machine.getState())}`);
      if (result instanceof Promise) {
        void result.then(
          (value: unknown) =>
            record(id, `resolve ${callId} ${show(value)} state ${show(machine.getState())}`),
          (error: unknown) => record(id, `reject ${callId} ${show(error)}`),
        );
      }
      return result;
    };
    return {
      loaded: (post) => call('loaded', [post], () => machine.loaded(post)),
      saveAcknowledged: (submitted, acknowledged) =>
        call('saveAcknowledged', [submitted, acknowledged], () =>
          machine.saveAcknowledged(submitted, acknowledged),
        ),
      titleCommitted: (title) =>
        call('titleCommitted', [title], () => machine.titleCommitted(title)),
      slugEdited: (input) => call('slugEdited', [input], () => machine.slugEdited(input)),
      getState: () => machine.getState(),
      subscribe: (listener) => machine.subscribe(listener),
    };
  };
}

vi.mock('@/editor/engine/slug-machine', async (importOriginal) => {
  const actual = await importOriginal<Module>();
  return { ...actual, createSlugMachine: traced(actual) };
});
