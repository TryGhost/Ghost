// Shared state behind both entry points.
//
// `once` and `memoize` are published from separate modules so that a consumer
// of `once` alone never loads `lru-cache` (see ./once.ts). They still have to
// share one enabled flag and one registry, or `configure` and `resetAll` would
// only cover half the memos in the process — hence this module, which both
// import and neither re-implements. It deliberately has no dependencies.

export interface MemoizeConfig {
  /** When false, `once` and `memoize` hand back the compute function unwrapped. */
  enabled: boolean;
}

let enabled = true;

// The registry holds plain (strong) references on purpose. Memos are created at
// module scope and live for the life of the process, so there is nothing for a
// weak reference to collect; a `WeakRef` registry would only add the risk that
// `resetAll()` silently skips an instance the GC happened to reach first, which
// would make the test reset unreliable in exactly the cases it exists for.
// The registry is bounded by the number of `once`/`memoize` call sites in the
// codebase, not by traffic.
const registry: { reset(): void }[] = [];

/** @internal */
export function isEnabled(): boolean {
  return enabled;
}

/** @internal */
export function register<T extends { reset(): void }>(instance: T): T {
  registry.push(instance);
  return instance;
}

/**
 * Configure memoisation process-wide. Ghost Core calls this at boot from
 * `optimization.memoize`; nothing else should. Memos created while disabled are
 * plain passthroughs, so this is a boot-time switch rather than a runtime one.
 */
export function configure({ enabled: nextEnabled }: MemoizeConfig): void {
  enabled = nextEnabled;
}

/** Clear every memo created so far. Ghost's test config helper calls this. */
export function resetAll(): void {
  for (const instance of registry) {
    instance.reset();
  }
}
