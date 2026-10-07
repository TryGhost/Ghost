import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorSessionTransport } from '@/editor/session/editor-session';
import type { EditorRecord } from '@/editor/session/projection';
import {
  body,
  record,
  serializedFields,
  sessionHarness,
} from '@/editor/session/__test-utils__/session-harness';

type SaveEngineModule = typeof import('@/editor/engine/save-engine');
type SlugMachineModule = typeof import('@/editor/engine/slug-machine');

const subscriptions = vi.hoisted(() => ({ engine: 0, slugMachine: 0 }));

vi.mock('@/editor/engine/save-engine', async (importOriginal) => {
  const actual = await importOriginal<SaveEngineModule>();
  const createSaveEngine = ((ports: Parameters<SaveEngineModule['createSaveEngine']>[0]) => {
    const engine = actual.createSaveEngine(ports);
    const subscribe: typeof engine.subscribe = (listener) => {
      subscriptions.engine += 1;
      return engine.subscribe(listener);
    };
    return { ...engine, subscribe };
  }) as SaveEngineModule['createSaveEngine'];
  return { ...actual, createSaveEngine };
});

vi.mock('@/editor/engine/slug-machine', async (importOriginal) => {
  const actual = await importOriginal<SlugMachineModule>();
  const createSlugMachine: SlugMachineModule['createSlugMachine'] = (options) => {
    const machine = actual.createSlugMachine(options);
    const subscribe: typeof machine.subscribe = (listener) => {
      subscriptions.slugMachine += 1;
      return machine.subscribe(listener);
    };
    return { ...machine, subscribe };
  };
  return { ...actual, createSlugMachine };
});

function spyingTransport() {
  return {
    create: vi.fn<EditorSessionTransport['create']>((payload) =>
      Promise.resolve({
        ...record(),
        ...serializedFields(payload),
        id: 'created-id',
      } as EditorRecord),
    ),
    update: vi.fn<EditorSessionTransport['update']>((payload) =>
      Promise.resolve({
        ...record(),
        ...serializedFields(payload),
        updated_at: '2026-01-01T00:00:01.000Z',
      } as EditorRecord),
    ),
    generateSlug: vi.fn<EditorSessionTransport['generateSlug']>(() => Promise.resolve('hello')),
  };
}

// React StrictMode runs a `useState` initializer twice and drops the first
// result without disposing it, so construction must start nothing.
describe('createEditorSession construction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    subscriptions.engine = 0;
    subscriptions.slugMachine = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([
    ['an existing post', { record: record() }],
    ['a new post', {}],
  ])('starts no IO, timer or outside subscription for %s', async (_, options) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const transport = spyingTransport();
    const onError = vi.fn();
    const onIdAcquired = vi.fn();
    const autosaveDebounceMs = vi.fn(() => undefined);

    const { session } = sessionHarness({
      ...options,
      transport,
      onError,
      onIdAcquired,
      autosaveDebounceMs,
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(transport.create).not.toHaveBeenCalled();
    expect(transport.update).not.toHaveBeenCalled();
    expect(transport.generateSlug).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(autosaveDebounceMs).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onIdAcquired).not.toHaveBeenCalled();
    // The only wiring is internal: the session's view listens to its own slug
    // machine, and hears its own engine through the `onStateChange` port.
    expect(subscriptions).toEqual({ engine: 0, slugMachine: 1 });
    expect(session.getState()).toEqual({ kind: 'idle' });
  });

  it('leaves a second session fully working when the first is discarded undisposed', async () => {
    const transport = spyingTransport();
    const onError = vi.fn();
    const onIdAcquired = vi.fn();
    const shared = { record: record(), transport, onError, onIdAcquired };

    sessionHarness({ ...shared, baseline: record().lexical });
    const { session } = sessionHarness({ ...shared, baseline: record().lexical });
    const edited = body('Hello and more');

    session.patchLexical(edited);
    session.dispatchAutosave();
    await vi.advanceTimersByTimeAsync(3000);

    expect(transport.update).toHaveBeenCalledTimes(1);
    expect(transport.update.mock.calls[0][0]).toMatchObject({ lexical: JSON.stringify(edited) });
    expect(transport.create).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(session.isDirty()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
