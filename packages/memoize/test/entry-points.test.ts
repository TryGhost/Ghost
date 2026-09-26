import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';
import { configure, memoize, once, resetAll } from '../src/index.ts';
import * as onceEntry from '../src/once.ts';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

// Every `from '...'` specifier in a module, import and re-export alike.
function specifiersOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/\bfrom\s+'([^']+)'/g)].map((match) => match[1]!);
}

// Walk the module graph reachable from an entry point, following relative
// imports and collecting the bare (external) ones.
function externalDependenciesOf(entry: string): Set<string> {
  const external = new Set<string>();
  const seen = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) {
      continue;
    }
    seen.add(file);

    for (const specifier of specifiersOf(file)) {
      if (specifier.startsWith('.')) {
        queue.push(path.resolve(path.dirname(file), specifier));
      } else if (!specifier.startsWith('node:')) {
        external.add(specifier);
      }
    }
  }

  return external;
}

describe('entry points', function () {
  it('keeps the once entry point free of external dependencies', function () {
    // This is the entry point's whole reason to exist: Ghost Core reaches it
    // from boot.js, and `once` has no use for lru-cache. If this fails, some
    // module reachable from src/once.ts grew a dependency — move it behind
    // src/memoize.ts rather than relaxing the assertion.
    assert.deepEqual([...externalDependenciesOf(path.join(SRC, 'once.ts'))], []);
  });

  it('keeps lru-cache reachable from the root entry point', function () {
    // Guards the inverse: the split is only worth anything while the root is
    // what actually carries the dependency.
    assert.ok(externalDependenciesOf(path.join(SRC, 'index.ts')).has('lru-cache'));
  });

  it('exports the same once from both entry points', function () {
    assert.equal(onceEntry.once, once);
    assert.equal(onceEntry.configure, configure);
    assert.equal(onceEntry.resetAll, resetAll);
  });

  it('shares the enabled flag across both entry points', function () {
    try {
      // Disabling through the once entry point must reach memoize too, or the
      // kill switch would only cover half the process.
      onceEntry.configure({ enabled: false });

      let calls = 0;
      const compute = memoize(
        (input: string) => {
          calls += 1;
          return input;
        },
        (input) => input,
      );

      compute('a');
      compute('a');
      assert.equal(calls, 2);
    } finally {
      configure({ enabled: true });
    }
  });

  it('shares the registry across both entry points', function () {
    let onceCalls = 0;
    const get = onceEntry.once(() => {
      onceCalls += 1;
      return onceCalls;
    });

    const compute = memoize(
      (input: string) => input,
      (input) => input,
    );

    assert.equal(get(), 1);
    compute('a');
    assert.equal(compute.size, 1);

    // resetAll() imported from the root must clear a memo created through the
    // once entry point, and vice versa.
    resetAll();

    assert.equal(get(), 2);
    assert.equal(compute.size, 0);

    compute('a');
    onceEntry.resetAll();
    assert.equal(compute.size, 0);
  });
});
