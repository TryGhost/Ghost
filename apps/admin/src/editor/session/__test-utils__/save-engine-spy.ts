type SaveEngineModule = typeof import('@/editor/engine/save-engine');

/** The intents sessions dispatched; only specs installing `spiedSaveEngine` fill it. */
export const dispatchedIntents: string[] = [];

// A pass-through wrapper. The engine refuses a background save on anything but
// a draft anyway, so `commitField`'s gate is only observable at the dispatch.
export function spiedSaveEngine(actual: SaveEngineModule): SaveEngineModule {
  const createSaveEngine = ((ports: never) => {
    const engine = actual.createSaveEngine(ports);
    const dispatch = (kind: string, options?: never) => {
      dispatchedIntents.push(kind);
      return engine.dispatch(kind as 'publish', options);
    };
    return { ...engine, dispatch };
  }) as unknown as SaveEngineModule['createSaveEngine'];

  return { ...actual, createSaveEngine };
}
