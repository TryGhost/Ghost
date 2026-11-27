import type { SaveEnginePorts } from '@/editor/engine/save-engine';
import type { PreparedSave } from '@/editor/session/editor-session';
import type { EditorSaveSnapshot } from '@/editor/session/snapshot';

type SaveEngineModule = typeof import('@/editor/engine/save-engine');
type EditorPorts = SaveEnginePorts<EditorSaveSnapshot, PreparedSave>;

/** The intents sessions dispatched; only specs installing `spiedSaveEngine` fill it. */
export const dispatchedIntents: string[] = [];

/** The ports each session handed the engine, so a spec can drive one on its own. */
export const capturedPorts: EditorPorts[] = [];

// A pass-through wrapper for command-routing and preparation-port tests.
// Pending-work behavior is asserted against the real engine.
export function spiedSaveEngine(actual: SaveEngineModule): SaveEngineModule {
  const createSaveEngine = ((ports: EditorPorts) => {
    capturedPorts.push(ports);
    const engine = actual.createSaveEngine(ports);
    const dispatch = (kind: string, options?: never) => {
      dispatchedIntents.push(kind);
      return engine.dispatch(kind as 'publish', options);
    };
    return { ...engine, dispatch };
  }) as unknown as SaveEngineModule['createSaveEngine'];

  return { ...actual, createSaveEngine };
}
